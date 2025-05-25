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
import { getUserPreferences } from './preferencesService';
import { UserProfile } from '@/types';
import { useSuperLike, getSuperLikeStatus } from './superLikeService';

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
    // If this is a super like, check and consume the super like first
    if (action === 'superlike') {
      try {
        await useSuperLike(userId, targetUserId);
      } catch (error) {
        // Re-throw the error with a more user-friendly message
        const errorObj = error as any;
        throw new Error(`Cannot super like: ${errorObj?.message || 'Unknown error'}`);
      }
    }
    
    // Create a unique ID for this swipe combination
    // We'll use a consistent format so we can easily check for mutual likes
    const swipeId = `${userId}_${targetUserId}`;
    
    // Record the swipe in Firestore
    console.log('📝 Recording swipe with data:', {
      swipeId,
      userId,
      targetUserId,
      action
    });
    
    try {
      await setDoc(doc(swipesCollection, swipeId), {
        userId,
        targetUserId,
        action,
        timestamp: serverTimestamp()
      });
      console.log('✅ Swipe recorded successfully');
    } catch (swipeError) {
      console.error('❌ Error recording swipe document:', swipeError);
      const errorObj = swipeError as any;
      throw new Error(`Failed to record swipe: ${errorObj?.message || 'Unknown error'}`);
    }
    
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
      console.log('🎯 Creating match document:', matchData);
      try {
        await setDoc(matchRef, matchData);
        console.log('✅ Match document created successfully');
      } catch (matchError) {
        console.error('❌ Error creating match document:', matchError);
        const errorObj = matchError as any;
        throw new Error(`Failed to create match: ${errorObj?.message || 'Unknown error'}`);
      }
      
      // Update both users' documents to include this match
      console.log('📊 Updating user documents with match ID:', matchRef.id);
      try {
        const batch = writeBatch(db);
        
        batch.update(doc(usersCollection, userId), {
          matches: arrayUnion(matchRef.id)
        });
        
        batch.update(doc(usersCollection, targetUserId), {
          matches: arrayUnion(matchRef.id)
        });
        
        await batch.commit();
        console.log('✅ User documents updated successfully');
      } catch (batchError) {
        console.error('❌ Error updating user documents:', batchError);
        // Don't throw here as the match was already created
        console.log('⚠️ Match created but user documents not updated');
      }
      
      // Call the cloud function to handle match notification
      // This will be implemented on the server side
      console.log('📢 Calling match notification function');
      try {
        const functions = getFunctions();
        const notifyMatch = httpsCallable(functions, 'notifyMatch');
        await notifyMatch({ matchId: matchRef.id });
        console.log('✅ Match notification sent successfully');
      } catch (notificationError) {
        console.error('❌ Error sending match notification:', notificationError);
        // Don't throw here as the match was already created
        console.log('⚠️ Match created but notification failed');
      }
      
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

/**
 * Fetch potential matches for a user based on their preferences
 * @param userId The ID of the user seeking matches
 * @returns Promise resolving with potential matches
 */
export const getPotentialMatchesWithPreferences = async (userId: string): Promise<UserProfile[]> => {
  try {
    // Import geo utilities
    const { filterByDistance, getCurrentUserLocation, calculateDistance } = require('../utils/geoUtils');
    
    // Get the user's preferences
    const preferences = await getUserPreferences(userId);
    
    // Get users the current user has already swiped on
    const swipedUserIds = await getSwipedUsers(userId);
    
    // Get current user's location
    const currentUserDoc = await getDoc(doc(db, 'users', userId));
    let currentUserLocation = null;
    
    if (currentUserDoc.exists()) {
      const userData = currentUserDoc.data();
      if (userData.location) {
        currentUserLocation = userData.location;
      } else if (userData.coordinates) {
        // Handle GeoPoint format
        currentUserLocation = {
          latitude: userData.coordinates.latitude,
          longitude: userData.coordinates.longitude
        };
      }
    }
    
    // If we can't get user's location from database, try to get current location
    if (!currentUserLocation) {
      currentUserLocation = await getCurrentUserLocation();
    }
    
    // Get all users from the users collection
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    const potentialMatches: UserProfile[] = [];
    
    // Process each user document
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      
      // Skip the current user
      if (doc.id === userId) {
        return;
      }
      
      // Skip users already swiped on
      if (swipedUserIds.includes(doc.id)) {
        return;
      }
      
      // Extract user location from database
      let userLocation = null;
      if (userData.location) {
        userLocation = userData.location;
      } else if (userData.coordinates) {
        // Handle GeoPoint format
        userLocation = {
          latitude: userData.coordinates.latitude,
          longitude: userData.coordinates.longitude
        };
      }
      
      // Create a UserProfile object
      const userProfile: UserProfile = {
        id: doc.id,
        displayName: userData.displayName || userData.name || 'User',
        age: userData.age || 25,
        bio: userData.bio || 'No bio available',
        images: userData.images || userData.photos || (userData.photoURL ? [userData.photoURL] : []),
        interests: userData.interests || [],
        gender: userData.gender || 'Not specified',
        workoutFrequency: userData.workoutFrequency || 'Not specified',
        location: userLocation,
        gymCheckIns: userData.gymCheckIns || 0,
      };
      
      // Apply preferences filtering if preferences exist
      if (preferences) {
        // Age filter
        if (preferences.ageRange && userProfile.age) {
          if (userProfile.age < preferences.ageRange.min || userProfile.age > preferences.ageRange.max) {
            return; // Skip this profile
          }
        }
        
        // Gender filter
        if (preferences.genderPreference && preferences.genderPreference !== 'all' && userProfile.gender) {
          if (!preferences.genderPreference.includes(userProfile.gender)) {
            return; // Skip this profile
          }
        }
        
        // Workout frequency filter
        if (preferences.workoutFrequencyPreference && 
            !preferences.workoutFrequencyPreference.includes('All') && 
            userProfile.workoutFrequency) {
          if (!preferences.workoutFrequencyPreference.includes(userProfile.workoutFrequency)) {
            return; // Skip this profile
          }
        }
      }
      
      // Add matching profile to results
      potentialMatches.push(userProfile);
    });
    
    // Apply location-based filtering if we have current user's location and preferences
    let locationFilteredMatches = potentialMatches;
    
    if (currentUserLocation && preferences && preferences.maxDistance) {
      // Filter profiles that have location data and are within distance preference
      const profilesWithLocation = potentialMatches.filter(profile => profile.location);
      
      if (profilesWithLocation.length > 0) {
        // Calculate distance for each profile and filter by max distance
        locationFilteredMatches = profilesWithLocation
          .map(profile => ({
            ...profile,
            distance: calculateDistance(currentUserLocation, profile.location!)
          }))
          .filter(profile => profile.distance <= preferences.maxDistance!)
          .sort((a, b) => a.distance - b.distance); // Sort by distance (nearest first)
      }
      
      console.log(`Filtered ${potentialMatches.length} profiles to ${locationFilteredMatches.length} within ${preferences.maxDistance}km`);
    } else {
      // If no location data available, add default distance to profiles for UI consistency
      locationFilteredMatches = potentialMatches.map(profile => ({
        ...profile,
        distance: typeof profile.location === 'object' ? calculateDistance(currentUserLocation, profile.location) : undefined
      }));
      
      console.log(`No location filtering applied. Found ${potentialMatches.length} potential matches for user ${userId}`);
    }
    
    return locationFilteredMatches;
  } catch (error) {
    console.error('Error getting potential matches with preferences:', error);
    throw error;
  }
}; 