import '@/utils/uuidPolyfill'; // UUID crypto polyfill - must be imported before any uuid usage
import { initializeConsoleEnhancer } from '@/utils/consoleEnhancer'; // Enhanced console logging
import { useEffect, useRef } from 'react';

// Initialize enhanced console logging immediately
initializeConsoleEnhancer();
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SplashScreen } from 'expo-router';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import NetworkMonitor from '@/components/NetworkMonitor';
import { AuthProvider } from '@/components/auth/AuthProvider';
import networkReconnectionManager from '@/utils/NetworkReconnectionManager';
import { scheduleSystemDocumentSetup } from '@/utils/setupSystemDocument';
import ErrorBoundary from '@/components/ErrorBoundary';
import { refreshFirestoreConnection } from '@/utils/firebase/config';
import { testFirebaseConfig } from '@/utils/firebase/test-config';
import LocationTracker from '@/components/LocationTracker';
import { getFirebaseHealthStatus } from '@/utils/firebase/config';
import { notificationService } from '@/services/notificationServiceSafe';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const appState = useRef(AppState.currentState);
  const inactiveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActiveTime = useRef<number>(Date.now());
  const hasResetFirestoreConnection = useRef(false);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  // Initialize network reconnection manager and system status document
  useEffect(() => {
    // The manager is already initialized as a singleton
    console.log('Network reconnection manager initialized');
    
    // Configure the reconnection manager
    networkReconnectionManager.setVerboseLogging(false); // Disable verbose logging
    
    // Set a longer interval for periodic checks to reduce console spam
    // 5 minutes between checks
    networkReconnectionManager.setPeriodicCheckInterval(300000);
    
    // Set up system document with retry mechanism
    // This will automatically retry if it fails initially due to offline state
    scheduleSystemDocumentSetup();
    
    // Test Firebase configuration first
    const initializeFirebase = async () => {
      if (hasResetFirestoreConnection.current) return;
      
      console.log('🔥 Testing Firebase configuration...');
      
      try {
        // Test Firebase config
        const configTestPassed = await testFirebaseConfig();
        
        if (configTestPassed) {
          console.log('✅ Firebase configuration test passed');
          // Reset the connection to prevent "Target ID already exists" errors
          await refreshFirestoreConnection();
          hasResetFirestoreConnection.current = true;
          console.log('✅ Initial Firestore connection reset completed successfully');
          
          // Initialize notification service with extra safety
          try {
            console.log('🔔 Initializing notification service...');
            await notificationService.initialize();
            console.log('✅ Notification service initialized successfully');
          } catch (notificationError) {
            console.error('❌ Failed to initialize notification service:', notificationError);
            console.log('ℹ️ App will continue without push notifications');
          }
          
          // Start periodic health checks
          startPeriodicHealthChecks();
        } else {
          console.warn('⚠️ Firebase configuration test failed, but continuing...');
        }
      } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        
        // Schedule another attempt after a delay
        setTimeout(() => {
          console.log('🔄 Retrying Firebase initialization...');
          refreshFirestoreConnection()
            .then(() => {
              hasResetFirestoreConnection.current = true;
              console.log('✅ Retry Firebase initialization completed');
              startPeriodicHealthChecks();
            })
            .catch(retryError => {
              console.error('❌ Retry Firebase initialization failed:', retryError);
              hasResetFirestoreConnection.current = true;
            });
        }, 5000);
      }
    };
    
    // Function to start periodic health checks
    const startPeriodicHealthChecks = () => {
      console.log('🩺 Starting periodic Firebase health checks...');
      
      // Check health every 2 minutes
      const healthCheckInterval = setInterval(async () => {
        try {
          const healthStatus = await getFirebaseHealthStatus();
          
          if (!healthStatus.healthy) {
            console.warn('⚠️ Firebase health check failed:', healthStatus.issues);
            
            // If we have critical issues, attempt proactive recovery
            const hasCriticalIssues = healthStatus.issues.some(issue => 
              issue.includes('internal assertion') || 
              issue.includes('High error count')
            );
            
            if (hasCriticalIssues) {
              console.log('🔧 Critical issues detected, attempting proactive recovery...');
              try {
                await refreshFirestoreConnection();
                console.log('✅ Proactive recovery completed');
              } catch (recoveryError) {
                console.error('❌ Proactive recovery failed:', recoveryError);
              }
            }
          } else {
            console.log('✅ Firebase health check passed');
          }
        } catch (healthError) {
          console.error('❌ Health check failed:', healthError);
        }
      }, 120000); // Check every 2 minutes
      
      // Clean up interval on unmount
      return () => {
        clearInterval(healthCheckInterval);
      };
    };
    
    // Start Firebase initialization
    initializeFirebase();
    
    // Cleanup on unmount
    return () => {
      networkReconnectionManager.cleanup();
      notificationService.cleanup();
    };
  }, []);
  
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
        </AuthProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}