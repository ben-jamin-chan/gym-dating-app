import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '@/types';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './config';
import { v4 as uuidv4 } from 'uuid';

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
        // Instead of importing sendMessage, implement it directly to avoid circular dependencies
        const messageId = uuidv4();
        const conversationId = message.conversationId;
        
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