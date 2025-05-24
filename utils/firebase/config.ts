import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
// Polyfill random values and URL for Firebase Auth on React Native
import { initializeApp } from 'firebase/app';
import { 
  collection,
  disableNetwork,
  enableNetwork,
  doc,
  getDoc,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED,
  persistentLocalCache
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { 
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  indexedDBLocalPersistence,
  setPersistence
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOYSaYglhkUNDdZmrFUy40oHHjadwfa_U",
  authDomain: "gym-dating-app.firebaseapp.com",
  projectId: "gym-dating-app",
  storageBucket: "gym-dating-app.firebasestorage.app",
  messagingSenderId: "349439736317",
  appId: "1:349439736317:web:1e5d70ab56597853a28194",
  measurementId: "G-9H9Z99TQ7B"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with platform-appropriate persistence
// React Native doesn't support IndexedDB, so we handle it differently
export const db = Platform.OS === 'web' 
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({
        sizeBytes: CACHE_SIZE_UNLIMITED
      })
    })
  : initializeFirestore(app, {
      // For React Native, use memory cache to avoid IndexedDB issues
      // Persistence will be handled by the native SDK
    });

// We'll use regular Firestore instead of GeoFirestore for now
// to avoid compatibility issues
export const geoFirestore = {
  collection: (path: string) => {
    console.log(`GeoFirestore collection requested: ${path}`);
    return collection(db, path);
  }
};

// Initialize Auth with proper persistence for React Native
export const auth = Platform.OS === 'web' 
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });

if (Platform.OS === 'web') {
  setPersistence(auth, indexedDBLocalPersistence)
    .then(() => console.log('Firebase Auth web persistence set to IndexedDB'))
    .catch(err => console.error('Error setting web auth persistence:', err));
  console.log('Firebase Auth initialized for web platform');
} else {
  console.log('Firebase Auth initialized for React Native with AsyncStorage persistence');
}

// Persistence is now handled via persistentLocalCache in initializeFirestore
// No need for additional enableIndexedDbPersistence calls which can cause conflicts
console.log('Firestore persistence configured via persistentLocalCache');

// Initialize Storage
export const storage = getStorage(app);

// Collection references
export const conversationsRef = collection(db, 'conversations');
export const messagesRef = collection(db, 'messages');
export const typingIndicatorsRef = collection(db, 'typingIndicators');
export const usersRef = collection(db, 'users');

// Network operations
export const disableFirestoreNetwork = () => disableNetwork(db);
export const enableFirestoreNetwork = () => enableNetwork(db);

// This function can be used to refresh the Firestore connection
// It's particularly useful when encountering "Target ID already exists" errors
export const refreshFirestoreConnection = async () => {
  try {
    console.log('Refreshing Firestore connection...');
    // First disable the network
    await disableNetwork(db);
    console.log('Network disabled');
    
    // Longer delay to ensure all operations have completely settled
    // This is important for resolving "Target ID already exists" errors
    await new Promise(resolve => setTimeout(resolve, 3500));
    
    // Then re-enable it
    await enableNetwork(db);
    console.log('Network re-enabled, Firestore connection refreshed');
    
    // Wait a moment for connection to be fully established
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Connection is now re-enabled, no need for test read
    // which could fail due to permissions or network issues
    console.log('Firestore connection refreshed successfully');
    
    return true;
  } catch (error) {
    console.error('Error refreshing Firestore connection:', error);
    return false;
  }
}; 