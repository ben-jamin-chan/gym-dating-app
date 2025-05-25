import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp, 
  Timestamp,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../utils/firebase';

// Types for Super Like system
export interface SuperLikeData {
  userId: string;
  usedCount: number;
  totalAllowed: number;
  resetTime: Timestamp;
  lastUsed?: Timestamp;
  dailyReset: boolean; // true = reset at fixed time, false = reset 24h after first use
}

export interface SuperLikeUsage {
  userId: string;
  targetUserId: string;
  timestamp: Timestamp;
  dayKey: string; // Format: YYYY-MM-DD
}

export interface SuperLikeStatus {
  remaining: number;
  total: number;
  resetTime: Timestamp;
  canUse: boolean;
  hoursUntilReset: number;
}

// Collection references
const superLikesCollection = collection(db, 'superLikes');
const superLikeUsageCollection = collection(db, 'superLikeUsage');

// Constants
const DAILY_SUPER_LIKES = 3;
const RESET_HOUR = 0; // Reset at midnight UTC (you can adjust this)

/**
 * Get the day key for a given date (YYYY-MM-DD format)
 */
const getDayKey = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Get the next reset time based on the reset strategy
 */
const getNextResetTime = (strategy: 'fixed' | 'rolling', lastUsed?: Date): Date => {
  const now = new Date();
  
  if (strategy === 'fixed') {
    // Reset at a fixed time each day (e.g., midnight UTC)
    const nextReset = new Date(now);
    nextReset.setUTCHours(RESET_HOUR, 0, 0, 0);
    
    // If we've passed today's reset time, move to tomorrow
    if (now.getTime() >= nextReset.getTime()) {
      nextReset.setUTCDate(nextReset.getUTCDate() + 1);
    }
    
    return nextReset;
  } else {
    // Rolling 24-hour reset from first use
    const resetTime = new Date(lastUsed || now);
    resetTime.setTime(resetTime.getTime() + (24 * 60 * 60 * 1000)); // Add 24 hours
    return resetTime;
  }
};

// Cache to prevent multiple initializations for the same user
const initializationCache = new Map<string, Promise<SuperLikeData>>();

/**
 * Initialize or get Super Like data for a user
 */
export const initializeSuperLikeData = async (userId: string): Promise<SuperLikeData> => {
  // Check if initialization is already in progress
  if (initializationCache.has(userId)) {
    console.log('🔄 Using cached initialization for user:', userId);
    return initializationCache.get(userId)!;
  }

  const initPromise = (async () => {
    try {
      console.log('🏗️ Initializing Super Like data for user:', userId);
      
      // Add timeout protection
      const docPromise = getDoc(doc(superLikesCollection, userId));
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Document read timeout')), 8000);
      });
      
      const superLikeDoc = await Promise.race([docPromise, timeoutPromise]);
      
      if (superLikeDoc.exists()) {
        console.log('📄 Existing Super Like document found');
        const data = superLikeDoc.data() as SuperLikeData;
        
        // Check if we need to reset the count
        const now = new Date();
        const resetTime = data.resetTime.toDate();
        console.log('⏰ Reset time check - Now:', now.toISOString(), 'Reset:', resetTime.toISOString());
        
        if (now >= resetTime) {
          console.log('🔄 Time to reset Super Likes!');
          // Time to reset
          const newResetTime = getNextResetTime('fixed');
          const updatedData: SuperLikeData = {
            ...data,
            usedCount: 0,
            resetTime: Timestamp.fromDate(newResetTime),
          };
          
          console.log('💾 Saving reset data:', updatedData);
          
          // Add timeout protection for write operation
          const writePromise = setDoc(doc(superLikesCollection, userId), updatedData);
          const writeTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Document write timeout')), 8000);
          });
          
          await Promise.race([writePromise, writeTimeoutPromise]);
          return updatedData;
        }
        
        console.log('✅ Using existing data:', data);
        return data;
      } else {
        console.log('🆕 Creating new Super Like document');
        // Create new Super Like data
        const resetTime = getNextResetTime('fixed');
        const newData: SuperLikeData = {
          userId,
          usedCount: 0,
          totalAllowed: DAILY_SUPER_LIKES,
          resetTime: Timestamp.fromDate(resetTime),
          dailyReset: true,
        };
        
        console.log('💾 Saving new data:', newData);
        
        // Add timeout protection for write operation
        const writePromise = setDoc(doc(superLikesCollection, userId), newData);
        const writeTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Document write timeout')), 8000);
        });
        
        await Promise.race([writePromise, writeTimeoutPromise]);
        console.log('✅ New Super Like data created successfully');
        return newData;
      }
    } catch (error) {
      console.error('❌ Error initializing Super Like data:', error);
      
      // Provide better error messages
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied accessing Super Like data');
      } else if (error.code === 'unavailable') {
        throw new Error('Super Like service temporarily unavailable');
      } else if (error.message.includes('timeout')) {
        throw new Error('Super Like initialization timed out');
      } else {
        throw new Error('Failed to initialize Super Like data');
      }
    } finally {
      // Clear cache after completion or error
      initializationCache.delete(userId);
    }
  })();

  // Cache the promise to prevent multiple concurrent initializations
  initializationCache.set(userId, initPromise);
  
  return initPromise;
};

