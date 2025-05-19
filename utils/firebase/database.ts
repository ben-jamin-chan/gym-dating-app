import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './config';

export const saveUserProfile = async (userId: string, profileData: any) => {
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

export const getUserProfile = async (userId: string) => {
  try {
    console.log(`Fetching profile for user: ${userId}`);
    
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
      console.log(`Firestore getDoc completed in ${Date.now() - startTime}ms`);
      
      if (userDoc.exists()) {
        console.log('User document exists, returning data');
        return { id: userDoc.id, ...userDoc.data() };
      } else {
        console.log('User document does not exist, returning null');
        return null;
      }
    } catch (docError: any) {
      console.error('Error in Firestore getDoc operation:', docError);
      
      // Add specific error details for common Firestore errors
      if (docError.code === 'permission-denied') {
        throw new Error('Permission denied accessing profile data. Check Firestore rules.');
      } else if (docError.code === 'unavailable') {
        throw new Error('Firestore service is currently unavailable. Check your connection.');
      } else if (docError.code === 'not-found') {
        console.log('Document not found, returning null');
        return null;
      } else {
        throw docError;
      }
    }
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}; 