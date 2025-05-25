import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError } from './config';

export const saveUserProfile = async (userId: string, profileData: any, retryCount = 0): Promise<boolean> => {
  const maxRetries = 3;
  
  try {
    console.log(`💾 Saving user profile for ${userId} (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
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
    
    console.log(`✅ User profile saved successfully for ${userId}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error saving user profile (attempt ${retryCount + 1}):`, error);
    
    // Use enhanced error handler
    await handleFirestoreError(error, 'saveUserProfile');
    
    // Check if it's an internal assertion error and we haven't exceeded retry limit
    if (error.message && 
        (error.message.includes('INTERNAL ASSERTION FAILED') || 
         error.message.includes('Unexpected state') ||
         error.code === 'unavailable' ||
         error.message.includes('Target ID already exists')) && 
        retryCount < maxRetries) {
      
      console.log(`🔄 Retrying saveUserProfile (attempt ${retryCount + 1}/${maxRetries})`);
      
      // Wait a bit before retrying with exponential backoff
      const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000; // Add jitter
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return saveUserProfile(userId, profileData, retryCount + 1);
    }
    
    throw error;
  }
};

export const getUserProfile = async (userId: string, retryCount = 0): Promise<any> => {
  const maxRetries = 2;
  
  try {
    console.log(`📖 Fetching profile for user: ${userId} (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    // Validate user ID
    if (!userId) {
      console.error('Invalid user ID provided to getUserProfile');
      throw new Error('Invalid user ID');
    }
    
    const userDocRef = doc(db, 'users', userId);
    
    console.log('Making Firestore getDoc request...');
    let startTime = Date.now();
    
    try {
      const userDoc = await getDoc(userDocRef);
      console.log(`✅ Firestore getDoc completed in ${Date.now() - startTime}ms`);
      
      if (userDoc.exists()) {
        console.log('User document exists, returning data');
        return { id: userDoc.id, ...userDoc.data() };
      } else {
        console.log('User document does not exist, returning null');
        return null;
      }
    } catch (docError: any) {
      console.error('Error in Firestore getDoc operation:', docError);
      
      // Use enhanced error handler
      await handleFirestoreError(docError, 'getUserProfile');
      
      // Add specific error details for common Firestore errors
      if (docError.code === 'permission-denied') {
        throw new Error('Permission denied accessing profile data. Check Firestore rules.');
      } else if (docError.code === 'unavailable') {
        // Retry for unavailable errors
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying getUserProfile due to unavailable error (attempt ${retryCount + 1}/${maxRetries})`);
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return getUserProfile(userId, retryCount + 1);
        }
        throw new Error('Firestore service is currently unavailable. Check your connection.');
      } else if (docError.code === 'not-found') {
        console.log('Document not found, returning null');
        return null;
      } else if (docError.message && docError.message.includes('INTERNAL ASSERTION FAILED') && retryCount < maxRetries) {
        // Retry for internal assertion failures
        console.log(`🔄 Retrying getUserProfile due to internal assertion failure (attempt ${retryCount + 1}/${maxRetries})`);
        const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
        return getUserProfile(userId, retryCount + 1);
      } else {
        throw docError;
      }
    }
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}; 