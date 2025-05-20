import '@/utils/uuidPolyfill'; // UUID crypto polyfill - must be imported before any uuid usage
import { useEffect, useRef } from 'react';
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
import { refreshFirestoreConnection } from '@/utils/firebase';

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
    
    // Refresh Firestore connection at startup to fix "Target ID already exists" errors
    if (!hasResetFirestoreConnection.current) {
      refreshFirestoreConnection()
        .then(success => {
          console.log('Firestore connection reset at startup:', success ? 'successful' : 'failed');
          hasResetFirestoreConnection.current = true;
        })
        .catch(error => {
          console.error('Error resetting Firestore connection:', error);
        });
    }
    
    // Cleanup on unmount
    return () => {
      networkReconnectionManager.cleanup();
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