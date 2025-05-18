import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
// Polyfill random values and URL for Firebase Auth on React Native
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp, 
  Timestamp, 
  writeBatch,
  enableIndexedDbPersistence,
  connectFirestoreEmulator,
  disableNetwork,
  enableNetwork
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  User,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  setPersistence
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Message, Conversation, TypingIndicator } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { checkNetworkStatus, testInternetConnectivity } from './networkUtilsLite';
import { GeoFirestore, GeoCollectionReference } from 'geofirestore';

// Your Firebase configuration
// Note: Replace with actual Firebase config values from your Firebase console
const firebaseConfig = {
  apiKey: "AIzaSyDOYSaYglhkUNDdZmrFUy40oHHjadwfa_U",
  authDomain: "gym-dating-app.firebaseapp.com",
  projectId: "gym-dating-app",
  storageBucket: "gym-dating-app.firebasestorage.app",
  messagingSenderId: "349439736317",
  appId: "1:349439736317:web:1e5d70ab56597853a28194",
  measurementId: "G-9H9Z99TQ7B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize GeoFirestore with the Firestore instance
const geoFirestore = new GeoFirestore(db as any);

// Export Firestore database instance
export { db, geoFirestore };

// Initialize Auth
const auth = getAuth(app);
if (Platform.OS !== 'web') {
  setPersistence(auth, inMemoryPersistence)
    .then(() => console.log('Firebase Auth persistence set to in-memory'))
    .catch(err => console.error('Error setting in-memory auth persistence:', err));
  console.log('Firebase Auth initialized for React Native');
} else {
  setPersistence(auth, indexedDBLocalPersistence)
    .then(() => console.log('Firebase Auth web persistence set to IndexedDB'))
    .catch(err => console.error('Error setting web auth persistence:', err));
  console.log('Firebase Auth initialized for web platform');
}

// Key to store auth data in AsyncStorage
const AUTH_STORAGE_KEY = '@AuthData';

// Helper function to log detailed Firebase errors
const logFirebaseError = (context: string, error: any) => {
  console.error(`${context}: ${error.message}`);
  console.error(`Error code: ${error.code}`);
  console.error(`Error details: ${JSON.stringify(error)}`);
  
  // Log specific network-related errors
  if (error.code === 'auth/network-request-failed') {
    console.error('NETWORK FAILURE: Firebase could not connect to the network');
  }
};

// Check network connectivity before Firebase operations
const checkNetworkBeforeOperation = async () => {
  const isConnected = await checkNetworkStatus();
  if (!isConnected) {
    console.error('Network check failed: Device appears to be offline');
    throw new Error('network_unavailable');
  }
  
  // Test general internet connectivity
  const canReachInternet = await testInternetConnectivity();
  if (!canReachInternet) {
    console.error('Internet connectivity test failed: Cannot reach internet');
    throw new Error('internet_unreachable');
  }
  
  return true;
};

// Function to refresh Firebase connection
// This helps with iOS simulator issues where Firebase WebSockets disconnect
export const refreshFirebaseConnection = async (silent: boolean = false): Promise<boolean> => {
  try {
    if (!silent) {
      console.log('Refreshing Firebase connection...');
    }
    
    // Temporarily disable Firestore network
    await disableNetwork(db);
    if (!silent) {
      console.log('Firebase network disabled temporarily');
    }
    
    // Small delay to ensure the network is fully disabled
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Re-enable Firestore network
    await enableNetwork(db);
    if (!silent) {
      console.log('Firebase network re-enabled');
    }
    
    // Test connection by trying to read a small document
    try {
      const testDoc = await getDoc(doc(db, 'system', 'status'));
      if (!silent) {
        console.log('Firebase connection verified successfully');
      }
    } catch (readError) {
      if (!silent) {
        console.warn('Firebase connection test read failed, but continuing:', readError);
      }
      // We don't throw here as the enableNetwork might still be working
    }
    
    // For Auth - Check if we have stored credentials to potentially refresh the Auth state
    try {
      const authData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (authData) {
        const { email, password } = JSON.parse(authData);
        
        // Only attempt re-auth if we're not already authenticated
        if (!auth.currentUser) {
          if (!silent) {
            console.log('Attempting to refresh Auth connection with stored credentials...');
          }
          
          try {
            // Attempt silent re-authentication
            await signInWithEmailAndPassword(auth, email, password);
            if (!silent) {
              console.log('Auth connection refreshed successfully');
            }
          } catch (authError) {
            if (!silent) {
              console.warn('Auth refresh failed, but Firestore reconnection may still be successful:', authError);
            }
          }
        } else {
          if (!silent) {
            console.log('User already authenticated, skipping Auth refresh');
          }
        }
      } else {
        if (!silent) {
          console.log('No stored credentials found for Auth refresh');
        }
      }
    } catch (authRefreshError) {
      if (!silent) {
        console.warn('Error during Auth refresh attempt:', authRefreshError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error refreshing Firebase connection:', error);
    return false;
  }
};

// Store user credentials after successful login
const storeUserCredentials = async (email: string, password: string) => {
  try {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ email, password }));
    console.log("Credentials stored successfully in AsyncStorage");
  } catch (error) {
    console.error('Error storing credentials:', error);
  }
};

// Clear stored credentials on logout
const clearUserCredentials = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    console.log("Credentials cleared successfully from AsyncStorage");
  } catch (error) {
    console.error('Error clearing credentials:', error);
  }
};

