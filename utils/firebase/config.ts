/**
 * Firebase Configuration
 * 
 * This file re-exports the Firebase instances from the initialization module.
 * DO NOT initialize Firebase here - it should only be done in firebaseInit.ts.
 */

import { 
  app, 
  db, 
  auth, 
  storage, 
  isFirebaseHealthy, 
  getFirebaseFirestore 
} from './firebaseInit';

import { 
  collection, 
  doc, 
  getDoc, 
  disableNetwork, 
  enableNetwork, 
  terminate, 
  Firestore 
} from 'firebase/firestore';

// Re-export the instances
export { app, db, auth, storage };

// Collection references
export const getConversationsRef = () => collection(db, 'conversations');
export const getMessagesRef = () => collection(db, 'messages');
export const getTypingIndicatorsRef = () => collection(db, 'typingIndicators');
export const getUsersRef = () => collection(db, 'users');

// For backwards compatibility
export const conversationsRef = collection(db, 'conversations');
export const messagesRef = collection(db, 'messages');
export const typingIndicatorsRef = collection(db, 'typingIndicators');
export const usersRef = collection(db, 'users');

// Function to always get the current Firestore instance
export const getFirestoreDb = (): Firestore => {
  return getFirebaseFirestore();
};

// Network operations
export const disableFirestoreNetwork = async () => {
  try {
    await disableNetwork(db);
    console.log('✅ Firestore network disabled');
    return true;
  } catch (error) {
    console.warn('⚠️ Error disabling network:', error);
    return false;
  }
};

export const enableFirestoreNetwork = async () => {
  try {
    await enableNetwork(db);
    console.log('✅ Firestore network enabled');
    return true;
  } catch (error) {
    console.error('❌ Error enabling network:', error);
    return false;
  }
};

// Simple connection refresh without the complexity
export const refreshFirestoreConnection = async (): Promise<boolean> => {
  try {
    console.log('🔄 Refreshing Firestore connection...');
    
    // Disable network
    await disableFirestoreNetwork();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Enable network
    await enableFirestoreNetwork();
    
    console.log('✅ Firestore connection refreshed');
    return true;
  } catch (error) {
    console.error('❌ Error refreshing connection:', error);
    return false;
  }
};

// Simplified error handler
export const handleFirestoreError = async (error: any, operation: string = 'unknown'): Promise<void> => {
  console.error(`❌ Firestore error in ${operation}:`, error);
  
  // Don't try to fix permission-denied errors
  if (error?.code === 'permission-denied') {
    console.log('⛔ Permission error, refresh will not help');
    return;
  }
  
  // For any other error, try a simple connection refresh
  await refreshFirestoreConnection();
};

// Emergency reset function
export const emergencyFirestoreReset = async (): Promise<boolean> => {
  try {
    console.log('🚨 Performing emergency Firestore reset...');
    
    // Try to terminate the instance
    try {
      await terminate(db);
      console.log('✅ Firestore terminated');
    } catch (error) {
      console.warn('⚠️ Error terminating Firestore (continuing anyway):', error);
    }
    
    // Wait for things to settle
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // The db will be automatically re-obtained on next use
    console.log('✅ Emergency reset completed');
    return true;
  } catch (error) {
    console.error('❌ Error during emergency reset:', error);
    return false;
  }
};

// Function to get current Firebase health status
export const getFirebaseHealthStatus = async (): Promise<{healthy: boolean, issues: string[]}> => {
  const healthInfo = await isFirebaseHealthy();
  
  const issues: string[] = [];
  if (!healthInfo.healthy) {
    issues.push('Firebase health check failed');
  }
  
  if (!healthInfo.auth) {
    issues.push('Auth service not available');
  }
  
  if (!healthInfo.firestore) {
    issues.push('Firestore service not available');
  }
  
  if (!healthInfo.storage) {
    issues.push('Storage service not available');
  }
  
  return {
    healthy: issues.length === 0,
    issues
  };
}; 