/**
 * Firebase Initialization
 * 
 * This file handles the proper initialization of Firebase services
 * with platform-specific settings. This is the ONLY place where
 * Firebase should be initialized.
 */

import { Platform } from 'react-native';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Firebase imports
import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
  persistentLocalCache,
  persistentMultipleTabManager,
  PersistenceSettings,
  connectFirestoreEmulator
} from 'firebase/firestore';
import { 
  getAuth, 
  initializeAuth,
  getReactNativePersistence,
  indexedDBLocalPersistence,
  connectAuthEmulator
} from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOYSaYglhkUNDdZmrFUy40oHHjadwfa_U",
  authDomain: "gym-dating-app.firebaseapp.com",
  projectId: "gym-dating-app",
  storageBucket: "gym-dating-app.firebasestorage.app",
  messagingSenderId: "349439736317",
  appId: "1:349439736317:web:1e5d70ab56597853a28194",
  measurementId: "G-9H9Z99TQ7B"
};

// Initialization state
let isInitialized = false;
let initializationError = null;

// Service instances
let appInstance;
let firestoreInstance;
let authInstance;
let storageInstance;

/**
 * Initialize Firebase safely exactly once
 */
export const initializeFirebase = () => {
  if (isInitialized) {
    console.log('Firebase already initialized, using existing instances');
    return {
      app: appInstance,
      firestore: firestoreInstance,
      auth: authInstance,
      storage: storageInstance,
      error: initializationError
    };
  }

  try {
    console.log('🔥 Initializing Firebase for platform:', Platform.OS);
    
    // Initialize app if not already initialized
    let app;
    if (getApps().length === 0) {
      console.log('Creating new Firebase app instance');
      app = initializeApp(firebaseConfig);
    } else {
      console.log('Using existing Firebase app instance');
      app = getApp();
    }
    appInstance = app;

    // Initialize Firestore with platform-specific settings
    let firestore;
    if (Platform.OS === 'web') {
      console.log('Initializing Firestore for web');
      // For Firebase 9.x, we use simpler options
      firestore = initializeFirestore(app, {
        ignoreUndefinedProperties: true
      });

      // Set up web persistence
      enableIndexedDbPersistence(firestore).catch((err) => {
        console.warn('⚠️ Error enabling Firestore persistence for web:', err);
      });
    } else {
      // iOS and Android
      console.log(`Initializing Firestore for ${Platform.OS}`);
      
      // Enhanced settings for Android/iOS with better offline support
      firestore = initializeFirestore(app, {
        ignoreUndefinedProperties: true,
        // Enable offline persistence with better cache size for Android
        cacheSizeBytes: Platform.OS === 'android' ? CACHE_SIZE_UNLIMITED : 40000000,
        // Enhanced settings for better Android compatibility
        ...(Platform.OS === 'android' && {
          experimentalForceLongPolling: false, // Use WebChannel for better performance
          merge: true // Merge instead of overwrite for better data consistency
        })
      });
    }
    firestoreInstance = firestore;

    // Initialize Auth with platform-specific settings
    let auth;
    if (Platform.OS === 'web') {
      auth = getAuth(app);
    } else {
      // React Native (iOS & Android)
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
        // Add Android-specific auth settings
        ...(Platform.OS === 'android' && {
          popupRedirectResolver: undefined // Disable popup redirect for Android
        })
      });
    }
    authInstance = auth;

    // Initialize Storage
    const storage = getStorage(app);
    storageInstance = storage;

    // Log successful initialization
    console.log('✅ Firebase successfully initialized for', Platform.OS);
    console.log('📱 Platform details:', {
      platform: Platform.OS,
      version: Platform.Version
    });

    isInitialized = true;

    return {
      app,
      firestore,
      auth,
      storage,
      error: null
    };
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error);
    console.error('📱 Platform:', Platform.OS);
    console.error('🔧 Error details:', {
      code: (error as any)?.code,
      message: (error as any)?.message,
      stack: (error as any)?.stack
    });
    
    initializationError = error;
    
    // Even if initialization fails, try to return usable instances when possible
    try {
      return {
        app: appInstance || getApp(),
        firestore: firestoreInstance || getFirestore(),
        auth: authInstance || getAuth(),
        storage: storageInstance || getStorage(),
        error
      };
    } catch (fallbackError) {
      console.error('❌ Fallback initialization also failed:', fallbackError);
      return {
        app: null,
        firestore: null,
        auth: null,
        storage: null,
        error: fallbackError
      };
    }
  }
};

/**
 * Safe getters for Firebase services that ensure initialization
 */
export const getFirebaseApp = () => {
  if (!isInitialized) {
    initializeFirebase();
  }
  return appInstance;
};

export const getFirebaseFirestore = () => {
  if (!isInitialized) {
    initializeFirebase();
  }
  return firestoreInstance;
};

export const getFirebaseAuth = () => {
  if (!isInitialized) {
    initializeFirebase();
  }
  return authInstance;
};

export const getFirebaseStorage = () => {
  if (!isInitialized) {
    initializeFirebase();
  }
  return storageInstance;
};

// Initialize Firebase immediately
const { app, firestore, auth, storage, error } = initializeFirebase();

// Export instances
export { app, firestore as db, auth, storage };

// Export a method to check if Firebase is working
export const isFirebaseHealthy = async () => {
  try {
    // Check auth state
    const currentUser = auth.currentUser;
    console.log('Firebase health check - Auth user:', currentUser ? 'Logged in' : 'Not logged in');
    
    // We can't easily check Firestore without making a request, which might fail
    // for permission reasons, so just check if the instance exists
    const firestoreOk = !!firestore;
    
    // Enhanced health check for Android
    const platformSpecificChecks = Platform.OS === 'android' ? {
      androidSpecific: true,
      firestoreSettings: firestoreInstance?._settings || null
    } : {};
    
    return {
      healthy: true,
      auth: !!auth,
      firestore: firestoreOk,
      storage: !!storage,
      platform: Platform.OS,
      error: initializationError,
      ...platformSpecificChecks
    };
  } catch (error) {
    console.error('❌ Firebase health check failed:', error);
    return {
      healthy: false,
      auth: false,
      firestore: false,
      storage: false,
      platform: Platform.OS,
      error: error
    };
  }
}; 