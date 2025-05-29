import '@/utils/uuidPolyfill'; // UUID crypto polyfill - must be imported before any uuid usage
import { initializeConsoleEnhancer } from '@/utils/consoleEnhancer'; // Enhanced console logging
import { useEffect, useRef, useState } from 'react';

// Initialize enhanced console logging immediately
initializeConsoleEnhancer();
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SplashScreen } from 'expo-router';
import { Platform, AppState, AppStateStatus, TouchableOpacity, Text, View, StyleSheet, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import NetworkMonitor from '@/components/NetworkMonitor';
import { AuthProvider } from '@/components/auth/AuthProvider';
import networkReconnectionManager from '@/utils/NetworkReconnectionManager';
import { scheduleSystemDocumentSetup } from '@/utils/setupSystemDocument';
import ErrorBoundary from '@/components/ErrorBoundary';
import { testFirebaseConfig } from '@/utils/firebase/test-config';
import LocationTracker from '@/components/LocationTracker';
import { refreshFirestoreConnection, emergencyFirestoreReset } from '@/utils/firebase/config';
import { notificationService } from '@/services/notificationServiceSafe';
import { setupGlobalErrorHandler, setupFirebaseErrorAutoRecovery } from '@/utils/firebase/globalErrorHandler';
import { firestoreInitManager } from '@/utils/firebase/initManager';
import { FirestoreProvider } from '@/components/FirestoreProvider';
import { verifyFirebaseOnStartup, isFirebaseHealthy, manualRecovery } from '@/utils/firebase';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Component to show a restart button when Firebase issues are detected
const ErrorRestartButton = ({ onPress, visible }) => {
  if (!visible) return null;
  
  return (
    <View style={styles.errorButtonContainer}>
      <TouchableOpacity
        style={styles.restartButton}
        onPress={onPress}
      >
        <Text style={styles.restartButtonText}>
          Connection Issue - Tap to Restart
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default function RootLayout() {
  useFrameworkReady();
  const appState = useRef(AppState.currentState);
  const inactiveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActiveTime = useRef<number>(Date.now());
  const hasResetFirestoreConnection = useRef(false);
  
  // State to track Firebase errors
  const [firebaseErrorDetected, setFirebaseErrorDetected] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  // Handle emergency reset when the restart button is pressed
  const handleEmergencyReset = async () => {
    try {
      Alert.alert(
        "Restarting Connection",
        "Attempting to fix the connection issue...",
        [{ text: "OK" }]
      );
      
      // Perform manual recovery
      await manualRecovery();
      
      // Check if it worked
      const healthStatus = await isFirebaseHealthy();
      
      if (healthStatus.healthy) {
        Alert.alert(
          "Connection Restored",
          "The app connection has been restored. Please continue using the app normally.",
          [{ text: "Great!" }]
        );
        setFirebaseErrorDetected(false);
      } else {
        Alert.alert(
          "Still Having Issues",
          "Please try closing the app completely and reopening it.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error during emergency reset:", error);
      Alert.alert(
        "Reset Failed",
        "Please try closing the app completely and reopening it.",
        [{ text: "OK" }]
      );
    }
  };

  // Set up global error handling for Firebase - keep this first
  useEffect(() => {
    console.log('Setting up global error handlers...');
    
    let removeGlobalErrorHandler = () => {};
    let removeAutoRecovery = () => {};
    
    try {
      removeGlobalErrorHandler = setupGlobalErrorHandler();
      removeAutoRecovery = setupFirebaseErrorAutoRecovery();
      console.log('Global error handlers set up successfully');
      
      // Set up error detection - check global error count every 5 seconds
      const errorCheckInterval = setInterval(() => {
        if (global.__firestoreErrorCount > 10) {
          // Show the restart button if we've detected many errors
          setFirebaseErrorDetected(true);
          
          // Reset the counter so we don't keep showing alerts
          global.__firestoreErrorCount = 0;
        }
      }, 5000);
      
      return () => {
        try {
          removeGlobalErrorHandler();
          removeAutoRecovery();
          clearInterval(errorCheckInterval);
        } catch (error) {
          console.error('Error cleaning up global error handlers:', error);
        }
      };
    } catch (error) {
      console.error('Failed to set up global error handlers:', error);
      return () => {};
    }
  }, []);

  // Initialize network reconnection manager
  useEffect(() => {
    console.log('Initializing network reconnection manager...');
    
    try {
      // Configure the reconnection manager
      networkReconnectionManager.setVerboseLogging(false); // Disable verbose logging
      
      // Set a longer interval for periodic checks to reduce console spam (5 min)
      networkReconnectionManager.setPeriodicCheckInterval(300000);
      
      // Set up system document with retry mechanism
      scheduleSystemDocumentSetup();
      
      // Setup periodic health checks
      const healthCheckCleanup = startPeriodicHealthChecks();
      
      // Cleanup on unmount
      return () => {
        try {
          networkReconnectionManager.cleanup();
          healthCheckCleanup();
          console.log('Network reconnection manager cleaned up');
        } catch (error) {
          console.error('Error cleaning up network reconnection manager:', error);
        }
      };
    } catch (error) {
      console.error('Error initializing network reconnection manager:', error);
      return () => {}; // Return empty cleanup function
    }
  }, []);
  
  // Initialize notification service in a separate effect to avoid race conditions
  useEffect(() => {
    let notificationCleanup = () => {};
    
    // Only initialize notification service when Firestore is ready
    const initNotifications = async () => {
      try {
        // Ensure Firestore is ready before initializing notifications
        await firestoreInitManager.waitForReady();
        
        console.log('🔔 Initializing notification service...');
        await notificationService.initialize();
        console.log('✅ Notification service initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize notification service:', error);
        console.log('ℹ️ App will continue without push notifications');
      }
    };
    
    // Initialize notifications with a delay to ensure Firestore has time to initialize
    const initTimeout = setTimeout(initNotifications, 2000);
    
    return () => {
      clearTimeout(initTimeout);
      try {
        notificationService.cleanup();
      } catch (error) {
        console.error('Error cleaning up notification service:', error);
      }
    };
  }, []);

  // Initialize Firebase and verify it's working properly
  useEffect(() => {
    const initFirebase = async () => {
      try {
        console.log('🔍 Verifying Firebase on startup...');
        const isHealthy = await verifyFirebaseOnStartup();
        
        if (isHealthy) {
          console.log('✅ Firebase verification successful');
          setFirebaseErrorDetected(false);
        } else {
          console.warn('⚠️ Firebase verification failed, app may experience issues');
          // Show a helpful message to the user
          setFirebaseErrorDetected(true);
          Alert.alert(
            'Connection Issue',
            'We detected a problem with the app connection. If you experience issues, tap the "Restart Connection" button at the bottom of the screen.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('❌ Error during Firebase verification:', error);
        setFirebaseErrorDetected(true);
      }
    };
    
    // Run Firebase verification
    initFirebase();
  }, []);

  // Function to start periodic health checks - moved outside useEffect for cleaner code
  const startPeriodicHealthChecks = () => {
    console.log('🩺 Starting periodic Firebase health checks...');
    
    // Check health every 2 minutes
    const healthCheckInterval = setInterval(() => {
      performHealthCheck().catch(error => {
        console.error('Health check failed:', error);
      });
    }, 120000);
    
    // Return cleanup function
    return () => {
      clearInterval(healthCheckInterval);
    };
  };
  
  // Separate function for health check to keep the code cleaner
  const performHealthCheck = async () => {
    try {
      // Skip health check if Firestore isn't ready yet
      if (!firestoreInitManager.isReady()) {
        console.log('Skipping health check - Firestore not fully initialized yet');
        return;
      }
      
      // Use the new isFirebaseHealthy function
      const healthStatus = await isFirebaseHealthy();
      
      if (!healthStatus.healthy) {
        // If we have critical issues, attempt proactive recovery
        console.warn('Firebase health check failed:', healthStatus);
        setFirebaseErrorDetected(true);
        
        // Try to refresh the Firestore connection
        try {
          await refreshFirestoreConnection();
        } catch (error) {
          console.error('Failed to refresh Firestore connection:', error);
        }
      } else {
        // If everything is healthy, make sure the error button is hidden
        setFirebaseErrorDetected(false);
      }
    } catch (error) {
      console.error('Error performing health check:', error);
    }
  };
  
  // Special iOS simulator handling for app state changes and inactivity
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    
    const onAppStateChange = (nextAppState: AppStateStatus) => {
      // When app becomes active after being in background
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
        
        // Check how long app was inactive
        const now = Date.now();
        const timeSinceLastActive = now - lastActiveTime.current;
        
        // If app was inactive for more than 30 seconds, force reconnection
        if (timeSinceLastActive > 30000) {
          console.log('App was inactive for a significant time, forcing reconnection');
          networkReconnectionManager.manualReconnect();
          
          // Also refresh the Firestore connection to fix any potential Target ID issues
          refreshFirestoreConnection()
            .then(success => {
              console.log('Firestore connection reset after inactivity:', success ? 'successful' : 'failed');
            })
            .catch(error => {
              console.error('Error resetting Firestore connection:', error);
            });
        }
      }
      
      // If going into background/inactive state, note the time
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        lastActiveTime.current = Date.now();
        
        // Also clear any existing inactivity timer
        if (inactiveTimer.current) {
          clearTimeout(inactiveTimer.current);
          inactiveTimer.current = null;
        }
      }
      
      // Update ref to current app state
      appState.current = nextAppState;
    };
    
    // Setup idle timer when app is active - much less frequently (every 5 minutes instead of 1)
    const setupIdleTimer = () => {
      // Clear any existing timer
      if (inactiveTimer.current) {
        clearTimeout(inactiveTimer.current);
      }
      
      // Set new timer - check every 5 minutes if app is idle but active
      inactiveTimer.current = setInterval(() => {
        // Only force reconnection if the app is in active state
        if (appState.current === 'active') {
          // No extra logging here to reduce noise
          networkReconnectionManager.manualReconnect();
        }
      }, 300000); // Check every 5 minutes
    };
    
    // Initialize idle timer
    setupIdleTimer();
    
    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', onAppStateChange);
    
    // Cleanup
    return () => {
      subscription.remove();
      if (inactiveTimer.current) {
        clearTimeout(inactiveTimer.current);
        inactiveTimer.current = null;
      }
    };
  }, []);

  // Hide splash screen once fonts are loaded
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Return null to keep splash screen visible while fonts load
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <FirestoreProvider 
            waitForReady={true} 
            loadingDelay={1500} // Wait 1.5s before showing loading indicator
          >
            <LocationTracker />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="chat/[id]" options={{ headerShown: false, presentation: 'modal' }} />
              <Stack.Screen 
                name="user-profile" 
                options={{ 
                  headerShown: false, 
                  presentation: 'card',
                  animation: 'slide_from_right',
                  animationDuration: 200
                }} 
              />
              <Stack.Screen name="seed-profiles" options={{ headerShown: true, presentation: 'modal' }} />
              <Stack.Screen name="+not-found" options={{ headerShown: false }} />
            </Stack>
            <NetworkMonitor />
            <StatusBar style="auto" />
            <ErrorRestartButton 
              visible={firebaseErrorDetected} 
              onPress={handleEmergencyReset} 
            />
          </FirestoreProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  restartButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  restartButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});