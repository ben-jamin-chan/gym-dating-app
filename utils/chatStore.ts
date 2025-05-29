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
import { mockConversations, mockMessages } from './mockData';
import { Alert } from 'react-native';

// Maximum retries for Firebase operations
const MAX_RETRIES = 2;

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
  
  // Internal state for managing subscriptions and timing
  _unsubscribers?: Record<string, () => void>;
  _lastTypingUpdate?: Record<string, number>;
  _useMockData: boolean; // Flag to force using mock data if Firebase is problematic
  
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
  toggleUseMockData: (useMock: boolean) => void; // Toggle mock data usage
}

// Keep track of error counts to prevent infinite loops
let conversationErrorCount = 0;
let messageErrorCount = 0;
const ERROR_THRESHOLD = 3; // Switch to mock data after this many consecutive errors

// Safe wrapper for Firebase operations
const safeFirebaseOperation = async <T>(
  operation: () => Promise<T>,
  fallback: T,
  errorMessage: string,
  maxRetries = MAX_RETRIES
): Promise<T> => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      console.error(`${errorMessage} (attempt ${retries + 1}/${maxRetries}):`, error);
      retries++;
      
      // Wait a bit before retrying (increasing delay with each retry)
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
  }
  
  console.warn(`${errorMessage}: Using fallback data after ${maxRetries} failed attempts`);
  return fallback;
};

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
  _useMockData: false,
  
  // Toggle mock data usage
  toggleUseMockData: (useMock: boolean) => {
    set({ _useMockData: useMock });
    
    // If switching to mock data, load it immediately
    if (useMock) {
      set({ 
        conversations: mockConversations,
        error: "Using mock data (Firebase disabled)"
      });
      
      // Clean up any existing Firebase subscribers
      const currentUnsubscribers = get()._unsubscribers || {};
      Object.values(currentUnsubscribers).forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          try {
            unsubscribe();
          } catch (error) {
            console.error('Error unsubscribing:', error);
          }
        }
      });
      
      set({ _unsubscribers: {} });
    }
  },
  
  // Actions
  fetchConversations: (userId: string) => {
    // If using mock data, return immediately
    if (get()._useMockData) {
      set({ 
        conversations: mockConversations,
        isLoadingConversations: false
      });
      return;
    }
    
    set({ isLoadingConversations: true, error: null });
    
    // First, clean up any existing conversation subscribers to prevent duplicate listeners
    const currentUnsubscribers = get()._unsubscribers || {};
    if (currentUnsubscribers.conversations) {
      try {
        currentUnsubscribers.conversations();
      } catch (error) {
        console.error('Error unsubscribing from conversations:', error);
      }
      
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
    
    // Subscribe to real-time updates with error handling
    try {
      const unsubscribe = subscribeToConversations(userId, (conversations) => {
        // Reset error count on success
        conversationErrorCount = 0;
        
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
        
        // Increment error count
        conversationErrorCount++;
        
        // Switch to mock data if we exceed the error threshold
        if (conversationErrorCount >= ERROR_THRESHOLD) {
          console.warn(`Switching to mock data after ${ERROR_THRESHOLD} consecutive errors`);
          set({ 
            _useMockData: true,
            conversations: mockConversations, 
            isLoadingConversations: false,
            error: "Using mock data due to Firebase errors"
          });
          
          // Show alert to user
          Alert.alert(
            "Connection Issue",
            "We're having trouble connecting to the chat server. Using offline data for now.",
            [{ text: "OK" }]
          );
          
          // Clean up all subscribers
          get().cleanupSubscribers();
          return;
        }
        
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
    // If using mock data, return immediately with mock messages
    if (get()._useMockData) {
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: mockMessages[conversationId] || []
        },
        isLoadingMessages: false
      }));
      return;
    }
    
    set({ isLoadingMessages: true, error: null });
    
    // Clean up any existing message and typing subscribers for this conversation
    const currentUnsubscribers = get()._unsubscribers || {};
    if (currentUnsubscribers[`messages_${conversationId}`]) {
      try {
        currentUnsubscribers[`messages_${conversationId}`]();
      } catch (error) {
        console.error(`Error unsubscribing from messages for ${conversationId}:`, error);
      }
    }
    if (currentUnsubscribers[`typing_${conversationId}`]) {
      try {
        currentUnsubscribers[`typing_${conversationId}`]();
      } catch (error) {
        console.error(`Error unsubscribing from typing indicators for ${conversationId}:`, error);
      }
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
            }
          }));
        } else if (mockMessages[conversationId]) {
          // Use mock messages if no cached data is available
          set(state => ({
            messages: {
              ...state.messages,
              [conversationId]: mockMessages[conversationId]
            }
          }));
        }
      })
      .catch(error => {
        console.error('Error loading cached messages:', error);
        // Fallback to mock messages on error
        if (mockMessages[conversationId]) {
          set(state => ({
            messages: {
              ...state.messages,
              [conversationId]: mockMessages[conversationId]
            }
          }));
        }
      })
      .finally(() => {
        // Set loading to false after cache is loaded, regardless of outcome
        set({ isLoadingMessages: false });
      });
    
    // Subscribe to real-time updates with better error handling
    try {
      // Add message subscription with error handler
      const unsubscribe = subscribeToMessages(conversationId, (messages) => {
        // Reset error count on success
        messageErrorCount = 0;
        
        // Update store with new messages
        set(state => ({
          messages: {
            ...state.messages,
            [conversationId]: messages
          },
          isLoadingMessages: false,
          error: null
        }));
        
        // Cache messages for offline use
        AsyncStorage.setItem(`messages_${conversationId}`, JSON.stringify(messages))
          .catch(error => console.error(`Error caching messages for ${conversationId}:`, error));
        
      }, (error) => {
        // Handle errors from the messages subscription
        console.error(`Error in messages subscription for ${conversationId}:`, error);
        
        // Increment error count
        messageErrorCount++;
        
        // Switch to mock data if we exceed the error threshold
        if (messageErrorCount >= ERROR_THRESHOLD) {
          console.warn(`Switching to mock data after ${ERROR_THRESHOLD} consecutive message errors`);
          
          // Update the store with mock messages
          set(state => ({
            _useMockData: true,
            messages: {
              ...state.messages,
              [conversationId]: mockMessages[conversationId] || []
            },
            isLoadingMessages: false,
            error: "Using mock data due to Firebase errors"
          }));
          
          // Show alert to user
          Alert.alert(
            "Connection Issue",
            "We're having trouble connecting to the chat server. Using offline data for now.",
            [{ text: "OK" }]
          );
          
          // Clean up all subscribers
          get().cleanupSubscribers();
        } else {
          // Use mock data for this conversation but don't switch the entire app to mock mode yet
          set(state => ({
            messages: {
              ...state.messages,
              [conversationId]: mockMessages[conversationId] || []
            },
            isLoadingMessages: false,
            error: `Error loading messages: ${error.message}`
          }));
        }
      });
      
      // Store unsubscribe functions - use a try/catch to prevent errors
      try {
        const updatedUnsubscribers = get()._unsubscribers || {};
        set({ 
          _unsubscribers: { 
            ...updatedUnsubscribers, 
            [`messages_${conversationId}`]: unsubscribe
          } 
        });
      } catch (error) {
        console.error('Error storing message unsubscriber:', error);
      }
      
      // Try to add typing indicator subscription, but don't let errors stop us
      try {
        // Only add typing indicator if we're not in mock mode
        if (!get()._useMockData) {
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
          
          // Store typing unsubscribe function
          const updatedUnsubscribers = get()._unsubscribers || {};
          set({ 
            _unsubscribers: { 
              ...updatedUnsubscribers, 
              [`typing_${conversationId}`]: typingUnsubscribe
            } 
          });
        }
      } catch (error) {
        console.error('Error subscribing to typing indicators:', error);
        // Just log the error and continue - typing indicators are not critical
      }
    } catch (error) {
      console.error(`Error setting up message subscriptions for ${conversationId}:`, error);
      
      // Fallback to mock messages
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: mockMessages[conversationId] || []
        },
        isLoadingMessages: false,
        error: 'Failed to load messages. Using offline data.'
      }));
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
      },
      conversations: state.conversations.map(conversation => 
        conversation.id === message.conversationId
          ? { 
              ...conversation, 
              lastMessage: { 
                text: message.text, 
                timestamp: message.timestamp,
                read: false 
              }
            }
          : conversation
      )
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
        conversations: state.conversations.map(conversation => 
          conversation.id === message.conversationId
            ? { 
                ...conversation, 
                lastMessage: { 
                  text: message.text, 
                  timestamp: message.timestamp,
                  read: false 
                }
              }
            : conversation
        ),
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
          conversations: state.conversations.map(conversation => 
            conversation.id === message.conversationId
              ? { 
                  ...conversation, 
                  lastMessage: { 
                    text: message.text, 
                    timestamp: message.timestamp,
                    read: false 
                  }
                }
              : conversation
          ),
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
  const isConnected = Boolean(state.isConnected && (state.isInternetReachable !== false));
  
  useChatStore.getState().updateNetworkStatus({
    isConnected,
    lastConnected: new Date().toISOString()
  });
});