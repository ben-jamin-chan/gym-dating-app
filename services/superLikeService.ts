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
import { Platform } from 'react-native';
import { db } from '../utils/firebase';
import { checkNetworkStatus } from '../utils/networkUtilsLite';

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

// Platform-specific timeouts (Android needs longer timeouts)
const OPERATION_TIMEOUT = Platform.OS === 'android' ? 12000 : 8000;
const RETRY_DELAY = Platform.OS === 'android' ? 2000 : 1000;
const MAX_RETRIES = Platform.OS === 'android' ? 3 : 2;

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

/**
 * Create a timeout promise for operations
 */
const createTimeoutPromise = (timeoutMs: number = OPERATION_TIMEOUT) => {
  return new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
};

/**
 * Retry function with exponential backoff
 */
const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = RETRY_DELAY
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} for Super Like operation`);
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Attempt ${attempt} failed:`, error);
      
      // Don't retry on certain error types
      const errorCode = (error as any)?.code;
      if (errorCode === 'permission-denied' || errorCode === 'not-found') {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
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

  const initPromise = retryOperation(async () => {
    try {
      console.log('🏗️ Initializing Super Like data for user:', userId);
      console.log('📱 Platform:', Platform.OS);
      
      // Create timeout-protected operation
      const operation = async () => {
        const superLikeDoc = await getDoc(doc(superLikesCollection, userId));
        
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
            await setDoc(doc(superLikesCollection, userId), updatedData);
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
          await setDoc(doc(superLikesCollection, userId), newData);
          console.log('✅ New Super Like data created successfully');
          return newData;
        }
      };
      
      // Race operation against timeout
      return await Promise.race([operation(), createTimeoutPromise()]);
      
    } catch (error) {
      console.error('❌ Error initializing Super Like data:', error);
      console.error('📱 Platform:', Platform.OS);
      
      // Provide better error messages based on platform and error type
      const errorObj = error as any;
      if (errorObj?.code === 'permission-denied') {
        throw new Error('Permission denied accessing Super Like data');
      } else if (errorObj?.code === 'unavailable') {
        throw new Error('Super Like service temporarily unavailable');
      } else if (errorObj?.message?.includes('timeout')) {
        throw new Error(`Super Like initialization timed out (${Platform.OS})`);
      } else if (Platform.OS === 'android' && errorObj?.code === 'failed-precondition') {
        throw new Error('Android Firebase connection issue - please check your internet connection');
      } else {
        throw new Error(`Failed to initialize Super Like data on ${Platform.OS}`);
      }
    }
  });

  // Cache the promise to prevent multiple concurrent initializations
  initializationCache.set(userId, initPromise);
  
  try {
    const result = await initPromise;
    return result;
  } finally {
    // Clear cache after completion or error
    initializationCache.delete(userId);
  }
};

/**
 * Get current Super Like status for a user
 */
