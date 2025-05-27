/**
 * Emergency Recovery Utilities for Firestore
 * 
 * This module provides manual intervention tools when Firestore gets stuck
 * in error loops or becomes unresponsive.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, emergencyFirestoreReset } from './config';
import { terminate } from 'firebase/firestore';

/**
 * Completely stop all Firestore operations and clear error tracking
 */
export const emergencyStop = async (): Promise<boolean> => {
  try {
    console.log('🚨 EMERGENCY STOP: Terminating all Firestore operations...');
    
    // Terminate Firestore
    await terminate(db);
    
    // Clear any cached Firestore data
    try {
      await AsyncStorage.removeItem('@FirestoreCache');
      await AsyncStorage.removeItem('@FirestoreErrors');
    } catch (storageError) {
      console.warn('Warning clearing storage:', storageError);
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
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Attempt emergency reset
    const resetSuccess = await emergencyFirestoreReset();
    
    if (resetSuccess) {
      console.log('✅ Manual recovery completed successfully');
      return true;
    } else {
      console.error('❌ Manual recovery failed');
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
    
    return recentErrors > 50;
  } catch (error) {
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
}

// Instructions for manual intervention
export const RECOVERY_INSTRUCTIONS = `
🚨 FIRESTORE ERROR LOOP DETECTED 🚨

Manual Recovery Options:

1. From React Native Debugger Console:
   global.__emergencyStop()      // Stop all Firestore operations
   global.__manualRecovery()     // Attempt clean restart
   global.__checkErrorLoop()     // Check if still in error loop

2. From your app (add to a debug button):
   import { emergencyStop, manualRecovery } from '@/utils/firebase/emergencyRecovery'
   
3. As last resort:
   - Force close the app completely
   - Clear app cache/data
   - Restart the app

4. If running on simulator/emulator:
   - Reset the simulator
   - Clear all app data
`;

export { emergencyStop as __emergencyStop, manualRecovery as __manualRecovery, checkForErrorLoop as __checkErrorLoop }; 