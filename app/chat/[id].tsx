import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle } from 'lucide-react-native';
import { useChatStore } from '@/utils/chatStore';
import ChatRoom from '@/components/messages/ChatRoom';
import ChatHeader from '@/components/messages/ChatHeader';
import IndexRequiredNotice from '@/components/IndexRequiredNotice';
import { Conversation } from '@/types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id as string;
  const [showIndexNotice, setShowIndexNotice] = useState(false);
  const [hasIndexErrors, setHasIndexErrors] = useState(false);
  
  const {
    currentConversation,
    conversations,
    fetchMessages,
    setCurrentConversation,
    markMessagesAsRead,
    error
  } = useChatStore(state => ({
    currentConversation: state.currentConversation,
    conversations: state.conversations,
    fetchMessages: state.fetchMessages,
    setCurrentConversation: state.setCurrentConversation,
    markMessagesAsRead: state.markMessagesAsRead,
    error: state.error
  }));
  
  const hasLoadedMessagesRef = useRef(false);
  
  // Override console.error to detect index errors
  useEffect(() => {
    const originalConsoleError = console.error;
    
    console.error = (...args) => {
      // Call the original to maintain normal logging
      originalConsoleError(...args);
      
      // Check if any argument contains the index error message
      const errorMsg = args.map(arg => String(arg)).join(' ');
      
      if (
        errorMsg.includes('requires an index') || 
        errorMsg.includes('Missing Firebase index')
      ) {
        setHasIndexErrors(true);
      }
    };
    
    // Restore original on unmount
    return () => {
      console.error = originalConsoleError;
    };
  }, []);
  
  // Show index notice based on error state or detected errors
  useEffect(() => {
    if (
      (error && error.includes('index')) || 
      hasIndexErrors
    ) {
      setShowIndexNotice(true);
    }
  }, [error, hasIndexErrors]);
  
  // Ensure the conversation has the necessary user information
  const ensureValidConversation = (conversation: Conversation | null): Conversation | null => {
    if (!conversation) return null;
    
    // If the user property is missing, create a default user object
    if (!conversation.user) {
      return {
        ...conversation,
        user: {
          id: conversation.userId || 'unknown',
          name: 'User',
          photo: 'https://via.placeholder.com/40x40',
          online: false
        }
      };
    }
    
    return conversation;
  };
  
  useEffect(() => {
    // Find conversation if not already set
    if (!currentConversation && conversationId) {
      const conversation = conversations.find(conv => conv.id === conversationId);
      if (conversation) {
        // Make sure the conversation has a valid user object before setting it
        setCurrentConversation(ensureValidConversation(conversation));
      }
    }
  }, [conversations, conversationId, currentConversation, setCurrentConversation]);
  
  useEffect(() => {
    // Fetch messages when conversation is set
    if (conversationId && !hasLoadedMessagesRef.current) {
      fetchMessages(conversationId);
      hasLoadedMessagesRef.current = true;
    }
  }, [conversationId, fetchMessages]);
  
  useEffect(() => {
    // Mark messages as read when screen is opened
    if (conversationId && currentConversation) {
      // Immediately mark messages as read when entering the chat
      (async () => {
        try {
          await markMessagesAsRead(conversationId, 'current-user');
        } catch (error: any) {
          console.log('Non-critical error marking messages as read:', error);
          
          // Check if this is an index error
          if (error.message && error.message.includes('requires an index')) {
            setHasIndexErrors(true);
          }
        }
      })();
    }
    
    // Set up interval to periodically mark messages as read, but less frequently
    const readInterval = setInterval(() => {
      if (conversationId && currentConversation) {
        (async () => {
          try {
            await markMessagesAsRead(conversationId, 'current-user');
          } catch (error: any) {
            console.log('Non-critical error marking messages as read:', error);
            
            // Check if this is an index error
            if (error.message && error.message.includes('requires an index')) {
              setHasIndexErrors(true);
            }
          }
        })();
      }
    }, 10000); // Increased from 5000ms to 10000ms (10 seconds)
    
    return () => {
      clearInterval(readInterval);
      // Clean up and set current conversation to null
      setCurrentConversation(null);
    };
  }, [conversationId, currentConversation, markMessagesAsRead, setCurrentConversation]);
  
  // Ensure the current conversation has a valid user object
  const safeConversation = ensureValidConversation(currentConversation);
  
  if (!safeConversation) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.content}>
          <Text style={styles.errorText}>Conversation not found</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.headerContainer}>
        <ChatHeader conversation={safeConversation} />
        {hasIndexErrors && (
          <TouchableOpacity 
            style={styles.indexErrorButton}
            onPress={() => setShowIndexNotice(true)}
          >
            <AlertCircle size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
      <ChatRoom conversationId={conversationId} />
      
      {/* Modal for showing Firebase index requirements */}
      <Modal
        visible={showIndexNotice}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowIndexNotice(false)}
      >
        <View style={styles.modalContainer}>
          <IndexRequiredNotice onDismiss={() => setShowIndexNotice(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
  },
  indexErrorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 12,
    zIndex: 100,
  },
}); 