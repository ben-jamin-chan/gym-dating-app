import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/utils/firebase/config';
import { getCurrentUser } from '@/utils/firebase';
import { handleFirestoreError } from '@/utils/firebase/config';
import { UserPreferences } from '@/types';

/**
 * Get user preferences from Firestore
 * @param userId The user ID to fetch preferences for
 * @returns Promise resolving to the user preferences or null if not found
 */
export const getUserPreferences = async (userId: string, retryCount = 0): Promise<UserPreferences | null> => {
  const maxRetries = 2;
  
  try {
    console.log(`📖 Getting user preferences for ${userId} (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    const prefsDocRef = doc(db, 'userPreferences', userId);
    const prefsDoc = await getDoc(prefsDocRef);
    
    if (prefsDoc.exists()) {
      console.log(`✅ User preferences found for ${userId}`);
      return prefsDoc.data() as UserPreferences;
    }
    
    console.log(`ℹ️ No preferences found for ${userId}`);
    return null;
  } catch (error: any) {
    console.error(`❌ Error getting user preferences (attempt ${retryCount + 1}):`, error);
    
    // Use enhanced error handler
    await handleFirestoreError(error, 'getUserPreferences');
    
    // Retry for certain errors
    if (error.message && 
        (error.message.includes('INTERNAL ASSERTION FAILED') || 
         error.message.includes('Unexpected state') ||
         error.code === 'unavailable') && 
        retryCount < maxRetries) {
      
      console.log(`🔄 Retrying getUserPreferences (attempt ${retryCount + 1}/${maxRetries})`);
      const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, delay));
      return getUserPreferences(userId, retryCount + 1);
    }
    
    throw error;
  }
};

/**
 * Save user preferences to Firestore
 * @param preferences The preferences object to save
 * @returns Promise that resolves when the save is complete
 */
export const saveUserPreferences = async (preferences: UserPreferences, retryCount = 0): Promise<void> => {
  const maxRetries = 3;
  
  try {
    console.log(`💾 Saving user preferences for ${preferences.userId} (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    if (!preferences.userId) {
      throw new Error('User ID is required');
    }
    
    const prefsDocRef = doc(db, 'userPreferences', preferences.userId);
    const prefsDoc = await getDoc(prefsDocRef);
    
    if (prefsDoc.exists()) {
      await updateDoc(prefsDocRef, preferences);
      console.log(`✅ User preferences updated for ${preferences.userId}`);
    } else {
      await setDoc(prefsDocRef, preferences);
      console.log(`✅ User preferences created for ${preferences.userId}`);
    }
  } catch (error: any) {
    console.error(`❌ Error saving user preferences (attempt ${retryCount + 1}):`, error);
    
    // Use enhanced error handler
    await handleFirestoreError(error, 'saveUserPreferences');
    
    // Check if it's an internal assertion error and we haven't exceeded retry limit
    if (error.message && 
        (error.message.includes('INTERNAL ASSERTION FAILED') || 
         error.message.includes('Unexpected state') ||
         error.code === 'unavailable' ||
         error.message.includes('Target ID already exists')) && 
        retryCount < maxRetries) {
      
      console.log(`🔄 Retrying saveUserPreferences (attempt ${retryCount + 1}/${maxRetries})`);
      
      // Wait a bit before retrying with exponential backoff
      const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000; // Add jitter
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return saveUserPreferences(preferences, retryCount + 1);
    }
    
    throw error;
  }
};

/**
 * Get the current user's preferences
 * @returns Promise resolving to the current user's preferences or null
 */
export const getCurrentUserPreferences = async (): Promise<UserPreferences | null> => {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;
  
  return getUserPreferences(currentUser.uid);
};

/**
 * Create default preferences for a new user
 * @param userId The user ID to create preferences for
 * @returns Promise that resolves when the default preferences are created
 */
export const createDefaultPreferences = async (userId: string, retryCount = 0): Promise<void> => {
  const maxRetries = 3;
  
  try {
    console.log(`⚙️ Creating default preferences for ${userId} (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    const defaultPreferences: UserPreferences = {
      userId,
      ageRange: { min: 18, max: 45 },
      maxDistance: 25,
      genderPreference: 'all',
      workoutFrequencyPreference: ['All'],
      intensityPreference: ['All'],
      preferredTimePreference: ['All'],
      globalMode: false
    };
    
    await saveUserPreferences(defaultPreferences);
    console.log(`✅ Default preferences created for ${userId}`);
  } catch (error: any) {
    console.error(`❌ Error creating default preferences (attempt ${retryCount + 1}):`, error);
    
    // Use enhanced error handler
    await handleFirestoreError(error, 'createDefaultPreferences');
    
    // Check if it's an internal assertion error and we haven't exceeded retry limit
    if (error.message && 
        (error.message.includes('INTERNAL ASSERTION FAILED') || 
         error.message.includes('Unexpected state') ||
         error.code === 'unavailable' ||
         error.message.includes('Target ID already exists')) && 
        retryCount < maxRetries) {
      
      console.log(`🔄 Retrying createDefaultPreferences (attempt ${retryCount + 1}/${maxRetries})`);
      
      // Wait a bit before retrying with exponential backoff
      const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000; // Add jitter
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return createDefaultPreferences(userId, retryCount + 1);
    }
    
    throw error;
  }
}; 