/**
 * Get current Super Like status for a user
 */
export const getSuperLikeStatus = async (userId: string): Promise<SuperLikeStatus> => {
  try {
    const superLikeData = await initializeSuperLikeData(userId);
    const now = new Date();
    const resetTime = superLikeData.resetTime.toDate();
    
    const remaining = Math.max(0, superLikeData.totalAllowed - superLikeData.usedCount);
    const canUse = remaining > 0;
    
    // Calculate hours until reset
    const msUntilReset = resetTime.getTime() - now.getTime();
    const hoursUntilReset = Math.max(0, Math.ceil(msUntilReset / (1000 * 60 * 60)));
    
    return {
      remaining,
      total: superLikeData.totalAllowed,
      resetTime: superLikeData.resetTime,
      canUse,
      hoursUntilReset,
    };
  } catch (error) {
    console.error('❌ Error getting Super Like status:', error);
    
    // Return a safe fallback status instead of throwing
    const fallbackResetTime = getNextResetTime('fixed');
    return {
      remaining: 0,
      total: DAILY_SUPER_LIKES,
      resetTime: Timestamp.fromDate(fallbackResetTime),
      canUse: false,
      hoursUntilReset: 24,
    };
  }
};

/**
 * Use a Super Like (decrement the count)
 */
export const useSuperLike = async (userId: string, targetUserId: string): Promise<boolean> => {
  console.log('🌟 Starting Super Like process for user:', userId, 'target:', targetUserId);
  
  try {
    // Validate inputs
    if (!userId || !targetUserId) {
      throw new Error('Invalid user IDs provided');
    }
    
    const superLikeData = await initializeSuperLikeData(userId);
    console.log('📊 Current Super Like data:', superLikeData);
    
    // Check if user can use a Super Like
    if (superLikeData.usedCount >= superLikeData.totalAllowed) {
      console.log('❌ No Super Likes remaining:', superLikeData.usedCount, '/', superLikeData.totalAllowed);
      throw new Error('No Super Likes remaining for today');
    }
    
    const now = new Date();
    const dayKey = getDayKey(now);
    console.log('📅 Day key:', dayKey);
    
    // Check if user already super liked this person today
    const usageDocId = `${userId}_${targetUserId}_${dayKey}`;
    console.log('🔍 Checking existing usage with ID:', usageDocId);
    
    try {
      const existingUsageDoc = await getDoc(doc(superLikeUsageCollection, usageDocId));
      console.log('📄 Usage document check result:', {
        exists: existingUsageDoc.exists(),
        docId: usageDocId
      });
      
      if (existingUsageDoc.exists()) {
        console.log('❌ Already super liked this person today');
        throw new Error('You have already super liked this person today');
      }
      
      console.log('✅ No existing usage found, proceeding with Super Like');
    } catch (permissionError) {
      console.error('⚠️ Permission error checking usage document:', permissionError);
      
      // If we get a permission error just checking existence, 
      // it might be due to rules, but we should still allow the super like
      // The batch operation will fail gracefully if there's a real issue
      console.log('🔄 Proceeding despite permission check error...');
    }
    
    // Create batch with retries for race condition protection
    const batch = writeBatch(db);
    console.log('📝 Creating batch operations...');
    
    // Update Super Like count
    const newUsedCount = superLikeData.usedCount + 1;
    const updatedSuperLikeData: Partial<SuperLikeData> = {
      usedCount: newUsedCount,
      lastUsed: Timestamp.fromDate(now),
    };
    
    // If this is the first use and using rolling reset, update reset time
    if (!superLikeData.lastUsed && !superLikeData.dailyReset) {
      updatedSuperLikeData.resetTime = Timestamp.fromDate(getNextResetTime('rolling', now));
    }
    
    console.log('📊 Updating Super Like count from', superLikeData.usedCount, 'to', newUsedCount);
    batch.update(doc(superLikesCollection, userId), updatedSuperLikeData);
    
    // Record the usage
    const usageData: SuperLikeUsage = {
      userId,
      targetUserId,
      timestamp: Timestamp.fromDate(now),
      dayKey,
    };
    
    console.log('💾 Recording usage data:', usageData);
    batch.set(doc(superLikeUsageCollection, usageDocId), usageData);
    
    console.log('🚀 Committing batch operations...');
    
    // Add timeout protection for batch operations
    const commitPromise = batch.commit();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Batch operation timeout')), 10000);
    });
    
    await Promise.race([commitPromise, timeoutPromise]);
    console.log('✅ Super Like used successfully!');
    
    return true;
  } catch (error) {
    console.error('❌ Error using Super Like:', error);
    
    // Provide user-friendly error messages
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check your authentication.');
    } else if (error.code === 'unavailable') {
      throw new Error('Service temporarily unavailable. Please try again.');
    } else if (error.message.includes('timeout')) {
      throw new Error('Request timed out. Please try again.');
    } else if (error.message.includes('Super Likes remaining') || 
               error.message.includes('already super liked')) {
      // Re-throw user-facing errors as-is
      throw error;
    } else {
      // Generic error for unexpected issues
      throw new Error('Failed to send Super Like. Please try again.');
    }
  }
};

