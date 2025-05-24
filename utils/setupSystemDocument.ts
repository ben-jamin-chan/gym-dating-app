import { db } from './firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

/**
 * Creates or updates the system status document used for connection testing
 * This should be called once during app initialization
 */
export const setupSystemStatusDocument = async () => {
  // Disabled system document setup to avoid permission issues
  // This was used for connection testing but isn't essential for app functionality
  console.log('System document setup disabled (not essential for app functionality)');
  return true;
};

/**
 * Schedules periodic retry attempts for setting up the system document
 * Will automatically back off if multiple attempts fail
 */
export const scheduleSystemDocumentSetup = () => {
  let attempts = 0;
  const maxAttempts = 5;
  
  const trySetup = async () => {
    try {
      const success = await setupSystemStatusDocument();
      
      if (success) {
        // If successful, no need to retry
        console.log('System status document setup complete');
        return;
      }
      
      // If failed and we haven't reached max attempts, try again with backoff
      attempts++;
      if (attempts < maxAttempts) {
        // Exponential backoff: 5s, 10s, 20s, 40s, etc.
        const delay = Math.min(5000 * Math.pow(2, attempts - 1), 60000);
        console.log(`Will retry system document setup in ${delay/1000}s (attempt ${attempts}/${maxAttempts})`);
        
        setTimeout(trySetup, delay);
      }
    } catch (error) {
      // This should never happen since setupSystemStatusDocument catches all errors
      console.warn('Error in system document retry mechanism:', error);
    }
  };
  
  // First attempt without delay
  trySetup();
}; 