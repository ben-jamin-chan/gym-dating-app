import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Text,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Send, Camera, Image as ImageIcon, Smile } from 'lucide-react-native';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onTypingChange: (isTyping: boolean) => void;
  onMediaPress: () => void;
  isUploading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSendMessage,
  onTypingChange,
  onMediaPress,
  isUploading = false,
  disabled = false,
  placeholder = "Type a message..."
}: ChatInputProps) {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Handle typing indicator
  const handleTextChange = (text: string) => {
    setInputText(text);

    // Update typing status
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      onTypingChange(true);
    } else if (isTyping && text.length === 0) {
      setIsTyping(false);
      onTypingChange(false);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTypingChange(false);
      }
    }, 3000);
  };

  const handleSendMessage = () => {
    const messageText = inputText.trim();
    if (!messageText || disabled) return;

    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Clear typing status
    setIsTyping(false);
    onTypingChange(false);
    
    // Clear input and send message
    setInputText('');
    onSendMessage(messageText);

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleMediaPress = () => {
    if (disabled || isUploading) return;
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setShowMediaOptions(!showMediaOptions);
    onMediaPress();
  };

  const canSend = inputText.trim().length > 0 && !disabled && !isUploading;

  return (
    <View style={styles.container}>
      {/* Media Options */}
      {showMediaOptions && (
        <View style={styles.mediaOptions}>
          <TouchableOpacity 
            style={styles.mediaOption}
            onPress={() => {
              setShowMediaOptions(false);
              // Handle camera option
            }}
          >
            <Camera size={24} color="#007AFF" />
            <Text style={styles.mediaOptionText}>Camera</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mediaOption}
            onPress={() => {
              setShowMediaOptions(false);
              // Handle gallery option
            }}
          >
            <ImageIcon size={24} color="#007AFF" />
            <Text style={styles.mediaOptionText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input Container */}
      <View style={styles.inputContainer}>
        <TouchableOpacity 
          style={[styles.mediaButton, disabled && styles.disabledButton]}
          onPress={handleMediaPress}
          disabled={disabled || isUploading}
        >
          <ImageIcon 
            size={24} 
            color={disabled || isUploading ? '#9CA3AF' : '#6B7280'} 
          />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={[styles.textInput, disabled && styles.disabledInput]}
          value={inputText}
          onChangeText={handleTextChange}
          placeholder={isUploading ? "Uploading..." : placeholder}
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={1000}
          editable={!disabled && !isUploading}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSendMessage}
        />

        <TouchableOpacity 
          style={[
            styles.sendButton,
            canSend ? styles.sendButtonActive : styles.sendButtonInactive
          ]}
          onPress={handleSendMessage}
          disabled={!canSend}
        >
          <Send 
            size={20} 
            color={canSend ? '#FFFFFF' : '#9CA3AF'} 
          />
        </TouchableOpacity>
      </View>

      {/* Loading indicator for media upload */}
      {isUploading && (
        <View style={styles.uploadingContainer}>
          <Text style={styles.uploadingText}>Uploading media...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  mediaOptions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 24,
  },
  mediaOption: {
    alignItems: 'center',
    gap: 4,
  },
  mediaOptionText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  mediaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    minHeight: 36,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'center',
    ...Platform.select({
      ios: {
        paddingTop: 8,
        paddingBottom: 8,
      },
      android: {
        paddingTop: 8,
        paddingBottom: 8,
      },
    }),
  },
  disabledInput: {
    backgroundColor: '#F9FAFB',
    color: '#9CA3AF',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
  sendButtonInactive: {
    backgroundColor: '#F3F4F6',
  },
  uploadingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  uploadingText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
}); 