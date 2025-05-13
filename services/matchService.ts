import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  arrayUnion, 
  serverTimestamp, 
  Timestamp,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { 
  getMessaging, 
  getToken, 
  onMessage 
} from 'firebase/messaging';
import { db } from '../utils/firebase';

// Types for our matching system
export interface Swipe {
  userId: string;
  targetUserId: string;
  action: 'like' | 'pass' | 'superlike';
  timestamp: Timestamp;
}

export interface Match {
  id: string;
  users: string[];
  status: 'active' | 'unmatched';
  createdAt: Timestamp;
  lastInteractionAt: Timestamp;
  initiatedBy: string;
}

// Collection references
const swipesCollection = collection(db, 'swipes');
const matchesCollection = collection(db, 'matches');
const usersCollection = collection(db, 'users');

/**
 * Records a user's swipe action (like or pass) on another user
 * @param userId The ID of the user performing the swipe
 * @param targetUserId The ID of the user being swiped on
 * @param action The swipe action ('like', 'pass', or 'superlike')
 * @returns A Promise that resolves with match data if a match occurs, or null if no match
 */
export const recordSwipe = async (
  userId: string, 
  targetUserId: string, 
  action: 'like' | 'pass' | 'superlike'
): Promise<Match | null> => {
  try {
    // Create a unique ID for this swipe combination
    // We'll use a consistent format so we can easily check for mutual likes
    const swipeId = `${userId}_${targetUserId}`;
    
    // Record the swipe in Firestore
    await setDoc(doc(swipesCollection, swipeId), {
      userId,
      targetUserId,
      action,
      timestamp: serverTimestamp()
    });
    
    // If this was a pass, we're done
    if (action === 'pass') {
      return null;
    }
    
    // Check if there's a mutual like (the other user has already liked this user)
    // For that we need to check the reverse swipe ID
    const reverseSwipeId = `${targetUserId}_${userId}`;
    const reverseSwipeDoc = await getDoc(doc(swipesCollection, reverseSwipeId));
    
    // If the other user has also liked this user, create a match
    if (reverseSwipeDoc.exists() && 
        (reverseSwipeDoc.data().action === 'like' || 
         reverseSwipeDoc.data().action === 'superlike')) {
      
      // Create a new match document
      const matchRef = doc(matchesCollection);
      const matchData: Match = {
        id: matchRef.id,
        users: [userId, targetUserId],
        status: 'active',
        createdAt: Timestamp.now(),
        lastInteractionAt: Timestamp.now(),
        initiatedBy: userId,
      };
      
      // Save the match to Firestore
      await setDoc(matchRef, matchData);
      
      // Update both users' documents to include this match
      const batch = writeBatch(db);
      
      batch.update(doc(usersCollection, userId), {
        matches: arrayUnion(matchRef.id)
      });
      
      batch.update(doc(usersCollection, targetUserId), {
        matches: arrayUnion(matchRef.id)
      });
      
      await batch.commit();
      
      // Call the cloud function to handle match notification
      // This will be implemented on the server side
      const functions = getFunctions();
      const notifyMatch = httpsCallable(functions, 'notifyMatch');
      await notifyMatch({ matchId: matchRef.id });
      
      return matchData;
    }
    
    // No match yet
    return null;
  } catch (error) {
    console.error('Error recording swipe:', error);
    throw error;
  }
};

/**
 * Get all matches for a user
 * @param userId The ID of the user
 * @returns A Promise that resolves with an array of Match objects
 */
export const getUserMatches = async (userId: string): Promise<Match[]> => {
  try {
    // Create a query against the matches collection
    const q = query(
      matchesCollection,
      where('users', 'array-contains', userId),
      where('status', '==', 'active')
    );
    
    const querySnapshot = await getDocs(q);
    const matches: Match[] = [];
    
    querySnapshot.forEach((doc) => {
      matches.push({ id: doc.id, ...doc.data() } as Match);
    });
    
    return matches;
  } catch (error) {
    console.error('Error getting user matches:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates of a user's matches
 * @param userId The ID of the user
 * @param callback The function to call with updated matches data
 * @returns An unsubscribe function
 */
export const subscribeToUserMatches = (
  userId: string,
  callback: (matches: Match[]) => void
) => {
  const q = query(
    matchesCollection,
    where('users', 'array-contains', userId),
    where('status', '==', 'active')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const matches: Match[] = [];
    querySnapshot.forEach((doc) => {
      matches.push({ id: doc.id, ...doc.data() } as Match);
    });
    callback(matches);
  });
};

/**
 * Unmatch from another user
 * @param matchId The ID of the match to end
 * @returns A Promise that resolves when the unmatch is complete
 */
export const unmatch = async (matchId: string): Promise<void> => {
  try {
    // Update the match status to unmatched
    await updateDoc(doc(matchesCollection, matchId), {
      status: 'unmatched',
      lastInteractionAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error unmatching:', error);
    throw error;
  }
};

/**
 * Get a list of users that the current user has already swiped on
 * This is useful to filter out profiles the user has already seen
 * @param userId The ID of the user
 * @returns A Promise that resolves with an array of user IDs
 */
export const getSwipedUsers = async (userId: string): Promise<string[]> => {
  try {
    const q = query(
      swipesCollection,
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const swipedUserIds: string[] = [];
    
    querySnapshot.forEach((doc) => {
      swipedUserIds.push(doc.data().targetUserId);
    });
    
    return swipedUserIds;
  } catch (error) {
    console.error('Error getting swiped users:', error);
    throw error;
  }
};

/**
 * Register the current device for push notifications
 * @returns A Promise that resolves with the FCM token or null if unavailable
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    // Check if Firebase messaging is available in this environment
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.log('Push notifications not supported in this environment');
      return null;
    }
    
    try {
      const messaging = getMessaging();
      
      // Some environments might not support FCM properly
      if (!messaging) {
        console.log('Firebase messaging is not available');
        return null;
      }
      
      const token = await getToken(messaging);
      
      // Store the token in the user's document
      const currentUser = getAuth().currentUser;
      if (currentUser && token) {
        await updateDoc(doc(usersCollection, currentUser.uid), {
          fcmTokens: arrayUnion(token)
        });
        
        // Set up message handler
        try {
          onMessage(messaging, (payload) => {
            console.log('Message received:', payload);
            // Handle the message in the app
          });
        } catch (msgError) {
          console.log('Error setting up message handler:', msgError);
        }
        
        return token;
      }
      
      return null;
    } catch (innerError) {
      console.log('Push notification initialization error:', innerError);
      return null;
    }
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    // Don't throw, just return null as this is not critical functionality
    return null;
  }
}; 