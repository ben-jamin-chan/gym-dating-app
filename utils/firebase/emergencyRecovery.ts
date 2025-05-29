/**
 * Emergency Recovery Utilities for Firestore
 * 
 * Provides emergency functions to recover from Firebase errors
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, emergencyFirestoreReset } from './config';
import { terminate } from 'firebase/firestore';
import { isFirebaseHealthy } from './firebaseInit';

/**
 * Completely stop all Firestore operations and clear error tracking
 */
export const emergencyStop = async (): Promise<boolean> => {
  try {
    console.log('🚨 EMERGENCY STOP: Terminating all Firestore operations...');
    
    // Clear global error tracking
    if (typeof global !== 'undefined') {
      global.__firestoreErrorCount = 0;
      global.__lastErrorCheck = 0;
    }
    
    // Terminate Firestore
    try {
      await terminate(db);
      console.log('✅ Firestore terminated successfully');
    } catch (error) {
      console.warn('⚠️ Error terminating Firestore (continuing anyway):', error);
    }
    
    // Clear any cached Firestore data
    try {
      await AsyncStorage.removeItem('@FirestoreCache');
      await AsyncStorage.removeItem('@FirestoreErrors');
      console.log('✅ Cleared cached Firestore data');
    } catch (storageError) {
      console.warn('⚠️ Warning clearing storage (continuing anyway):', storageError);
    }
    
    console.log('✅ Emergency stop completed. App restart recommended.');
    return true;
  } catch (error) {
    console.error('❌ Emergency stop failed:', error);
    return false;
  }
};

/**
 * Manual recovery that forces a clean restart of Firestore
 */
export const manualRecovery = async (): Promise<boolean> => {
  try {
    console.log('🔧 MANUAL RECOVERY: Starting clean Firestore restart...');
    
    // First, emergency stop
    await emergencyStop();
    
    // Wait for everything to settle
    console.log('⏳ Waiting for operations to settle...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Attempt emergency reset as the final step
    try {
      const resetSuccess = await emergencyFirestoreReset();
      
      if (resetSuccess) {
        // Verify that Firebase is working
        console.log('Testing fresh Firebase instance...');
        const healthInfo = await isFirebaseHealthy();
        
        if (healthInfo.healthy) {
          console.log('✅ Fresh Firebase instance is healthy');
          console.log('✅ Manual recovery completed successfully');
          return true;
        } else {
          console.error('❌ Fresh Firebase instance is not healthy:', healthInfo);
          console.log('📱 Please restart the app completely');
          return false;
        }
      } else {
        console.error('❌ Emergency reset failed');
        console.log('📱 Please restart the app completely');
        return false;
      }
    } catch (resetError) {
      console.error('❌ Error during emergency reset:', resetError);
      console.log('📱 Please restart the app completely');
      return false;
    }
  } catch (error) {
    console.error('❌ Manual recovery error:', error);
    return false;
  }
};

/**
 * Check if we're in an error loop state and need manual intervention
 */
export const checkForErrorLoop = (): boolean => {
  // This can be called from the console or by the app to check current state
  const now = Date.now();
  
  // Simple check - if we've had more than 50 errors in the last minute, we're likely in a loop
  try {
    const recentErrors = global.__firestoreErrorCount || 0;
    const lastCheck = global.__lastErrorCheck || 0;
    
    if (now - lastCheck > 60000) {
      // Reset counter every minute
      global.__firestoreErrorCount = 0;
      global.__lastErrorCheck = now;
      return false;
    }
    
    const isInLoop = recentErrors > 50;
    if (isInLoop) {
      console.warn(`🚨 DETECTED ERROR LOOP: ${recentErrors} Firestore errors in the last minute`);
      console.warn(RECOVERY_INSTRUCTIONS);
    }
    
    return isInLoop;
  } catch (error) {
    return false;
  }
};

/**
 * Force reinitialize the Firestore instance by doing a complete app restart
 */
export const forceReinitializeFirestore = async (): Promise<boolean> => {
  try {
    console.log('🔄 Forcing Firebase reinitialization...');
    
    // Do a complete emergency reset
    await emergencyFirestoreReset();
    
    // Check if it's working
    const healthInfo = await isFirebaseHealthy();
    
    if (healthInfo.healthy) {
      console.log('✅ Firebase reinitialized successfully and is healthy');
      return true;
    } else {
      console.warn('⚠️ Firebase reinitialized but is not healthy');
      return false;
    }
  } catch (error) {
    console.error('❌ Error reinitializing Firebase:', error);
    return false;
  }
};

/**
 * Add this to global scope for console access
 */
if (typeof global !== 'undefined') {
  global.__emergencyStop = emergencyStop;
  global.__manualRecovery = manualRecovery;
  global.__checkErrorLoop = checkForErrorLoop;
  global.__reinitializeFirestore = forceReinitializeFirestore;
  
  // Add instruction function
  global.__firebaseHelp = () => {
    console.log(RECOVERY_INSTRUCTIONS);
    return 'Recovery instructions displayed';
  };
}

// Instructions for manual intervention
export const RECOVERY_INSTRUCTIONS = `
🚨 FIRESTORE ERROR LOOP DETECTED 🚨

Manual Recovery Options:

1. From React Native Debugger Console:
   global.__emergencyStop()         // Stop all Firestore operations
   global.__manualRecovery()        // Attempt clean restart
   global.__reinitializeFirestore() // Force reinitialization of Firestore
   global.__checkErrorLoop()        // Check if still in error loop
   global.__firebaseHelp()          // Show these instructions

2. From your app (add to a debug button):
   import { emergencyStop, manualRecovery, forceReinitializeFirestore } from '@/utils/firebase/emergencyRecovery'
   
3. As last resort:
   - Force close the app completely
   - Clear app cache/data
   - Restart the app

4. If running on simulator/emulator:
   - Reset the simulator
   - Clear all app data
`;

export { emergencyStop as __emergencyStop, manualRecovery as __manualRecovery, checkForErrorLoop as __checkErrorLoop, forceReinitializeFirestore as __reinitializeFirestore }; 