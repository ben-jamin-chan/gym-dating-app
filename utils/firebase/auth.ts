import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  User
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth, db } from './config';
import { checkNetworkBeforeOperation, logFirebaseError, storeUserCredentials, clearUserCredentials } from './utils';
import { GeoPoint } from 'firebase/firestore';
import { geoFirestore } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to save user profile (internal to this module to avoid circular deps)
const saveUserProfileInternal = async (userId: string, profileData: any) => {
  try {
    // Create sanitized version of the data to avoid undefined values
    const sanitizedData = Object.fromEntries(
      Object.entries(profileData).map(([key, value]) => {
        // Replace undefined values with null for Firestore compatibility
        return [key, value === undefined ? null : value];
      })
    );
    
    // Create or update the user document in Firestore
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      ...sanitizedData,
      createdAt: sanitizedData.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
};

// For React Native, attempt auto-login with stored credentials
if (Platform.OS !== 'web') {
  // Import and run the check on initialization
  import('./utils').then(utils => {
    utils.checkAndAutoSignIn();
  });
}

export const registerUser = async (email: string, password: string) => {
  try {
    // Try to check network, but don't block registration if check fails
    try {
      await checkNetworkBeforeOperation();
    } catch (error) {
      console.warn('Network check failed, but continuing with registration attempt:', error);
    }
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('User registered successfully:', userCredential.user.uid);
    
    // Create initial user profile in Firestore
    try {
      await saveUserProfileInternal(userCredential.user.uid, {
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || '',
        photoURL: userCredential.user.photoURL || null,
        createdAt: serverTimestamp(),
        // Default profile data
        bio: '',
        age: null,
        workoutFrequency: '',
        interests: [],
        gymCheckIns: 0
      });
      console.log('User profile created in Firestore');
    } catch (profileError) {
      console.error('Error creating user profile in Firestore:', profileError);
      // Continue anyway since the auth account was created
    }
    
    // Store credentials for persistent auth (only on mobile)
    if (Platform.OS !== 'web') {
      await storeUserCredentials(email, password);
    }
    
    return userCredential.user;
  } catch (error: any) {
    logFirebaseError('Error registering user', error);
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    // Try to check network, but don't block login if check fails
    try {
      await checkNetworkBeforeOperation();
    } catch (error) {
      console.warn('Network check failed, but continuing with login attempt:', error);
    }
    
    console.log(`Attempting to log in user: ${email}`);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('Login successful for user:', userCredential.user.uid);
    
    // Store credentials for persistent auth (only on mobile)
    if (Platform.OS !== 'web') {
      await storeUserCredentials(email, password);
    }
    
    return userCredential.user;
  } catch (error: any) {
    logFirebaseError('Error logging in user', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    // Clear stored credentials first (only on mobile)
    if (Platform.OS !== 'web') {
      await clearUserCredentials();
    }
    
    // Then sign out from Firebase
    await signOut(auth);
  } catch (error: any) {
    console.error('Error logging out user:', error);
    throw error;
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Error resetting password:', error);
    throw error;
  }
};

export const updateUserProfile = async (displayName: string, photoURL?: string) => {
  try {
    if (!auth.currentUser) {
      throw new Error('No user is signed in');
    }
    
    // Update Firebase Auth profile with sanitized data
    const authProfileData = {
      displayName,
      photoURL: photoURL === undefined ? null : photoURL
    };
    
    await updateProfile(auth.currentUser, authProfileData);
    
    // Also update the user profile in Firestore
    await saveUserProfileInternal(auth.currentUser.uid, {
      displayName,
      photoURL: photoURL === undefined ? null : photoURL,
      updatedAt: serverTimestamp()
    });
    
    return auth.currentUser;
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const updateUserLocation = async (userId: string, latitude: number, longitude: number) => {
  try {
    if (!userId) {
      console.error('Invalid user ID provided to updateUserLocation');
      throw new Error('Invalid user ID');
    }
    
    // Check if we're online using navigator.onLine (works on web) or NetInfo (for React Native)
    let isOnline = true;
    try {
      if (Platform.OS === 'web') {
        isOnline = typeof navigator !== 'undefined' && navigator.onLine;
      } else {
        const NetInfo = require('@react-native-community/netinfo');
        const state = await NetInfo.fetch();
        isOnline = state.isConnected && state.isInternetReachable !== false;
      }
    } catch (e) {
      // If we can't determine connectivity, assume we're online
      console.log('Error checking network status:', e);
    }

    // If we're offline, store the location update to process later
    if (!isOnline) {
      try {
        // Store the location update in AsyncStorage for later processing
        const locationUpdates = await AsyncStorage.getItem('pendingLocationUpdates');
        const updates = locationUpdates ? JSON.parse(locationUpdates) : [];
        
        updates.push({
          userId,
          latitude,
          longitude,
          timestamp: Date.now()
        });
        
        // Only keep the latest 10 updates to prevent storage bloat
        const trimmedUpdates = updates.slice(-10);
        await AsyncStorage.setItem('pendingLocationUpdates', JSON.stringify(trimmedUpdates));
        
        console.log('Stored location update for later processing (offline mode)');
        return false; // Indicate update was queued but not sent
      } catch (storageError) {
        console.warn('Failed to store location update for offline processing:', storageError);
        return false;
      }
    }
    
    console.log(`Updating location for user: ${userId} to [${latitude}, ${longitude}]`);
    
    // Access the users collection
    const userDocRef = doc(db, 'users', userId);
    
    // First check if document exists
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log('User document does not exist, creating it...');
      // Create the user document with location
      await setDoc(userDocRef, {
        coordinates: new GeoPoint(latitude, longitude),
        location: {
          latitude,
          longitude
        },
        locationUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
    } else {
      // Update the existing document
      await setDoc(userDocRef, {
        coordinates: new GeoPoint(latitude, longitude),
        location: {
          latitude,
          longitude
        },
        locationUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
    
    console.log('Location successfully updated');
    return true;
  } catch (error) {
    // Check if this is an offline error
    if (error instanceof Error && 
        (error.message.includes('offline') || 
         error.message.includes('network') || 
         error.message.includes('connection'))) {
      console.log('Unable to update location: device is offline');
      
      // Try to queue for later
      try {
        const locationUpdates = await AsyncStorage.getItem('pendingLocationUpdates');
        const updates = locationUpdates ? JSON.parse(locationUpdates) : [];
        
        updates.push({
          userId,
          latitude,
          longitude,
          timestamp: Date.now()
        });
        
        // Only keep the latest 10 updates
        const trimmedUpdates = updates.slice(-10);
        await AsyncStorage.setItem('pendingLocationUpdates', JSON.stringify(trimmedUpdates));
        
        console.log('Stored location update for later processing (offline error caught)');
      } catch (storageError) {
        console.warn('Failed to store location update after offline error:', storageError);
      }
      
      return false; // Don't throw, just return false to indicate failure
    }
    
    // For non-offline errors, log but don't throw to prevent crashes
    console.warn('Error updating user location:', error);
    return false;
  }
}; 