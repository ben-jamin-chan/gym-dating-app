import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Conversation, Message, NetworkStatus } from '@/types';
import { 
  subscribeToConversations, 
  subscribeToMessages, 
  sendMessage as sendMessageToFirebase,
  markMessagesAsRead as markMessagesAsReadInFirebase,
  updateTypingStatus as updateTypingStatusInFirebase,
  subscribeToTypingIndicator,
  queueMessageForSending,
  processPendingMessages,
  uploadMedia
} from './firebase';
import { v4 as uuidv4 } from 'uuid';
import { mockConversations } from './mockData';

// Define the store state
export interface ChatState {
  // Data
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, string[]>;
  networkStatus: NetworkStatus;
  
  // Loading & error states
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  error: string | null;
  
  // Actions
  fetchConversations: (userId: string) => void;
  fetchMessages: (conversationId: string) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  sendMessage: (message: Omit<Message, 'id'>) => Promise<void>;
  markMessagesAsRead: (conversationId: string, userId: string) => Promise<void>;
  updateTypingStatus: (conversationId: string, userId: string, isTyping: boolean) => void;
  updateNetworkStatus: (status: NetworkStatus) => void;
  uploadAndSendMediaMessage: (uri: string, conversationId: string, sender: string, type: 'image' | 'gif') => Promise<void>;
  cleanupSubscribers: (conversationId?: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  conversations: [],
  currentConversation: null,
  messages: {},
  typingUsers: {},
  networkStatus: {
    isConnected: true,
    lastConnected: new Date().toISOString()
  },
  
  isLoadingConversations: false,
  isLoadingMessages: false,
  error: null,
  
  // Actions
  fetchConversations: (userId: string) => {
    set({ isLoadingConversations: true, error: null });
    
    // First, clean up any existing conversation subscribers to prevent duplicate listeners
    const currentUnsubscribers = get()._unsubscribers || {};
    if (currentUnsubscribers.conversations) {
      currentUnsubscribers.conversations();
      
      // Update the unsubscribers state without the one we just called
      const { conversations, ...restUnsubscribers } = currentUnsubscribers;
      set({ _unsubscribers: restUnsubscribers });
    }
    
    // Load cached conversations first
    AsyncStorage.getItem('conversations')
      .then(data => {
        if (data) {
          set({ conversations: JSON.parse(data) });
        } else if (mockConversations) {
          // Use mock data if no cached data is available
          set({ conversations: mockConversations, isLoadingConversations: false });
          
          // Cache mock conversations for offline use
          AsyncStorage.setItem('conversations', JSON.stringify(mockConversations))
            .catch(error => console.error('Error caching mock conversations:', error));
        }
      })
      .catch(error => {
        console.error('Error loading cached conversations:', error);
        // Fallback to mock data on error
        if (mockConversations) {
          set({ conversations: mockConversations, isLoadingConversations: false });
        }
      });
    
    // Subscribe to real-time updates
    try {
      const unsubscribe = subscribeToConversations(userId, (conversations) => {
        if (conversations && conversations.length > 0) {
          set({ conversations, isLoadingConversations: false });
          
          // Cache conversations for offline use
          AsyncStorage.setItem('conversations', JSON.stringify(conversations))
            .catch(error => console.error('Error caching conversations:', error));
        } else if (mockConversations && !get().conversations.length) {
          // Use mock data if Firebase returned empty results
          set({ conversations: mockConversations, isLoadingConversations: false });
        }
      }, (error) => {
        console.error('Error in fetchConversations subscription:', error);
        // If there's an index error, show instructions and use mock data
        if (error.message && error.message.includes('requires an index')) {
          console.error('Firebase requires a composite index. Create it using the link in the error above.');
          console.error('You need to create a composite index on conversations with fields:');
          console.error('- participants array-contains');
          console.error('- lastMessageTimestamp desc');
          
          // Use mock data as fallback
          if (mockConversations) {
            set({ 
              conversations: mockConversations, 
              isLoadingConversations: false,
              error: "Please create the required Firebase index. Using sample data for now."
            });
          }
        } else {
          // Handle other errors
          set({ 
            isLoadingConversations: false,
            error: 'Failed to load conversations. Please try again later.'
          });
          
          // Still use mock data if available
          if (mockConversations && !get().conversations.length) {
            set({ conversations: mockConversations });
          }
        }
      });
      
      // Store unsubscribe function
      const updatedUnsubscribers = get()._unsubscribers || {};
      set({ 
        _unsubscribers: { 
          ...updatedUnsubscribers, 
          conversations: unsubscribe 
        } 
      });
    } catch (error) {
      console.error('Error subscribing to conversations:', error);
      // Fallback to mock data on error
      if (mockConversations) {
        set({ 
          conversations: mockConversations, 
          isLoadingConversations: false,
          error: 'Failed to connect to chat service. Using local data.'
        });
      }
    }
  },
  
  fetchMessages: (conversationId: string) => {
    set({ isLoadingMessages: true, error: null });
    
    // Clean up any existing message and typing subscribers for this conversation
    const currentUnsubscribers = get()._unsubscribers || {};
    if (currentUnsubscribers[`messages_${conversationId}`]) {
      currentUnsubscribers[`messages_${conversationId}`]();
    }
    if (currentUnsubscribers[`typing_${conversationId}`]) {
      currentUnsubscribers[`typing_${conversationId}`]();
    }
    
    // Create a new unsubscribers object without the ones we just cleaned up
    const newUnsubscribers = { ...currentUnsubscribers };
    delete newUnsubscribers[`messages_${conversationId}`];
    delete newUnsubscribers[`typing_${conversationId}`];
    set({ _unsubscribers: newUnsubscribers });
    
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
            isLoadingMessages: false
          }));
        }
      })
      .catch(error => console.error('Error loading cached messages:', error));
    
    // Subscribe to real-time updates
    try {
      const unsubscribe = subscribeToMessages(conversationId, (messages) => {
        set(state => ({
          messages: {
            ...state.messages,
            [conversationId]: messages
          },
          isLoadingMessages: false,
          error: null // Clear any previous errors on successful fetch
        }));
      });
      
      // Subscribe to typing indicators
      const typingUnsubscribe = subscribeToTypingIndicator(
        conversationId,
        'current-user', // Replace with actual current user ID in production
        (typingUsers) => {
          set(state => ({
            typingUsers: {
              ...state.typingUsers,
              [conversationId]: typingUsers
            }
          }));
        }
      );
      
      // Store unsubscribe functions
      const updatedUnsubscribers = get()._unsubscribers || {};
      set({ 
        _unsubscribers: { 
          ...updatedUnsubscribers, 
          [`messages_${conversationId}`]: unsubscribe,
          [`typing_${conversationId}`]: typingUnsubscribe
        } 
      });
    } catch (error) {
      console.error('Error subscribing to messages:', error);
      // Handle error state
      set({ 
        isLoadingMessages: false,
        error: 'Unable to load messages. Please check your connection and try again.'
      });
      
      // If we have cached messages, still show them despite the error
      AsyncStorage.getItem(`messages_${conversationId}`)
        .then(data => {
          if (data) {
            const cachedMessages = JSON.parse(data);
            set(state => ({
              messages: {
                ...state.messages,
                [conversationId]: cachedMessages
              }
            }));
          }
        })
        .catch(err => console.error('Error loading cached messages after Firebase error:', err));
    }
  },
  
  // Add a cleanup function to properly unsubscribe from all Firebase listeners
  cleanupSubscribers: (conversationId?: string) => {
    const currentUnsubscribers = get()._unsubscribers || {};
    const newUnsubscribers = { ...currentUnsubscribers };
    
    if (conversationId) {
      // Clean up only listeners for a specific conversation
      if (newUnsubscribers[`messages_${conversationId}`]) {
        newUnsubscribers[`messages_${conversationId}`]();
        delete newUnsubscribers[`messages_${conversationId}`];
      }
      
      if (newUnsubscribers[`typing_${conversationId}`]) {
        newUnsubscribers[`typing_${conversationId}`]();
        delete newUnsubscribers[`typing_${conversationId}`];
      }
    } else {
      // Clean up all listeners
      Object.entries(newUnsubscribers).forEach(([key, unsubscribe]) => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      
      // Reset the unsubscribers object
      set({ _unsubscribers: {} });
      return;
    }
    
    // Update the unsubscribers state
    set({ _unsubscribers: newUnsubscribers });
  },
  
  setCurrentConversation: (conversation: Conversation | null) => {
    set({ currentConversation: conversation });
  },
  
  sendMessage: async (message: Omit<Message, 'id'>) => {
    const { networkStatus } = get();
    
    // Optimistically add message to UI
    const tempId = `temp-${uuidv4()}`;
    const tempMessage: Message = {
      ...message,
      id: tempId,
      status: 'sending',
      timestamp: new Date().toISOString()
    };
    
    set(state => ({
      messages: {
        ...state.messages,
        [message.conversationId]: [
          ...(state.messages[message.conversationId] || []),
          tempMessage
        ]
      }
    }));
    
    // If offline, queue message for later sending
    if (!networkStatus.isConnected) {
      try {
        await queueMessageForSending(message);
        
        // Update UI with queued status
        set(state => ({
          messages: {
            ...state.messages,
            [message.conversationId]: state.messages[message.conversationId].map(msg => 
              msg.id === tempId 
                ? { ...msg, status: 'failed', isOfflineQueued: true }
                : msg
            )
          }
        }));
      } catch (error) {
        console.error('Error queuing offline message:', error);
        
        // Mark message as failed
        set(state => ({
          messages: {
            ...state.messages,
            [message.conversationId]: state.messages[message.conversationId].map(msg => 
              msg.id === tempId 
                ? { ...msg, status: 'failed' }
                : msg
            )
          },
          error: 'Failed to queue message for offline sending.'
        }));
      }
      
      return;
    }
    
    // Send message to Firebase when online
    try {
      const messageId = await sendMessageToFirebase(message.conversationId, message);
      
      // Update optimistic message with actual ID and status
      set(state => ({
        messages: {
          ...state.messages,
          [message.conversationId]: state.messages[message.conversationId].map(msg => 
            msg.id === tempId 
              ? { ...msg, id: messageId, status: 'sent' }
              : msg
          ),
        },
        error: null // Clear any previous errors
      }));
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Special handling for mock/demo conversations
      if (error.message && error.message.includes('No document to update')) {
        // Note: We've updated the firebase.ts file to handle this case by creating the conversation,
        // but this fallback is still useful for old versions or if creation fails
        console.log('This appears to be a mock conversation. Using local data only.');
        
        // For demonstration, let's still show the message as sent in the UI
        set(state => ({
          messages: {
            ...state.messages,
            [message.conversationId]: state.messages[message.conversationId].map(msg => 
              msg.id === tempId 
                ? { ...msg, id: `local-${tempId}`, status: 'sent' }
                : msg
            )
          },
          error: null
        }));
        return;
      }
      
      // Queue message for later if Firebase operation fails
      try {
        await queueMessageForSending(message);
        
        // Update UI with queued status
        set(state => ({
          messages: {
            ...state.messages,
            [message.conversationId]: state.messages[message.conversationId].map(msg => 
              msg.id === tempId 
                ? { ...msg, status: 'failed', isOfflineQueued: true }
                : msg
            )
          }
        }));
      } catch (queueError) {
        console.error('Error queuing failed message:', queueError);
        
        // Mark message as failed if queueing fails too
        set(state => ({
          messages: {
            ...state.messages,
            [message.conversationId]: state.messages[message.conversationId].map(msg => 
              msg.id === tempId 
                ? { ...msg, status: 'failed' }
                : msg
            )
          },
          error: 'Failed to send message. Please try again.'
        }));
      }
    }
  },
  
  markMessagesAsRead: async (conversationId: string, userId: string) => {
    const { networkStatus } = get();
    
    // If we're offline, just update local state
    if (!networkStatus.isConnected) {
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map(message => 
            message.sender !== userId && !message.read
              ? { ...message, read: true, status: 'read' }
              : message
          )
        },
        conversations: state.conversations.map(conversation => 
          conversation.id === conversationId
            ? { 
                ...conversation, 
                lastMessage: { 
                  ...conversation.lastMessage, 
                  read: true 
                }, 
                unreadCount: 0 
              }
            : conversation
        )
      }));
      return;
    }
    
    // If we're online, try to update Firebase
    try {
      await markMessagesAsReadInFirebase(conversationId, userId);
      
      // Update local state optimistically
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map(message => 
            message.sender !== userId && !message.read
              ? { ...message, read: true, status: 'read' }
              : message
          )
        },
        conversations: state.conversations.map(conversation => 
          conversation.id === conversationId
            ? { 
                ...conversation, 
                lastMessage: { 
                  ...conversation.lastMessage, 
                  read: true 
                }, 
                unreadCount: 0 
              }
            : conversation
        )
      }));
    } catch (error) {
      console.error('Error marking messages as read:', error);
      
      // Still update local state even if Firebase operation fails
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map(message => 
            message.sender !== userId && !message.read
              ? { ...message, read: true, status: 'read' }
              : message
          )
        },
        conversations: state.conversations.map(conversation => 
          conversation.id === conversationId
            ? { 
                ...conversation, 
                lastMessage: { 
                  ...conversation.lastMessage, 
                  read: true 
                }, 
                unreadCount: 0 
              }
            : conversation
        )
      }));
    }
  },
  
  updateTypingStatus: (conversationId: string, userId: string, isTyping: boolean) => {
    // Throttle typing updates to prevent excessive Firebase writes
    const lastTypingUpdate = get()._lastTypingUpdate || {};
    const now = Date.now();
    
    if (lastTypingUpdate[conversationId] && now - lastTypingUpdate[conversationId] < 2000) {
      return;
    }
    
    updateTypingStatusInFirebase(conversationId, userId, isTyping)
      .catch(error => console.error('Error updating typing status:', error));
    
    // Store last update timestamp
    set(state => ({
      _lastTypingUpdate: {
        ...(state._lastTypingUpdate || {}),
        [conversationId]: now
      }
    }));
  },
  
  updateNetworkStatus: (status: NetworkStatus) => {
    const previousStatus = get().networkStatus;
    set({ networkStatus: status });
    
    // If we're coming back online, process any queued messages
    if (!previousStatus.isConnected && status.isConnected) {
      processPendingMessages()
        .catch(error => console.error('Error processing pending messages:', error));
    }
  },
  
  uploadAndSendMediaMessage: async (
    uri: string, 
    conversationId: string, 
    sender: string, 
    type: 'image' | 'gif'
  ) => {
    try {
      // Create temp message with local URI
      const tempId = `temp-${uuidv4()}`;
      const tempMessage: Message = {
        id: tempId,
        conversationId,
        sender,
        text: type === 'image' ? '📷 Photo' : '🖼️ GIF',
        timestamp: new Date().toISOString(),
        read: false,
        status: 'sending',
        type: type,
        localUri: uri
      };
      
      // Add temp message to UI
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: [
            ...(state.messages[conversationId] || []),
            tempMessage
          ]
        }
      }));
      
      // Upload media to Firebase Storage
      const downloadURL = await uploadMedia(uri, conversationId, tempId);
      
      // Create actual message with media URL
      const message: Omit<Message, 'id'> = {
        conversationId,
        sender,
        text: type === 'image' ? '📷 Photo' : '🖼️ GIF',
        timestamp: new Date().toISOString(),
        read: false,
        status: 'sent',
        type: type,
        mediaUrl: downloadURL
      };
      
      // Send message to Firebase
      const messageId = await sendMessageToFirebase(conversationId, message);
      
      // Update message in UI
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: state.messages[conversationId].map(msg => 
            msg.id === tempId 
              ? { 
                  ...msg, 
                  id: messageId, 
                  status: 'sent', 
                  mediaUrl: downloadURL,
                  localUri: undefined 
                }
              : msg
          )
        }
      }));
    } catch (error) {
      console.error('Error sending media message:', error);
      
      // Mark message as failed
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: state.messages[conversationId].map(msg => 
            msg.id.startsWith('temp-') && msg.localUri === uri
              ? { ...msg, status: 'failed' }
              : msg
          )
        },
        error: 'Failed to send media message. Please try again.'
      }));
    }
  },
  
  // Private properties (not exposed in the type)
  _unsubscribers: {},
  _lastTypingUpdate: {}
}));

// Network connectivity monitoring with improved detection
NetInfo.addEventListener(state => {
  // Treat null isInternetReachable as potentially connected to reduce false negatives
  const isConnected = state.isConnected && (state.isInternetReachable !== false);
  
  useChatStore.getState().updateNetworkStatus({
    isConnected,
    lastConnected: new Date().toISOString()
  });
});