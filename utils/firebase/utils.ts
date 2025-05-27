import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from './config';
import { disableNetwork, enableNetwork, getDoc, doc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Platform } from 'react-native';
import { checkNetworkStatus, testInternetConnectivity } from '../networkUtilsLite';
import { handleFirestoreError } from './config';

// Key to store auth data in AsyncStorage
const AUTH_STORAGE_KEY = '@AuthData';

// Helper function to log detailed Firebase errors
export const logFirebaseError = (context: string, error: any) => {
  console.error(`${context}: ${error.message}`);
  console.error(`Error code: ${error.code}`);
  console.error(`Error details: ${JSON.stringify(error)}`);
  
  // Log specific network-related errors
  if (error.code === 'auth/network-request-failed') {
    console.error('NETWORK FAILURE: Firebase could not connect to the network');
  }
};

// Check network connectivity before Firebase operations
export const checkNetworkBeforeOperation = async () => {
  const isConnected = await checkNetworkStatus();
  if (!isConnected) {
    console.error('Network check failed: Device appears to be offline');
    throw new Error('network_unavailable');
  }
  
  // Test general internet connectivity
  const canReachInternet = await testInternetConnectivity();
  if (!canReachInternet) {
    console.error('Internet connectivity test failed: Cannot reach internet');
    throw new Error('internet_unreachable');
  }
  
  return true;
};

// Function to refresh Firebase connection
// This helps with iOS simulator issues where Firebase WebSockets disconnect
export const refreshFirebaseConnection = async (silent: boolean = false): Promise<boolean> => {
  try {
    if (!silent) {
      console.log('Refreshing Firebase connection...');
    }
    
    // Temporarily disable Firestore network
    await disableNetwork(db);
    if (!silent) {
      console.log('Firebase network disabled temporarily');
    }
    
    // Small delay to ensure the network is fully disabled
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Re-enable Firestore network
    await enableNetwork(db);
    if (!silent) {
      console.log('Firebase network re-enabled');
    }
    
    // Test connection by trying to read a small document
    try {
      const testDoc = await getDoc(doc(db, 'system', 'status'));
      if (!silent) {
        console.log('Firebase connection verified successfully');
      }
    } catch (readError) {
      if (!silent) {
        console.warn('Firebase connection test read failed, but continuing:', readError);
      }
      // We don't throw here as the enableNetwork might still be working
    }
    
    // For Auth - Check if we have stored credentials to potentially refresh the Auth state
    try {
      const authData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (authData) {
        const { email, password } = JSON.parse(authData);
        
        // Only attempt re-auth if we're not already authenticated
        if (!auth.currentUser) {
          if (!silent) {
            console.log('Attempting to refresh Auth connection with stored credentials...');
          }
          
          try {
            // Attempt silent re-authentication
            await signInWithEmailAndPassword(auth, email, password);
            if (!silent) {
              console.log('Auth connection refreshed successfully');
            }
          } catch (authError) {
            if (!silent) {
              console.warn('Auth refresh failed, but Firestore reconnection may still be successful:', authError);
            }
          }
        } else {
          if (!silent) {
            console.log('User already authenticated, skipping Auth refresh');
          }
        }
      } else {
        if (!silent) {
          console.log('No stored credentials found for Auth refresh');
        }
      }
    } catch (authRefreshError) {
      if (!silent) {
        console.warn('Error during Auth refresh attempt:', authRefreshError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error refreshing Firebase connection:', error);
    return false;
  }
};

// Store user credentials after successful login
export const storeUserCredentials = async (email: string, password: string) => {
  try {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ email, password }));
    console.log("Credentials stored successfully in AsyncStorage");
  } catch (error) {
    console.error('Error storing credentials:', error);
  }
};

// Clear stored credentials on logout
export const clearUserCredentials = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    console.log("Credentials cleared successfully from AsyncStorage");
  } catch (error) {
    console.error('Error clearing credentials:', error);
  }
};

// Check for stored credentials and sign in automatically
export const checkAndAutoSignIn = async () => {
  try {
    const authData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (authData) {
      console.log("Found stored credentials, attempting auto sign-in");
      const { email, password } = JSON.parse(authData);
      // Silent sign in on app startup
      await signInWithEmailAndPassword(auth, email, password)
        .then(userCredential => {
          console.log("Auto sign-in successful");
        })
        .catch(error => {
          console.error('Auto sign-in failed, clearing stored credentials:', error);
          clearUserCredentials();
        });
    } else {
      console.log("No stored credentials found");
    }
  } catch (error) {
    console.error('Error checking stored credentials:', error);
  }
};

// Enhanced helper function to safely unsubscribe from multiple Firestore listeners
export const cleanupFirestoreListeners = (listeners: {[key: string]: (() => void) | undefined}) => {
  // Iterate through all listeners and unsubscribe
  Object.entries(listeners).forEach(([key, unsubscribe]) => {
    if (typeof unsubscribe === 'function') {
      try {
        unsubscribe();
        console.log(`Unsubscribed from Firestore listener: ${key}`);
      } catch (error) {
        console.warn(`Error unsubscribing from Firestore listener ${key}:`, error);
        // Continue with other unsubscribes even if one fails
      }
    }
  });
};

/**
 * Creates a safer Firestore listener with automatic error handling and cleanup
 * @param listenFn The Firestore onSnapshot function to call
 * @param errorCallback Optional callback when errors occur
 * @returns A function to unsubscribe the listener
 */
export const createSafeFirestoreListener = (
  listenFn: () => (() => void),
  errorCallback?: (error: any) => void
): (() => void) => {
  let isActive = true;
  let unsubscribeFn: (() => void) | null = null;
  
  try {
    // Set up the listener
    unsubscribeFn = listenFn();
    
    // Return an enhanced unsubscribe function
    return () => {
      if (isActive && unsubscribeFn) {
        try {
          unsubscribeFn();
          isActive = false;
        } catch (error) {
          console.warn('Error unsubscribing from Firestore listener:', error);
        }
      }
    };
  } catch (error) {
    console.error('Error setting up Firestore listener:', error);
    
    // Call error callback if provided
    if (errorCallback && typeof errorCallback === 'function') {
      try {
        errorCallback(error);
      } catch (callbackError) {
        console.error('Error in listener error callback:', callbackError);
      }
    }
    
    // Handle Firestore error
    handleFirestoreError(error, 'create_listener')
      .catch(handlerError => console.error('Error in listener error handler:', handlerError));
    
    // Return a no-op unsubscribe function
    return () => {
      isActive = false;
    };
  }
}; 