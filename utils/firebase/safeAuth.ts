/**
 * SafeAuth - Wrappers for Firebase Auth that ensure Firestore is properly initialized
 * 
 * These wrappers prevent auth operations from causing "INTERNAL ASSERTION FAILED" errors
 * by ensuring Firestore is fully initialized before auth operations.
 */

import {
  registerUser as originalRegisterUser,
  registerUserWithoutProfile as originalRegisterUserWithoutProfile,
  loginUser as originalLoginUser,
  logoutUser as originalLogoutUser,
  resetPassword as originalResetPassword,
  updateUserProfile as originalUpdateUserProfile,
  getCurrentUser as originalGetCurrentUser,
  subscribeToAuthChanges as originalSubscribeToAuthChanges,
  updateUserLocation as originalUpdateUserLocation
} from './auth';
import { firestoreInitManager } from './initManager';
import { User } from 'firebase/auth';
import { safeFirestoreOperation } from './operationQueue';

/**
 * Safely get the current user, waiting for Firestore initialization if needed
 */
export const getCurrentUser = (): User | null => {
  // This can be called synchronously - just return the current value
  // But issue a warning if Firestore isn't initialized yet
  if (!firestoreInitManager.isReady()) {
    firestoreInitManager.checkForEarlyAccess();
  }
  return originalGetCurrentUser();
};

/**
 * Safely subscribe to auth changes, ensuring Firestore is initialized
 */
export const subscribeToAuthChanges = (callback: (user: User | null) => void): (() => void) => {
  // Initialize Firestore if needed
  if (!firestoreInitManager.isReady()) {
    console.log('Initializing Firestore before setting up auth state listener');
    firestoreInitManager.initialize();
  }
  
  // Wrap the callback to handle errors
  const safeCallback = (user: User | null) => {
    try {
      callback(user);
    } catch (error) {
      console.error('Error in auth state change callback:', error);
    }
  };
  
  return originalSubscribeToAuthChanges(safeCallback);
};

/**
 * Safely register a new user, ensuring Firestore is initialized
 */
export const registerUser = async (email: string, password: string): Promise<User> => {
  await firestoreInitManager.waitForReady();
  return await safeFirestoreOperation(() => originalRegisterUser(email, password), 10); // High priority
};

/**
 * Safely register a new user without profile, ensuring Firestore is initialized
 */
export const registerUserWithoutProfile = async (email: string, password: string): Promise<User> => {
  await firestoreInitManager.waitForReady();
  return await safeFirestoreOperation(() => originalRegisterUserWithoutProfile(email, password), 10); // High priority
};

/**
 * Safely login a user, ensuring Firestore is initialized
 */
export const loginUser = async (email: string, password: string): Promise<User> => {
  await firestoreInitManager.waitForReady();
  return await safeFirestoreOperation(() => originalLoginUser(email, password), 10); // High priority
};

/**
 * Safely logout a user, ensuring Firestore is initialized
 */
export const logoutUser = async (): Promise<void> => {
  await firestoreInitManager.waitForReady();
  return await safeFirestoreOperation(() => originalLogoutUser(), 10); // High priority
};

/**
 * Safely reset a user's password, ensuring Firestore is initialized
 */
export const resetPassword = async (email: string): Promise<void> => {
  await firestoreInitManager.waitForReady();
  return await safeFirestoreOperation(() => originalResetPassword(email), 5); // Medium priority
};

/**
 * Safely update a user's profile, ensuring Firestore is initialized
 */
export const updateUserProfile = async (displayName: string, photoURL?: string): Promise<User | null> => {
  await firestoreInitManager.waitForReady();
  return await safeFirestoreOperation(() => originalUpdateUserProfile(displayName, photoURL), 5); // Medium priority
};

/**
 * Safely update a user's location, ensuring Firestore is initialized
 */
export const updateUserLocation = async (
  userId: string, 
  latitude: number, 
  longitude: number
): Promise<void> => {
  await firestoreInitManager.waitForReady();
  return await safeFirestoreOperation(() => originalUpdateUserLocation(userId, latitude, longitude), 3); // Lower priority
}; 