export const getSuperLikeStatus = async (userId: string): Promise<SuperLikeStatus> => {
  try {
    // Check network status first
    const isOnline = await checkNetworkStatus();
    
    if (!isOnline) {
      console.log('📱 Device is offline, returning optimistic Super Like status');
      const fallbackResetTime = getNextResetTime('fixed');
      const now = new Date();
      const msUntilReset = fallbackResetTime.getTime() - now.getTime();
      const hoursUntilReset = Math.max(0, Math.ceil(msUntilReset / (1000 * 60 * 60)));
      
      return {
        remaining: DAILY_SUPER_LIKES, // Assume full count when offline
        total: DAILY_SUPER_LIKES,
        resetTime: Timestamp.fromDate(fallbackResetTime),
        canUse: true, // Allow optimistic usage when offline
        hoursUntilReset,
      };
    }
    
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
    
    const errorObj = error as any;
    
    // For offline errors, return a more informative fallback status
    if (errorObj?.code === 'unavailable' || errorObj?.message?.includes('offline')) {
      console.log('📱 Device appears to be offline, returning cached/default status');
      
      // Try to return a reasonable default rather than completely failing
      const fallbackResetTime = getNextResetTime('fixed');
      const now = new Date();
      const msUntilReset = fallbackResetTime.getTime() - now.getTime();
      const hoursUntilReset = Math.max(0, Math.ceil(msUntilReset / (1000 * 60 * 60)));
      
      return {
        remaining: DAILY_SUPER_LIKES, // Assume full count when offline
        total: DAILY_SUPER_LIKES,
        resetTime: Timestamp.fromDate(fallbackResetTime),
        canUse: true, // Allow optimistic usage when offline
        hoursUntilReset,
      };
    }
    
    // For other errors, return a safe fallback status
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
  console.log('📱 Platform:', Platform.OS);
  
  // Check network status first
  try {
    const isOnline = await checkNetworkStatus();
    if (!isOnline) {
      console.log('📱 Device is offline, cannot send Super Like');
      throw new Error('You are currently offline. Please check your internet connection and try again.');
    }
  } catch (networkError) {
    console.warn('Could not check network status:', networkError);
    // Continue with the operation even if network check fails
  }
  
  return await retryOperation(async () => {
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
        const operation = async () => {
          const existingUsageDoc = await getDoc(doc(superLikeUsageCollection, usageDocId));
          console.log('📄 Usage document check result:', {
            exists: existingUsageDoc.exists(),
            docId: usageDocId,
            platform: Platform.OS
          });
          
          if (existingUsageDoc.exists()) {
            console.log('❌ Already super liked this person today');
            throw new Error('You have already super liked this person today');
          }
          
          console.log('✅ No existing usage found, proceeding with Super Like');
        };
        
        await Promise.race([operation(), createTimeoutPromise()]);
      } catch (permissionError) {
        console.error('⚠️ Permission error checking usage document:', permissionError);
        
        // If we get a permission error just checking existence, 
        // it might be due to rules, but we should still allow the super like
        // The batch operation will fail gracefully if there's a real issue
        console.log('🔄 Proceeding despite permission check error...');
      }
      
      // Create batch with Android-specific timeout handling
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
      
      // Use platform-specific timeout for batch operations
      const batchTimeout = Platform.OS === 'android' ? 15000 : 10000;
      const batchOperation = async () => await batch.commit();
      
      await Promise.race([batchOperation(), createTimeoutPromise(batchTimeout)]);
      console.log('✅ Super Like used successfully!');
      
      return true;
    } catch (error) {
      console.error('❌ Error using Super Like:', error);
      console.error('📱 Platform:', Platform.OS);
      
      // Provide platform-specific and user-friendly error messages
      const errorObj = error as any;
      if (errorObj?.code === 'permission-denied') {
        throw new Error('Permission denied. Please check your authentication.');
      } else if (errorObj?.code === 'unavailable') {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else if (errorObj?.code === 'failed-precondition' && Platform.OS === 'android') {
        throw new Error('Android connection issue. Please check your internet connection and try again.');
      } else if (errorObj?.message?.includes('timeout')) {
        throw new Error(`Request timed out on ${Platform.OS}. Please try again.`);
      } else if (errorObj?.message?.includes('Super Likes remaining') || 
                 errorObj?.message?.includes('already super liked') ||
                 errorObj?.message?.includes('offline')) {
        // Re-throw user-facing errors as-is
        throw error;
      } else {
        // Generic error for unexpected issues with platform info
        throw new Error(`Failed to send Super Like on ${Platform.OS}. Please try again.`);
      }
    }
  });
};

/**
 * Subscribe to real-time updates of Super Like status
 */
