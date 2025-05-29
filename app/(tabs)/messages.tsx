import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Header from '@/components/ui/Header';
import MessageItem from '@/components/messages/MessageItem';
import EmptyState from '@/components/ui/EmptyState';
import { useChatStore } from '@/utils/chatStore';
import type { ChatState } from '@/utils/chatStore';

// Component to toggle mock data for debugging
const DebugControls = ({ onToggleMockData, useMockData }) => {
  return (
    <View style={styles.debugContainer}>
      <TouchableOpacity
        style={[
          styles.debugButton,
          { backgroundColor: useMockData ? '#FFA500' : '#6B7280' }
        ]}
        onPress={() => onToggleMockData(!useMockData)}
      >
        <Text style={styles.debugButtonText}>
          {useMockData ? 'Using Mock Data' : 'Use Mock Data'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default function MessagesScreen() {
  const [debugMode, setDebugMode] = useState(false);
  const { 
    conversations, 
    isLoadingConversations, 
    fetchConversations,
    cleanupSubscribers,
    _useMockData,
    toggleUseMockData,
    error
  } = useChatStore((state: ChatState) => ({
    conversations: state.conversations,
    isLoadingConversations: state.isLoadingConversations,
    fetchConversations: state.fetchConversations,
    cleanupSubscribers: state.cleanupSubscribers,
    _useMockData: state._useMockData,
    toggleUseMockData: state.toggleUseMockData,
    error: state.error
  }));

  // Show debug controls after 5 consecutive taps on the header
  const [tapCount, setTapCount] = useState(0);
  const handleHeaderTap = () => {
    setTapCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        setDebugMode(true);
        return 0;
      }
      return newCount;
    });
  };

  // Handle toggling mock data
  const handleToggleMockData = (useMock: boolean) => {
    if (useMock) {
      Alert.alert(
        "Switch to Mock Data?",
        "This will disable Firebase connections and use offline mock data. Use this if you're experiencing connection issues.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Switch to Mock Data", 
            onPress: () => {
              toggleUseMockData(true);
              Alert.alert("Now Using Mock Data", "App is now using offline data.");
            }
          }
        ]
      );
    } else {
      Alert.alert(
        "Switch to Live Data?",
        "This will re-enable Firebase connections. The app may crash if there are still connection issues.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Switch to Live Data", 
            onPress: () => {
              toggleUseMockData(false);
              fetchConversations('current-user');
            }
          }
        ]
      );
    }
  };

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
      <TouchableOpacity activeOpacity={1} onPress={handleHeaderTap}>
        <Header title="Messages" />
      </TouchableOpacity>
      
      {/* Show error banner if there are Firebase issues */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {/* Debug controls - only shown after 5 taps on header */}
      {debugMode && (
        <DebugControls 
          onToggleMockData={handleToggleMockData} 
          useMockData={_useMockData} 
        />
      )}
      
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
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    textAlign: 'center',
  },
  debugContainer: {
    padding: 8,
    marginHorizontal: 16,
    marginVertical: 4,
    alignItems: 'center',
  },
  debugButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#6B7280',
  },
  debugButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});