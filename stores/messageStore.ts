import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '@/types';
import { 
  sendMessage as sendMessageToFirebase,
  subscribeToMessages,
  markMessagesAsRead as markMessagesAsReadInFirebase,
  uploadMedia
} from '@/utils/firebase';
import { v4 as uuidv4 } from 'uuid';

interface MessageState {
  // Message data by conversation ID
  messages: Record<string, Message[]>;
  
  // Loading states
  isLoadingMessages: Record<string, boolean>;
  
  // Sending states
  sendingMessages: Record<string, boolean>;
  
  // Subscription management
  _messageSubscriptions: Record<string, () => void>;
  
  // Actions
  fetchMessages: (conversationId: string) => void;
  sendMessage: (message: Omit<Message, 'id'>) => Promise<void>;
  markMessagesAsRead: (conversationId: string, userId: string) => Promise<void>;
  uploadAndSendMediaMessage: (uri: string, conversationId: string, sender: string, type: 'image' | 'gif') => Promise<void>;
  cleanupMessageSubscription: (conversationId: string) => void;
  clearMessages: (conversationId?: string) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  // Initial state
  messages: {},
  isLoadingMessages: {},
  sendingMessages: {},
  _messageSubscriptions: {},

  fetchMessages: (conversationId: string) => {
    // Set loading state
    set(state => ({
      isLoadingMessages: {
        ...state.isLoadingMessages,
        [conversationId]: true
      }
    }));

    // Clean up existing subscription
    const currentSubscriptions = get()._messageSubscriptions;
    if (currentSubscriptions[conversationId]) {
      currentSubscriptions[conversationId]();
      const { [conversationId]: removed, ...rest } = currentSubscriptions;
      set({ _messageSubscriptions: rest });
    }

    // Load cached messages first
    AsyncStorage.getItem(`messages_${conversationId}`)
      .then(data => {
        if (data) {
          const cachedMessages = JSON.parse(data);
          set(state => ({
            messages: {
              ...state.messages,
              [conversationId]: cachedMessages
            },
            isLoadingMessages: {
              ...state.isLoadingMessages,
              [conversationId]: false
            }
          }));
        }
      })
      .catch(error => {
        console.error('Error loading cached messages:', error);
      });

    // Subscribe to real-time updates
    try {
      const unsubscribe = subscribeToMessages(conversationId, (messages) => {
        set(state => ({
          messages: {
            ...state.messages,
            [conversationId]: messages
          },
          isLoadingMessages: {
            ...state.isLoadingMessages,
            [conversationId]: false
          }
        }));

        // Cache messages
        AsyncStorage.setItem(`messages_${conversationId}`, JSON.stringify(messages))
          .catch(error => console.error('Error caching messages:', error));
      });

      // Store subscription
      set(state => ({
        _messageSubscriptions: {
          ...state._messageSubscriptions,
          [conversationId]: unsubscribe
        }
      }));
    } catch (error) {
      console.error('Error subscribing to messages:', error);
      set(state => ({
        isLoadingMessages: {
          ...state.isLoadingMessages,
          [conversationId]: false
        }
      }));
    }
  },

  sendMessage: async (message: Omit<Message, 'id'>) => {
    const { conversationId } = message;
    
    // Set sending state
    set(state => ({
      sendingMessages: {
        ...state.sendingMessages,
        [conversationId]: true
      }
    }));

    try {
      // Create temporary message for optimistic updates
      const tempId = `temp-${uuidv4()}`;
      const tempMessage: Message = {
        id: tempId,
        ...message,
        timestamp: new Date().toISOString(),
        status: 'sending'
      };

      // Add to local state immediately
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: [...(state.messages[conversationId] || []), tempMessage]
        }
      }));

      // Send to Firebase
      const messageId = await sendMessageToFirebase(conversationId, message);

      // Update the message with real ID and sent status
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: state.messages[conversationId]?.map(msg =>
            msg.id === tempId
              ? { ...msg, id: messageId, status: 'sent' }
              : msg
          ) || []
        },
        sendingMessages: {
          ...state.sendingMessages,
          [conversationId]: false
        }
      }));

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Mark message as failed
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: state.messages[conversationId]?.map(msg =>
            msg.status === 'sending'
              ? { ...msg, status: 'failed' }
              : msg
          ) || []
        },
        sendingMessages: {
          ...state.sendingMessages,
          [conversationId]: false
        }
      }));

      throw error;
    }
  },

  markMessagesAsRead: async (conversationId: string, userId: string) => {
    try {
      await markMessagesAsReadInFirebase(conversationId, userId);
      
      // Update local state
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: state.messages[conversationId]?.map(msg =>
            msg.sender !== userId
              ? { ...msg, read: true }
              : msg
          ) || []
        }
      }));
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  },

  uploadAndSendMediaMessage: async (
    uri: string, 
    conversationId: string, 
    sender: string, 
    type: 'image' | 'gif'
  ) => {
    const tempId = `temp-${uuidv4()}`;
    
    try {
      // Create temporary media message
      const tempMessage: Message = {
        id: tempId,
        conversationId,
        sender,
        content: '',
        mediaUrl: uri, // Show local URI first
        mediaType: type,
        timestamp: new Date().toISOString(),
        status: 'uploading'
      };

      // Add to local state immediately
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: [...(state.messages[conversationId] || []), tempMessage]
        }
      }));

      // Upload media and get URL
      const downloadURL = await uploadMedia(uri, conversationId, tempId);

      // Create final message
      const message: Omit<Message, 'id'> = {
        conversationId,
        sender,
        content: '',
        mediaUrl: downloadURL,
        mediaType: type,
        timestamp: new Date().toISOString()
      };

      // Send to Firebase
      const messageId = await sendMessageToFirebase(conversationId, message);

      // Update with final data
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: state.messages[conversationId]?.map(msg =>
            msg.id === tempId
              ? { ...msg, id: messageId, mediaUrl: downloadURL, status: 'sent' }
              : msg
          ) || []
        }
      }));

    } catch (error) {
      console.error('Error uploading and sending media:', error);
      
      // Mark as failed
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: state.messages[conversationId]?.map(msg =>
            msg.id === tempId
              ? { ...msg, status: 'failed' }
              : msg
          ) || []
        }
      }));

      throw error;
    }
  },

  cleanupMessageSubscription: (conversationId: string) => {
    const subscriptions = get()._messageSubscriptions;
    if (subscriptions[conversationId]) {
      subscriptions[conversationId]();
      const { [conversationId]: removed, ...rest } = subscriptions;
      set({ _messageSubscriptions: rest });
    }
  },

  clearMessages: (conversationId?: string) => {
    if (conversationId) {
      // Clear specific conversation
      set(state => {
        const { [conversationId]: removed, ...restMessages } = state.messages;
        const { [conversationId]: removedLoading, ...restLoading } = state.isLoadingMessages;
        const { [conversationId]: removedSending, ...restSending } = state.sendingMessages;
        
        return {
          messages: restMessages,
          isLoadingMessages: restLoading,
          sendingMessages: restSending
        };
      });
      
      // Clear cache
      AsyncStorage.removeItem(`messages_${conversationId}`);
    } else {
      // Clear all
      set({
        messages: {},
        isLoadingMessages: {},
        sendingMessages: {}
      });
      
      // Clear all cached messages
      AsyncStorage.getAllKeys()
        .then(keys => {
          const messageKeys = keys.filter(key => key.startsWith('messages_'));
          return AsyncStorage.multiRemove(messageKeys);
        })
        .catch(error => console.error('Error clearing message cache:', error));
    }
  }
})); 