// Check for stored credentials and sign in automatically
const checkAndAutoSignIn = async () => {
  try {
    const authData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (authData) {
      console.log("Found stored credentials, attempting auto sign-in");
      const { email, password } = JSON.parse(authData);
      // Silent sign in on app startup
      await signInWithEmailAndPassword(auth, email, password)
        .then(userCredential => {
          console.log("Auto sign-in successful");
        })
        .catch(error => {
          console.error('Auto sign-in failed, clearing stored credentials:', error);
          clearUserCredentials();
        });
    } else {
      console.log("No stored credentials found");
    }
  } catch (error) {
    console.error('Error checking stored credentials:', error);
  }
};

// For React Native, attempt auto-login with stored credentials
if (Platform.OS !== 'web') {
  // Run the check on initialization
  checkAndAutoSignIn();
}

// Enable offline persistence only on web platform
if (Platform.OS === 'web') {
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log('Offline persistence enabled successfully');
    })
    .catch((error) => {
      console.error('Error enabling offline persistence:', error);
      if (error.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time
        console.warn('Multiple tabs open, persistence only enabled in one tab');
      } else if (error.code === 'unimplemented') {
        // The current browser does not support all of the features required for persistence
        console.warn('Current environment does not support persistence');
      }
    });
} else {
  console.log('Offline persistence not enabled on mobile platform');
}

const storage = getStorage(app);

// Collection references
const conversationsRef = collection(db, 'conversations');
const messagesRef = collection(db, 'messages');
const typingIndicatorsRef = collection(db, 'typingIndicators');
const usersRef = collection(db, 'users');

// Conversation functions
export const getConversations = async (userId: string) => {
  try {
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTimestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Conversation[];
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw error;
  }
};

export const subscribeToConversations = (
  userId: string, 
  callback: (conversations: Conversation[]) => void,
  errorCallback?: (error: any) => void
) => {
  try {
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTimestamp', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const conversations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Conversation[];
      
      callback(conversations);
    }, (error) => {
      console.error('Error subscribing to conversations:', error);
      if (errorCallback) {
        errorCallback(error);
      }
    });
  } catch (error) {
    console.error('Error setting up conversations subscription:', error);
    if (errorCallback) {
      errorCallback(error);
    }
    // Return a no-op unsubscribe function
    return () => {};
  }
};

