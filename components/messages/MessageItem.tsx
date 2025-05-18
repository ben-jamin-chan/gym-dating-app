import React from 'react';
import { View, StyleSheet, Image, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Conversation } from '@/types';
import { useChatStore } from '@/utils/chatStore';

type MessageItemProps = {
  conversation: Conversation;
};

export default function MessageItem({ conversation }: MessageItemProps) {
  const setCurrentConversation = useChatStore(state => state.setCurrentConversation);
  
  const handlePress = () => {
    setCurrentConversation(conversation);
    router.push(`/chat/${conversation.id}`);
  };
  
  // Default values to use if none are available
  const defaultPhotoUrl = 'https://via.placeholder.com/56x56';
  
  // Safely check if user object and properties exist
  const userPhoto = conversation?.user?.photo || defaultPhotoUrl;
  const isUserOnline = conversation?.user?.online || false;
  const userName = conversation?.user?.name || 'User';
  
  // Safely check lastMessage properties
  const messageText = conversation?.lastMessage?.text || 'No messages yet';
  const messageTimestamp = conversation?.lastMessage?.timestamp || new Date().toISOString();
  const messageRead = conversation?.lastMessage?.read || false;
  
  // Safely check typing status
  const isTyping = conversation?.typingStatus?.isTyping || false;
  
  // Safely check unread count
  const unreadCount = conversation?.unreadCount || 0;
  
  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={styles.avatarContainer}>
        <Image 
          source={{ uri: userPhoto }} 
          style={styles.avatar} 
        />
        {isUserOnline && <View style={styles.onlineIndicator} />}
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{userName}</Text>
          <Text style={styles.time}>{formatTimestamp(messageTimestamp)}</Text>
        </View>
        
        <View style={styles.messageRow}>
          {isTyping ? (
            <Text style={styles.typingIndicator}>Typing...</Text>
          ) : (
            <Text 
              style={[
                styles.message, 
                messageRead ? {} : styles.unreadMessage
              ]}
              numberOfLines={1}
            >
              {messageText}
            </Text>
          )}
          
          {unreadCount ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          ) : messageRead ? null : (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>New</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Helper function to format timestamp
function formatTimestamp(timestamp: string): string {
  try {
    const messageDate = new Date(timestamp);
    
    // Check if it's a valid date
    if (isNaN(messageDate.getTime())) {
      // If timestamp is invalid, use current time
      return "Just now";
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    
    // Get time string format
    const timeString = messageDate.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    // If same day, return time
    if (messageDay.getTime() === today.getTime()) {
      return timeString;
    }
    
    // If yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDay.getTime() === yesterday.getTime()) {
      return `Yesterday, ${timeString}`;
    }
    
    // If within the last week, return day name and time
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
    if (messageDay >= oneWeekAgo) {
      return messageDate.toLocaleDateString([], { weekday: 'short' }) + `, ${timeString}`;
    }
    
    // Otherwise return full date with time
    return messageDate.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    }) + `, ${timeString}`;
  } catch (error) {
    return "Just now";
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  time: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    marginRight: 8,
  },
  unreadMessage: {
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  unreadBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  unreadBadgeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#FFFFFF',
  },
  typingIndicator: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#3B82F6',
    fontStyle: 'italic',
    flex: 1,
    marginRight: 8,
  },
});