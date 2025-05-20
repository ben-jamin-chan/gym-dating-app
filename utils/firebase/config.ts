import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
// Polyfill random values and URL for Firebase Auth on React Native
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection,
  enableIndexedDbPersistence,
  connectFirestoreEmulator,
  disableNetwork,
  enableNetwork,
  Firestore
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { 
  getAuth,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  setPersistence
} from 'firebase/auth';
import { Platform } from 'react-native';
import { GeoFirestore } from 'geofirestore';

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
export const db = getFirestore(app);

// Initialize GeoFirestore with the Firestore instance
export const geoFirestore = new GeoFirestore(db as any);

// Initialize Auth
export const auth = getAuth(app);
if (Platform.OS !== 'web') {
  setPersistence(auth, inMemoryPersistence)
    .then(() => console.log('Firebase Auth persistence set to in-memory'))
    .catch(err => console.error('Error setting in-memory auth persistence:', err));
  console.log('Firebase Auth initialized for React Native');
} else {
  setPersistence(auth, indexedDBLocalPersistence)
    .then(() => console.log('Firebase Auth web persistence set to IndexedDB'))
    .catch(err => console.error('Error setting web auth persistence:', err));
  console.log('Firebase Auth initialized for web platform');
}

// Enable offline persistence only on web platform
if (Platform.OS === 'web') {
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log('Offline persistence enabled successfully');
    })
    .catch((error) => {
      console.error('Error enabling offline persistence:', error);
      if (error.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time
        console.warn('Multiple tabs open, persistence only enabled in one tab');
      } else if (error.code === 'unimplemented') {
        // The current browser does not support all of the features required for persistence
        console.warn('Current environment does not support persistence');
      }
    });
} else {
  console.log('Offline persistence not enabled on mobile platform');
}

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
    
    // Short delay to ensure all operations have settled
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Then re-enable it
    await enableNetwork(db);
    console.log('Network re-enabled, Firestore connection refreshed');
    return true;
  } catch (error) {
    console.error('Error refreshing Firestore connection:', error);
    return false;
  }
}; 