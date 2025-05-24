import { 
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
  writeBatch
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, conversationsRef, typingIndicatorsRef } from './config';
import { Message, Conversation, TypingIndicator } from '@/types';
import { v4 as uuidv4 } from 'uuid';

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
  let unsubscribeFunc: (() => void) | null = null;

  try {
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTimestamp', 'desc')
    );
    
    // Add a small delay before setting up the subscription
    // This helps prevent "Target ID already exists" errors
    setTimeout(() => {
      try {
        unsubscribeFunc = onSnapshot(q, (querySnapshot) => {
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
      } catch (subscriptionError) {
        console.error('Error setting up conversations subscription:', subscriptionError);
        if (errorCallback) {
          errorCallback(subscriptionError);
        }
      }
    }, 1000);
  } catch (error) {
    console.error('Error setting up conversations subscription:', error);
    if (errorCallback) {
      errorCallback(error);
    }
  }

  // Return a function that will unsubscribe if the subscription was successful
  return () => {
    if (unsubscribeFunc) {
      unsubscribeFunc();
    }
  };
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
  let unsubscribeFunc: (() => void) | null = null;

  try {
    const q = query(
      collection(db, `conversations/${conversationId}/messages`),
      orderBy('timestamp', 'asc')
    );
    
    // Add a small delay before setting up the subscription
    // This helps prevent "Target ID already exists" errors
    setTimeout(() => {
      try {
        unsubscribeFunc = onSnapshot(q, (querySnapshot) => {
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
      } catch (subscriptionError) {
        console.error('Error setting up messages subscription:', subscriptionError);
      }
    }, 1000);
  } catch (error) {
    console.error('Error setting up messages subscription:', error);
  }

  // Return a function that will unsubscribe if the subscription was successful
  return () => {
    if (unsubscribeFunc) {
      unsubscribeFunc();
    }
  };
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
    // Instead of using a compound query with != and ==, which requires a specific index,
    // we'll first get all unread messages, then filter them client-side
    const q = query(
      collection(db, `conversations/${conversationId}/messages`),
      where('read', '==', false)
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
      
      // Re-throw other errors
      throw error;
    }
    
    // Filter messages client-side to only include those not sent by the current user
    const messagesToUpdate = querySnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.sender !== userId;
    });
    
    if (messagesToUpdate.length === 0) {
      return; // No messages to update
    }
    
    const batch = writeBatch(db);
    
    messagesToUpdate.forEach(document => {
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
  let unsubscribeFunc: (() => void) | null = null;

  try {
    const q = query(
      typingIndicatorsRef,
      where('conversationId', '==', conversationId),
      where('userId', '!=', currentUserId)
    );
    
    // Add a small delay before setting up the subscription
    // This helps prevent "Target ID already exists" errors
    setTimeout(() => {
      try {
        unsubscribeFunc = onSnapshot(q, (querySnapshot) => {
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
      } catch (subscriptionError) {
        console.error('Error setting up typing indicator subscription:', subscriptionError);
      }
    }, 1000);
  } catch (error) {
    console.error('Error setting up typing indicator subscription:', error);
  }
  
  // Return a function that will unsubscribe if the subscription was successful
  return () => {
    if (unsubscribeFunc) {
      unsubscribeFunc();
    }
  };
}; 