// Messages functions
export const getMessages = async (conversationId: string) => {
  try {
    const q = query(
      collection(db, `conversations/${conversationId}/messages`),
      orderBy('timestamp', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Message[];
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

export const subscribeToMessages = (conversationId: string, callback: (messages: Message[]) => void) => {
  const q = query(
    collection(db, `conversations/${conversationId}/messages`),
    orderBy('timestamp', 'asc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Message[];
    
    // Store messages in AsyncStorage for offline access
    AsyncStorage.setItem(`messages_${conversationId}`, JSON.stringify(messages))
      .catch(err => console.error('Error caching messages:', err));
    
    callback(messages);
  }, (error) => {
    console.error('Error subscribing to messages:', error);
  });
};

export const sendMessage = async (conversationId: string, message: Omit<Message, 'id'>) => {
  try {
    // Generate a new ID
    const messageId = uuidv4();
    
    // Check if conversation exists first
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);
    
    if (!conversationDoc.exists()) {
      // Create the conversation if it doesn't exist
      await setDoc(conversationRef, {
        id: conversationId,
        participants: ['current-user', message.sender === 'current-user' ? 'other-user' : 'current-user'],
        lastMessageTimestamp: serverTimestamp(),
        lastMessage: {
          text: message.text,
          timestamp: serverTimestamp(),
          read: false
        },
        unreadCount: 0,
        createdAt: serverTimestamp()
      });
      console.log(`Created new conversation: ${conversationId}`);
    }
    
    // Add message to Firestore
    await setDoc(doc(db, `conversations/${conversationId}/messages`, messageId), {
      ...message,
      id: messageId,
      timestamp: serverTimestamp(),
      status: 'sent'
    });
    
    // Update conversation with last message
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: {
        text: message.text,
        timestamp: serverTimestamp(),
        read: false
      },
      lastMessageTimestamp: serverTimestamp()
    });
    
    return messageId;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const markMessagesAsRead = async (conversationId: string, userId: string) => {
  try {
    const q = query(
      collection(db, `conversations/${conversationId}/messages`),
      where('read', '==', false),
      where('sender', '!=', userId)
    );
    
    let querySnapshot;
    try {
      querySnapshot = await getDocs(q); 
    } catch (error: any) {
      // Handle the offline case gracefully
      if (error.message && error.message.includes('client is offline')) {
        console.log('Client is offline, skipping Firebase read operation');
        return; // Exit early, the offline handling in chatStore will take care of UI updates
      }
      
      // Handle missing index error more gracefully
      if (error.message && error.message.includes('requires an index')) {
        console.error('Missing Firebase index for markMessagesAsRead. Please create the required index in Firebase console.');
        console.error('You need to create a composite index on conversations/{conversationId}/messages with fields:');
        console.error('- sender != (Ascending)');
        console.error('- read == (Ascending)');
        
        // Return without throwing to avoid app crash
        return;
      }
      
      throw error; // Re-throw other errors
    }
    
    const batch = writeBatch(db);
    
    querySnapshot.docs.forEach(document => {
      const messageRef = doc(db, `conversations/${conversationId}/messages`, document.id);
      batch.update(messageRef, {
        read: true,
        status: 'read'
      });
    });
    
    // Update conversation's last message read status if needed
    let conversationData;
    try {
      const conversationDoc = await getDoc(doc(db, 'conversations', conversationId));
      conversationData = conversationDoc.data();
    } catch (error: any) {
      // Handle the offline case gracefully
      if (error.message && error.message.includes('client is offline')) {
        console.log('Client is offline, skipping Firebase read operation for conversation');
        return; // Exit early, the offline handling in chatStore will take care of UI updates
      }
      throw error; // Re-throw other errors
    }
    
    if (conversationData && !conversationData.lastMessage.read) {
      batch.update(doc(db, 'conversations', conversationId), {
        'lastMessage.read': true,
        unreadCount: 0
      });
    }
    
    try {
      await batch.commit();
    } catch (error: any) {
      // Handle the offline case gracefully
      if (error.message && error.message.includes('client is offline')) {
        console.log('Client is offline, skipping Firebase batch commit');
        return; // Exit early, the offline handling in chatStore will take care of UI updates
      }
      throw error; // Re-throw other errors
    }
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

// Typing indicators
export const updateTypingStatus = async (
  conversationId: string, 
  userId: string, 
  isTyping: boolean
) => {
  try {
    const typingRef = doc(db, 'typingIndicators', `${conversationId}_${userId}`);
    
    await setDoc(typingRef, {
      userId,
      conversationId,
      isTyping,
      timestamp: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating typing status:', error);
    throw error;
  }
};

export const subscribeToTypingIndicator = (
  conversationId: string, 
  currentUserId: string,
  callback: (typingUsers: string[]) => void
) => {
  try {
    const q = query(
      typingIndicatorsRef,
      where('conversationId', '==', conversationId),
      where('userId', '!=', currentUserId)
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const now = new Date();
      const typingUsers: string[] = [];
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data() as TypingIndicator;
        
        // Only consider typing indicators from the last 10 seconds
        if (data.isTyping) {
          const typingTimestamp = data.timestamp as unknown as Timestamp;
          if (typingTimestamp) {
            const typingDate = typingTimestamp.toDate();
            const diffInSeconds = (now.getTime() - typingDate.getTime()) / 1000;
            
            if (diffInSeconds < 10) {
              typingUsers.push(data.userId);
            }
          } else {
            // If timestamp is not available, consider them typing
            typingUsers.push(data.userId);
          }
        }
      });
      
      callback(typingUsers);
    }, (error) => {
      console.error('Error subscribing to typing indicators:', error);
      
      // Handle missing index error more gracefully
      if (error.message && error.message.includes('requires an index')) {
        console.error('Missing Firebase index for typing indicators. Please create the required index in Firebase console.');
        console.error('You need to create a composite index on typingIndicators with fields:');
        console.error('- conversationId == (Ascending)');
        console.error('- userId != (Ascending)');
        
        // Call the callback with empty array to avoid UI issues
        callback([]);
      }
    });
  } catch (error) {
    console.error('Error setting up typing indicator subscription:', error);
    // Return a no-op unsubscribe function
    return () => {};
  }
};

// Media uploads
export const uploadMedia = async (
  uri: string,
  conversationId: string,
  messageId: string
): Promise<string> => {
  try {
    // Create a blob from the file URI
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, `chat/${conversationId}/${messageId}`);
    await uploadBytes(storageRef, blob);
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw error;
  }
};

// Offline support
export const queueMessageForSending = async (message: Omit<Message, 'id'>) => {
  try {
    // Get existing queue
    const queueJson = await AsyncStorage.getItem('offlineMessageQueue');
    const queue: Omit<Message, 'id'>[] = queueJson ? JSON.parse(queueJson) : [];
    
    // Add message to queue
    queue.push({
      ...message,
      isOfflineQueued: true
    });
    
    // Save updated queue
    await AsyncStorage.setItem('offlineMessageQueue', JSON.stringify(queue));
  } catch (error) {
    console.error('Error queuing message for sending:', error);
    throw error;
  }
};

export const processPendingMessages = async () => {
  try {
    // Get and clear queue
    const queueJson = await AsyncStorage.getItem('offlineMessageQueue');
    if (!queueJson) return;
    
    const queue: Omit<Message, 'id'>[] = JSON.parse(queueJson);
    await AsyncStorage.removeItem('offlineMessageQueue');
    
    // Process each message
    for (const message of queue) {
      try {
        await sendMessage(message.conversationId, {
          ...message,
          isOfflineQueued: false
        });
      } catch (error) {
        console.error('Error sending queued message:', error);
        // Re-queue failed message
        await queueMessageForSending(message);
      }
    }
  } catch (error) {
    console.error('Error processing pending messages:', error);
  }
};

// Authentication functions
export const registerUser = async (email: string, password: string) => {
  try {
    // Try to check network, but don't block registration if check fails
    try {
      await checkNetworkBeforeOperation();
    } catch (error) {
      console.warn('Network check failed, but continuing with registration attempt:', error);
    }
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('User registered successfully:', userCredential.user.uid);
    
    // Create initial user profile in Firestore
    try {
      await saveUserProfile(userCredential.user.uid, {
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || '',
        photoURL: userCredential.user.photoURL || null,
        createdAt: serverTimestamp(),
        // Default profile data
        bio: '',
        age: null,
        workoutFrequency: '',
        interests: [],
        gymCheckIns: 0
      });
      console.log('User profile created in Firestore');
    } catch (profileError) {
      console.error('Error creating user profile in Firestore:', profileError);
      // Continue anyway since the auth account was created
    }
    
    // Store credentials for persistent auth (only on mobile)
    if (Platform.OS !== 'web') {
      await storeUserCredentials(email, password);
    }
    
    return userCredential.user;
  } catch (error: any) {
    logFirebaseError('Error registering user', error);
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    // Try to check network, but don't block login if check fails
    try {
      await checkNetworkBeforeOperation();
    } catch (error) {
      console.warn('Network check failed, but continuing with login attempt:', error);
    }
    
    console.log(`Attempting to log in user: ${email}`);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('Login successful for user:', userCredential.user.uid);
    
    // Store credentials for persistent auth (only on mobile)
    if (Platform.OS !== 'web') {
      await storeUserCredentials(email, password);
    }
    
    return userCredential.user;
  } catch (error: any) {
    logFirebaseError('Error logging in user', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    // Clear stored credentials first (only on mobile)
    if (Platform.OS !== 'web') {
      await clearUserCredentials();
    }
    
    // Then sign out from Firebase
    await signOut(auth);
  } catch (error: any) {
    console.error('Error logging out user:', error);
    throw error;
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Error resetting password:', error);
    throw error;
  }
};

export const updateUserProfile = async (displayName: string, photoURL?: string) => {
  try {
    if (!auth.currentUser) {
      throw new Error('No user is signed in');
    }
    
    // Update Firebase Auth profile with sanitized data
    const authProfileData = {
      displayName,
      photoURL: photoURL === undefined ? null : photoURL
    };
    
    await updateProfile(auth.currentUser, authProfileData);
    
    // Also update the user profile in Firestore
    await saveUserProfile(auth.currentUser.uid, {
      displayName,
      photoURL: photoURL === undefined ? null : photoURL,
      updatedAt: serverTimestamp()
    });
    
    return auth.currentUser;
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

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
