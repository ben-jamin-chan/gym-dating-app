import React, { useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Header from '@/components/ui/Header';
import MessageItem from '@/components/messages/MessageItem';
import EmptyState from '@/components/ui/EmptyState';
import { useChatStore } from '@/utils/chatStore';
import type { ChatState } from '@/utils/chatStore';

export default function MessagesScreen() {
  const { 
    conversations, 
    isLoadingConversations, 
    fetchConversations,
    cleanupSubscribers
  } = useChatStore((state: ChatState) => ({
    conversations: state.conversations,
    isLoadingConversations: state.isLoadingConversations,
    fetchConversations: state.fetchConversations,
    cleanupSubscribers: state.cleanupSubscribers
  }));

  useEffect(() => {
    // In a real app, this would use the actual current user ID
    fetchConversations('current-user');
    
    // Clean up the conversation subscription when component unmounts
    return () => {
      cleanupSubscribers();
    };
  }, [fetchConversations, cleanupSubscribers]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <Header title="Messages" />
      
      <View style={styles.content}>
        {isLoadingConversations && conversations.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : conversations.length > 0 ? (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageItem conversation={item} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <EmptyState
            title="No messages yet"
            message="When you match and chat with someone, conversations will appear here"
            iconName="message-circle"
          />
        )}
      </View>
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
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});