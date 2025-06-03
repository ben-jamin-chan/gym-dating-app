// Re-export all Firebase functionality
// This ensures existing code doesn't break after refactoring

// Config exports
export {
  app,
  db,
  auth,
  storage,
  geoFirestore,
  conversationsRef,
  messagesRef,
  typingIndicatorsRef,
  usersRef,
  disableFirestoreNetwork,
  enableFirestoreNetwork,
  refreshFirestoreConnection
} from './config';

// Auth exports - use the safe versions
export {
  registerUser,
  registerUserWithoutProfile,
  loginUser,
  logoutUser,
  resetPassword,
  updateUserProfile,
  getCurrentUser,
  subscribeToAuthChanges,
  updateUserLocation
} from './safeAuth';

// Database exports
export {
  saveUserProfile,
  getUserProfile
} from './database';

// Messaging exports
export {
  getConversations,
  subscribeToConversations,
  getMessages,
  subscribeToMessages,
  sendMessage,
  markMessagesAsRead,
  updateTypingStatus,
  subscribeToTypingIndicator,
  refreshConversationsData,
  refreshMessagesData,
  cleanupAllListeners
} from './messaging';

// Storage exports
export {
  uploadMedia
} from './storage';

// Firebase Storage direct exports for components
export { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Offline functionality exports
export {
  queueMessageForSending,
  processPendingMessages
} from './offline';

// Utility exports
export {
  refreshFirebaseConnection,
  storeUserCredentials,
  clearUserCredentials,
  checkAndAutoSignIn,
  logFirebaseError,
  checkNetworkBeforeOperation,
  cleanupFirestoreListeners,
  createSafeFirestoreListener
} from './utils';

// Firestore operations queue exports
export {
  safeFirestoreOperation,
  firestoreQueue
} from './operationQueue';

// Firestore initialization manager exports
export {
  firestoreInitManager,
  runWhenFirestoreReady,
  FirestoreInitState
} from './initManager';

// Emergency recovery exports
export {
  emergencyStop,
  manualRecovery,
  checkForErrorLoop,
  RECOVERY_INSTRUCTIONS
} from './emergencyRecovery';

// Add a startup health check
import { getFirebaseHealthStatus, getFirestoreDb } from './config';

// Re-export the getFirestoreDb function for convenience
export { getFirestoreDb };

export const checkFirebaseHealth = async (): Promise<{ healthy: boolean, issues: string[] }> => {
  try {
    console.log('🩺 Running Firebase health check...');
    
    const status = await getFirebaseHealthStatus();
    
    if (status.healthy) {
      console.log('✅ Firebase health check passed');
    } else {
      console.warn('⚠️ Firebase health check detected issues:', status.issues);
    }
    
    return status;
  } catch (error) {
    console.error('❌ Firebase health check failed:', error);
    return { healthy: false, issues: ['Health check failed with error'] };
  }
};

// Centralized export for Firebase-related utilities
export * from './config';
export * from './auth';
export * from './database';
export { checkForErrorLoop, emergencyStop, manualRecovery, forceReinitializeFirestore } from './emergencyRecovery';

// Export Firebase init functions
export { 
  isFirebaseHealthy,
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseFirestore,
  getFirebaseStorage
} from './firebaseInit';

// Provide a function to verify Firebase is working properly
export const verifyFirebaseOnStartup = async (): Promise<boolean> => {
  try {
    console.log('🔍 Verifying Firebase configuration on startup...');
    
    // Basic health check
    const { isFirebaseHealthy } = await import('./firebaseInit');
    const healthStatus = await isFirebaseHealthy();
    
    if (!healthStatus.healthy) {
      console.warn('⚠️ Firebase health check failed, attempting recovery...');
      
      try {
        // Import dynamically to avoid circular dependencies
        const { manualRecovery } = await import('./emergencyRecovery');
        await manualRecovery();
        
        // Check health again after recovery
        const newHealthStatus = await isFirebaseHealthy();
        if (!newHealthStatus.healthy) {
          console.warn('⚠️ Firebase verification failed, app may experience issues');
        } else {
          console.log('✅ Firebase recovery successful');
        }
        
        return newHealthStatus.healthy;
      } catch (recoveryError) {
        console.error('❌ Recovery failed:', recoveryError);
        return false;
      }
    }
    
    console.log('✅ Firebase verification successful');
    return true;
  } catch (error) {
    console.error('❌ Firebase verification failed:', error);
    return false;
  }
}; 