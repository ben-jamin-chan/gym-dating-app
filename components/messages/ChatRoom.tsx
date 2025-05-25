import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, Send, Smile, AlertTriangle } from 'lucide-react-native';
import { useChatStore } from '@/utils/chatStore';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import { Message } from '@/types';

type ChatRoomProps = {
  conversationId: string;
};

// Helper function to format date for date headers
const formatDateHeader = (date: Date): string => {
  // Check if it's a valid date
  if (!date || isNaN(date.getTime())) {
    // For invalid dates, use current date
    const currentDate = new Date();
    return formatDateHeader(currentDate);
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Reset hours for proper date comparison
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (messageDate.getTime() === todayDate.getTime()) {
    return 'Today';
  } else if (messageDate.getTime() === yesterdayDate.getTime()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  }
};

// Function to check if date is different from previous message
const shouldShowDateHeader = (currentMsg: Message, prevMsg?: Message): boolean => {
  if (!prevMsg) return true; // Always show header for first message
  
  try {
    const currentDate = new Date(currentMsg.timestamp);
    const prevDate = new Date(prevMsg.timestamp);
    
    // Check for invalid dates
    if (isNaN(currentDate.getTime()) || isNaN(prevDate.getTime())) {
      return false;
    }
    
    // Compare year, month, and day
    return (
      currentDate.getFullYear() !== prevDate.getFullYear() ||
      currentDate.getMonth() !== prevDate.getMonth() ||
      currentDate.getDate() !== prevDate.getDate()
    );
  } catch (error) {
    return false; // Don't show header if there's an error
  }
};

export default function ChatRoom({ conversationId }: ChatRoomProps) {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const [hasFirebaseIndexError, setHasFirebaseIndexError] = useState(false);
  
  const { 
    messages = [], 
    typingUsers = [],
    isLoadingMessages,
    error,
    sendMessage,
    updateTypingStatus,
    uploadAndSendMediaMessage,
    networkStatus,
    cleanupSubscribers
  } = useChatStore(state => ({
    messages: state.messages[conversationId] || [],
    typingUsers: state.typingUsers[conversationId] || [],
    isLoadingMessages: state.isLoadingMessages,
    error: state.error,
    sendMessage: state.sendMessage,
    updateTypingStatus: state.updateTypingStatus,
    uploadAndSendMediaMessage: state.uploadAndSendMediaMessage,
    networkStatus: state.networkStatus,
    cleanupSubscribers: state.cleanupSubscribers
  }));

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
        setHasFirebaseIndexError(true);
      }
    };
    
    // Restore original on unmount
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  // Clean up Firebase subscriptions when component unmounts
  useEffect(() => {
    return () => {
      // Clear any typing timeouts
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Explicitly set typing status to false when leaving
      updateTypingStatus(conversationId, 'current-user', false);
    };
  }, [conversationId, updateTypingStatus]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      // Small delay to ensure rendering is complete before scrolling
      setTimeout(scrollToBottom, 100);
    }
  }, [messages]);
  
  // Function to scroll to the bottom of the chat
  const scrollToBottom = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  // Handle typing indicator
  const handleTextChange = (text: string) => {
    setInputText(text);

    // Update typing status
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      updateTypingStatus(conversationId, 'current-user', true);
    } else if (isTyping && text.length === 0) {
      setIsTyping(false);
      updateTypingStatus(conversationId, 'current-user', false);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        updateTypingStatus(conversationId, 'current-user', false);
      }
    }, 3000);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Create message object with precise timestamp
    const message: Omit<Message, 'id'> = {
      conversationId,
      sender: 'current-user',
      text: inputText.trim(),
      timestamp: new Date().toISOString(), // This creates an accurate timestamp
      read: false,
      status: 'sending',
      type: 'text',
    };

    // Clear input
    setInputText('');
    
    // Update typing status
    setIsTyping(false);
    updateTypingStatus(conversationId, 'current-user', false);
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send message
    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleImagePicker = async () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: () => pickImageFromCamera(),
        },
        {
          text: 'Photo Library',
          onPress: () => pickImageFromLibrary(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const pickImageFromCamera = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera permission to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setIsUploadingMedia(true);
        try {
          await uploadAndSendMediaMessage(uri, conversationId, 'current-user', 'image');
        } finally {
          setIsUploadingMedia(false);
        }
      }
    } catch (error) {
      setIsUploadingMedia(false);
      console.error('Error picking image from camera:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      // Request library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setIsUploadingMedia(true);
        try {
          await uploadAndSendMediaMessage(uri, conversationId, 'current-user', 'image');
        } finally {
          setIsUploadingMedia(false);
        }
      }
    } catch (error) {
      setIsUploadingMedia(false);
      console.error('Error picking image from library:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleCameraPicker = async () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Directly open camera
    await pickImageFromCamera();
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const showAvatar = 
      index === 0 || 
      messages[index - 1].sender !== item.sender;
    
    // Check if we need to show a date header before this message
    const showDateHeader = shouldShowDateHeader(item, index > 0 ? messages[index - 1] : undefined);
    
    return (
      <>
        {showDateHeader && (
          <View style={styles.dateHeaderContainer}>
            <Text style={styles.dateHeaderText}>
              {formatDateHeader(new Date(item.timestamp))}
            </Text>
          </View>
        )}
        <ChatMessage 
          message={item} 
          showAvatar={showAvatar} 
          isOwnMessage={item.sender === 'current-user'} 
        />
      </>
    );
  };

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      {hasFirebaseIndexError ? (
        <View style={styles.indexErrorContent}>
          <AlertTriangle size={36} color="#F59E0B" />
          <Text style={styles.indexErrorTitle}>Firebase Index Required</Text>
          <Text style={styles.errorText}>
            The chat is still usable, but some features may not work correctly until Firebase indexes are created.
          </Text>
          <Text style={styles.indexErrorTip}>
            Tap the red alert button in the header to set up the required indexes.
          </Text>
        </View>
      ) : (
        <Text style={styles.errorText}>
          {networkStatus.isConnected 
            ? "Unable to load messages. Please try again later."
            : "You're offline. Some messages may not be available until you reconnect."}
        </Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {isLoadingMessages ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : error && !hasFirebaseIndexError ? (
        renderErrorState()
      ) : (
        <>
          {hasFirebaseIndexError && (
            <View style={styles.warningBanner}>
              <AlertTriangle size={16} color="#FFFFFF" />
              <Text style={styles.warningText}>
                Running with limited functionality. Check header for details.
              </Text>
            </View>
          )}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            style={styles.messageList}
            contentContainerStyle={[
              styles.messageListContent,
              { paddingBottom: 16 }
            ]}
            inverted={false}
            ListFooterComponent={
              typingUsers.length > 0 ? (
                <TypingIndicator />
              ) : null
            }
            onContentSizeChange={scrollToBottom}
            onLayout={scrollToBottom}
          />
        </>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity 
          style={styles.attachButton} 
          onPress={handleCameraPicker}
          disabled={isUploadingMedia}
        >
          <Camera size={22} color={isUploadingMedia ? "#D1D5DB" : "#6B7280"} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.attachButton} 
          onPress={handleImagePicker}
          disabled={isUploadingMedia}
        >
          {isUploadingMedia ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <ImageIcon size={22} color="#6B7280" />
          )}
        </TouchableOpacity>
        
        <View style={styles.textInputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={handleTextChange}
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity style={styles.emojiButton}>
            <Smile size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled
          ]}
          onPress={handleSendMessage}
          disabled={!inputText.trim()}
        >
          <Send size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  indexErrorContent: {
    alignItems: 'center',
    padding: 20,
  },
  indexErrorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginTop: 12,
    marginBottom: 8,
  },
  indexErrorTip: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    padding: 8,
    gap: 8,
  },
  warningText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  attachButton: {
    padding: 8,
    marginRight: 4,
  },
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
  },
  emojiButton: {
    padding: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  dateHeaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    width: '100%',
  },
  dateHeaderText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    backgroundColor: 'rgba(229, 231, 235, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
}); 