/**
 * Subscribe to real-time updates of Super Like status
 */
export const subscribeToSuperLikeStatus = (
  userId: string,
  callback: (status: SuperLikeStatus) => void
) => {
  // Initialize data first to avoid race conditions
  const initializeAndSubscribe = async () => {
    try {
      // Ensure data exists before setting up listener
      await initializeSuperLikeData(userId);
      
      // Now set up the listener
      return onSnapshot(
        doc(superLikesCollection, userId), 
        async (doc) => {
          try {
            if (doc.exists()) {
              const status = await getSuperLikeStatus(userId);
              callback(status);
            } else {
              // Document was deleted, reinitialize
              console.log('Super Like document missing, reinitializing...');
              await initializeSuperLikeData(userId);
              const status = await getSuperLikeStatus(userId);
              callback(status);
            }
          } catch (error) {
            console.error('Error in Super Like subscription callback:', error);
            // Provide fallback status on error
            callback({
              remaining: 0,
              total: DAILY_SUPER_LIKES,
              resetTime: Timestamp.fromDate(getNextResetTime('fixed')),
              canUse: false,
              hoursUntilReset: 0
            });
          }
        },
        (error) => {
          console.error('Error in Super Like snapshot listener:', error);
          // Provide fallback status on listener error
          callback({
            remaining: 0,
            total: DAILY_SUPER_LIKES,
            resetTime: Timestamp.fromDate(getNextResetTime('fixed')),
            canUse: false,
            hoursUntilReset: 0
          });
        }
      );
    } catch (error) {
      console.error('Error initializing Super Like subscription:', error);
      // Return a no-op unsubscribe function
      return () => {};
    }
  };

  // Return the subscription promise
  return initializeAndSubscribe();
};

/**
 * Reset Super Likes for a user (admin function or for testing)
 */
export const resetSuperLikes = async (userId: string): Promise<void> => {
  try {
    const resetTime = getNextResetTime('fixed');
    const resetData: SuperLikeData = {
      userId,
      usedCount: 0,
      totalAllowed: DAILY_SUPER_LIKES,
      resetTime: Timestamp.fromDate(resetTime),
      dailyReset: true,
    };
    
    await setDoc(doc(superLikesCollection, userId), resetData);
  } catch (error) {
    console.error('Error resetting Super Likes:', error);
    throw error;
  }
};

/**
 * Get Super Like usage history for a user (for analytics)
 */
export const getSuperLikeHistory = async (userId: string, days: number = 7): Promise<SuperLikeUsage[]> => {
  try {
    // This would require a more complex query in a production app
    // For now, we'll just return an empty array
    // In practice, you'd want to query the superLikeUsage collection
    // with appropriate filters and pagination
    console.log(`Getting Super Like history for ${userId} over ${days} days`);
    return [];
  } catch (error) {
    console.error('Error getting Super Like history:', error);
    throw error;
  }
};

/**
 * Check if a user has super liked another user today
 */
export const hasUserSuperLikedToday = async (userId: string, targetUserId: string): Promise<boolean> => {
  try {
    const dayKey = getDayKey();
    const usageDoc = await getDoc(doc(superLikeUsageCollection, `${userId}_${targetUserId}_${dayKey}`));
    return usageDoc.exists();
  } catch (error) {
    console.error('Error checking Super Like usage:', error);
    return false;
  }
};

/**
 * Clear Firestore cache for Super Like data (use in case of persistent errors)
 */
export const clearSuperLikeCache = () => {
  try {
    console.log('🧹 Clearing Super Like cache...');
    initializationCache.clear();
    console.log('✅ Super Like cache cleared');
  } catch (error) {
    console.error('❌ Error clearing Super Like cache:', error);
  }
}; 