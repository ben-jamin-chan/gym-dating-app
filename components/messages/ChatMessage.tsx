import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Check, CheckCheck } from 'lucide-react-native';
import { Message, MessageStatus } from '@/types';

type ChatMessageProps = {
  message: Message;
  showAvatar: boolean;
  isOwnMessage: boolean;
};

export default function ChatMessage({ message, showAvatar, isOwnMessage }: ChatMessageProps) {
  // Choose the right styles based on whether the message is from the current user
  const containerStyle = isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer;
  const bubbleStyle = isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble;
  const textStyle = isOwnMessage ? styles.ownMessageText : styles.otherMessageText;
  const timeStyle = isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime;
  
  const renderMedia = () => {
    if (message.type === 'image' && (message.mediaUrl || message.localUri)) {
      return (
        <Image
          source={{ uri: message.mediaUrl || message.localUri }}
          style={styles.mediaImage}
          contentFit="cover"
          transition={200}
        />
      );
    } else if (message.type === 'gif' && (message.mediaUrl || message.localUri)) {
      return (
        <Image
          source={{ uri: message.mediaUrl || message.localUri }}
          style={styles.mediaImage}
          contentFit="cover"
        />
      );
    }
    return null;
  };
  
  // Format timestamp to display date and time
  const formatMessageTime = (timestamp: string): string => {
    try {
      const messageDate = new Date(timestamp);
      
      // Check if it's a valid date
      if (isNaN(messageDate.getTime())) {
        return new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
      
      // Always get time string (e.g. "3:45 PM")
      const timeString = messageDate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      // If same day, just return time
      if (messageDay.getTime() === today.getTime()) {
        return timeString;
      }
      
      // If yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (messageDay.getTime() === yesterday.getTime()) {
        return `Yesterday, ${timeString}`;
      }
      
      // If within current week (last 7 days)
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
      if (messageDay >= oneWeekAgo) {
        return messageDate.toLocaleDateString([], { weekday: 'short' }) + `, ${timeString}`;
      }
      
      // Otherwise show full date with time
      return messageDate.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric' 
      }) + `, ${timeString}`;
    } catch (error) {
      // Return current time for any errors
      return new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };
  
  // Get formatted time - ensure it's always displayed
  const formattedTime = formatMessageTime(message.timestamp);
  
  // Render message status indicator for own messages
  const renderStatus = () => {
    if (!isOwnMessage) return null;
    
    switch (message.status) {
      case 'sending':
        return <View style={styles.statusDot} />;
      case 'sent':
        return <Check size={14} color="#9CA3AF" />;
      case 'delivered':
        return <CheckCheck size={14} color="#9CA3AF" />;
      case 'read':
        return <CheckCheck size={14} color="#3B82F6" />;
      case 'failed':
        return (
          <TouchableOpacity style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };
  
  return (
    <View style={[styles.container, containerStyle]}>
      {!isOwnMessage && showAvatar ? (
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg' }}
            style={styles.avatar}
          />
        </View>
      ) : (
        <View style={styles.avatarPlaceholder} />
      )}
      
      <View style={[styles.messageBubble, bubbleStyle]}>
        {renderMedia()}
        
        <Text style={textStyle}>{message.text}</Text>
        
        <View style={styles.messageFooter}>
          <Text style={timeStyle}>{formattedTime}</Text>
          {renderStatus()}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    marginRight: 'auto',
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  avatarPlaceholder: {
    width: 32,
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  ownMessageBubble: {
    backgroundColor: '#3B82F6',
    borderTopRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
  },
  ownMessageText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
  otherMessageText: {
    color: '#111827',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginRight: 4,
  },
  otherMessageTime: {
    color: '#9CA3AF',
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginLeft: 4,
  },
  mediaImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  retryButton: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
}); 