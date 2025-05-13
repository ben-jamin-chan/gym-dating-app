import { db } from './firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

/**
 * Creates or updates the system status document used for connection testing
 * This should be called once during app initialization
 */
export const setupSystemStatusDocument = async () => {
  // Don't throw errors to the console when the function fails
  try {
    // Reference to the system status document
    const statusDocRef = doc(db, 'system', 'status');
    
    try {
      // Check if document exists
      const statusDoc = await getDoc(statusDocRef);
      
      if (!statusDoc.exists()) {
        // Create the document if it doesn't exist
        console.log('Creating system status document...');
        await setDoc(statusDocRef, {
          lastUpdated: serverTimestamp(),
          status: 'online',
          appVersion: '1.0.0',
          isTestDocument: true
        });
        console.log('System status document created successfully');
      } else {
        // Update the existing document
        console.log('Updating system status document...');
        await setDoc(statusDocRef, {
          lastUpdated: serverTimestamp(),
          status: 'online',
          isTestDocument: true
        }, { merge: true });
        console.log('System status document updated successfully');
      }
      
      return true;
    } catch (error) {
      // Handle offline errors silently - we'll retry later when connection is restored
      if (error.message && error.message.includes('offline')) {
        // Don't log error for offline cases
        return false;
      }
      
      // Log other errors but don't throw
      console.warn('Non-critical error with system status document:', error);
      return false;
    }
  } catch (error) {
    // Should never get here, but just in case
    return false;
  }
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