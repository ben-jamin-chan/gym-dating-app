import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, getCurrentUser } from '@/utils/firebase';
import { UserPreferences } from '@/types';

/**
 * Get user preferences from Firestore
 * @param userId The user ID to fetch preferences for
 * @returns Promise resolving to the user preferences or null if not found
 */
export const getUserPreferences = async (userId: string): Promise<UserPreferences | null> => {
  try {
    const prefsDocRef = doc(db, 'userPreferences', userId);
    const prefsDoc = await getDoc(prefsDocRef);
    
    if (prefsDoc.exists()) {
      return prefsDoc.data() as UserPreferences;
    }
    return null;
  } catch (error) {
    console.error('Error getting user preferences:', error);
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
    if (!preferences.userId) {
      throw new Error('User ID is required');
    }
    
    const prefsDocRef = doc(db, 'userPreferences', preferences.userId);
    const prefsDoc = await getDoc(prefsDocRef);
    
    if (prefsDoc.exists()) {
      await updateDoc(prefsDocRef, preferences);
    } else {
      await setDoc(prefsDocRef, preferences);
    }
  } catch (error: any) {
    console.error('Error saving user preferences:', error);
    
    // Check if it's an internal assertion error and we haven't exceeded retry limit
    if (error.message && error.message.includes('INTERNAL ASSERTION FAILED') && retryCount < maxRetries) {
      console.log(`Retrying saveUserPreferences (attempt ${retryCount + 1}/${maxRetries})`);
      
      // Wait a bit before retrying with exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
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
  } catch (error: any) {
    console.error('Error creating default preferences:', error);
    
    // Check if it's an internal assertion error and we haven't exceeded retry limit
    if (error.message && error.message.includes('INTERNAL ASSERTION FAILED') && retryCount < maxRetries) {
      console.log(`Retrying createDefaultPreferences (attempt ${retryCount + 1}/${maxRetries})`);
      
      // Wait a bit before retrying with exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return createDefaultPreferences(userId, retryCount + 1);
    }
    
    throw error;
  }
}; 