export const subscribeToSuperLikeStatus = (
  userId: string,
  callback: (status: SuperLikeStatus) => void
) => {
  let unsubscribeFunction: (() => void) | null = null;

  // Initialize data first to avoid race conditions
  const initializeAndSubscribe = async () => {
    try {
      // Ensure data exists before setting up listener
      await initializeSuperLikeData(userId);
      
      // Clear any existing subscription first to prevent conflicts
      if (unsubscribeFunction) {
        unsubscribeFunction();
        unsubscribeFunction = null;
      }
      
      // Now set up the listener
      unsubscribeFunction = onSnapshot(
        doc(superLikesCollection, userId), 
        async (docSnapshot) => {
          try {
            if (docSnapshot.exists()) {
              // Force refresh the status instead of using cached data
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
            
            // Provide better fallback status based on error type
            const errorObj = error as any;
            const fallbackResetTime = getNextResetTime('fixed');
            const now = new Date();
            const msUntilReset = fallbackResetTime.getTime() - now.getTime();
            const hoursUntilReset = Math.max(0, Math.ceil(msUntilReset / (1000 * 60 * 60)));
            
            if (errorObj?.code === 'unavailable' || errorObj?.message?.includes('offline')) {
              // Offline fallback - be optimistic
              callback({
                remaining: DAILY_SUPER_LIKES,
                total: DAILY_SUPER_LIKES,
                resetTime: Timestamp.fromDate(fallbackResetTime),
                canUse: true,
                hoursUntilReset
              });
            } else {
              // Other errors - be conservative
              callback({
                remaining: 0,
                total: DAILY_SUPER_LIKES,
                resetTime: Timestamp.fromDate(fallbackResetTime),
                canUse: false,
                hoursUntilReset: 0
              });
            }
          }
        },
        (error) => {
          console.error('Error in Super Like snapshot listener:', error);
          
          // Handle subscription errors more gracefully
          const errorObj = error as any;
          
          // If we get a "Target ID already exists" error, try to re-establish the subscription
          if (errorObj?.code === 'already-exists') {
            console.log('🔄 Subscription conflict detected, retrying in 2 seconds...');
            setTimeout(() => {
              initializeAndSubscribe();
            }, 2000);
            return;
          }
          
          // Provide fallback status on listener error
          const fallbackResetTime = getNextResetTime('fixed');
          const now = new Date();
          const msUntilReset = fallbackResetTime.getTime() - now.getTime();
          const hoursUntilReset = Math.max(0, Math.ceil(msUntilReset / (1000 * 60 * 60)));
          
          if (errorObj?.code === 'unavailable' || errorObj?.message?.includes('offline')) {
            // Offline fallback
            callback({
              remaining: DAILY_SUPER_LIKES,
              total: DAILY_SUPER_LIKES,
              resetTime: Timestamp.fromDate(fallbackResetTime),
              canUse: true,
              hoursUntilReset
            });
          } else {
            // Other errors
            callback({
              remaining: 0,
              total: DAILY_SUPER_LIKES,
              resetTime: Timestamp.fromDate(fallbackResetTime),
              canUse: false,
              hoursUntilReset: 0
            });
          }
        }
      );
      
      // Return the actual unsubscribe function
      return () => {
        if (unsubscribeFunction) {
          unsubscribeFunction();
          unsubscribeFunction = null;
        }
      };
      
    } catch (error) {
      console.error('Error initializing Super Like subscription:', error);
      
      // Provide initial fallback status
      const errorObj = error as any;
      const fallbackResetTime = getNextResetTime('fixed');
      const now = new Date();
      const msUntilReset = fallbackResetTime.getTime() - now.getTime();
      const hoursUntilReset = Math.max(0, Math.ceil(msUntilReset / (1000 * 60 * 60)));
      
      if (errorObj?.code === 'unavailable' || errorObj?.message?.includes('offline')) {
        // Offline fallback
        callback({
          remaining: DAILY_SUPER_LIKES,
          total: DAILY_SUPER_LIKES,
          resetTime: Timestamp.fromDate(fallbackResetTime),
          canUse: true,
          hoursUntilReset
        });
      } else {
        // Other errors
        callback({
          remaining: 0,
          total: DAILY_SUPER_LIKES,
          resetTime: Timestamp.fromDate(fallbackResetTime),
          canUse: false,
          hoursUntilReset: 0
        });
      }
      
      // Return a no-op unsubscribe function
      return () => {};
    }
  };

  // Return the subscription promise
  return initializeAndSubscribe();
};

/**
 * Force refresh Super Like data (useful after network reconnection)
 */
export const refreshSuperLikeData = async (userId: string): Promise<SuperLikeStatus> => {
  console.log('🔄 Forcing Super Like data refresh for user:', userId);
  
  // Clear any cached data
  clearSuperLikeCache();
  
  try {
    // Force re-initialize the data
    const superLikeData = await initializeSuperLikeData(userId);
    console.log('✅ Super Like data refreshed:', superLikeData);
    
    // Return fresh status
    return await getSuperLikeStatus(userId);
  } catch (error) {
    console.error('❌ Failed to refresh Super Like data:', error);
    throw error;
  }
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