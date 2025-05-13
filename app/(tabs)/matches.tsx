import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from '@/utils/firebase';
import { getUserMatches, subscribeToUserMatches, unmatch, Match } from '@/services/matchService';

export default function MatchesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get the current user ID
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUserId(user.uid);
    }
  }, []);

  // Subscribe to real-time updates for matches
  useFocusEffect(
    React.useCallback(() => {
      if (!currentUserId) return;
      
      // Subscribe to matches
      const unsubscribe = subscribeToUserMatches(currentUserId, (updatedMatches) => {
        setMatches(updatedMatches);
        setLoading(false);
      });
      
      // Unsubscribe when the component unmounts or loses focus
      return () => {
        unsubscribe();
      };
    }, [currentUserId])
  );

  // Handle unmatch action
  const handleUnmatch = async (matchId: string) => {
    Alert.alert(
      'Unmatch',
      'Are you sure you want to unmatch with this person?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Unmatch',
          onPress: async () => {
            try {
              await unmatch(matchId);
              // The UI will update automatically due to the subscription
            } catch (error) {
              console.error('Error unmatching:', error);
              Alert.alert(
                'Error',
                'Failed to unmatch. Please try again later.'
              );
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  // Navigate to chat with a match
  const navigateToChat = (matchId: string) => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: matchId }
    });
  };
  
  // Render an empty state when there are no matches
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart" size={60} color="#ccc" />
      <Text style={styles.emptyTitle}>No Matches Yet</Text>
      <Text style={styles.emptyText}>
        When you match with someone, they'll appear here. Start swiping to find matches!
      </Text>
      <TouchableOpacity 
        style={styles.discoverButton}
        onPress={() => router.push('/(tabs)/discover')}
      >
        <Text style={styles.discoverButtonText}>
          Discover People
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render a match item
  const renderMatchItem = ({ item }: { item: any }) => {
    if (!currentUserId) return null;
    
    // Find the other user in the match
    const otherUserId = item.users.find((id: string) => id !== currentUserId);
    
    // In a real app, we'd fetch the other user's profile data
    // For this example, we'll use dummy data
    const dummyUsers: Record<string, any> = {
      'user1': {
        displayName: 'Alex Johnson',
        photoURL: 'https://randomuser.me/api/portraits/men/32.jpg',
        lastActive: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      },
      'user2': {
        displayName: 'Taylor Smith',
        photoURL: 'https://randomuser.me/api/portraits/women/44.jpg',
        lastActive: new Date(Date.now() - 25 * 60 * 1000) // 25 minutes ago
      },
      'user3': {
        displayName: 'Jamie Lee',
        photoURL: 'https://randomuser.me/api/portraits/women/68.jpg',
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      'user4': {
        displayName: 'Chris Morgan',
        photoURL: 'https://randomuser.me/api/portraits/men/79.jpg',
        lastActive: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      }
    };
    
    const otherUser = dummyUsers[otherUserId] || {
      displayName: 'User',
      photoURL: 'https://randomuser.me/api/portraits/lego/1.jpg',
      lastActive: new Date()
    };
    
    // Format last active time
    const formatLastActive = (date: Date) => {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 60) {
        return diffMins === 0 ? 'Just now' : `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else {
        return `${diffDays}d ago`;
      }
    };
    
    const lastActive = formatLastActive(otherUser.lastActive);
    
    return (
      <TouchableOpacity 
        style={styles.matchItem}
        onPress={() => navigateToChat(item.id)}
      >
        <Image
          source={{ uri: otherUser.photoURL }}
          style={styles.avatar}
        />
        <View style={styles.matchInfo}>
          <Text style={styles.matchName}>{otherUser.displayName}</Text>
          <Text style={styles.matchTimestamp}>
            Active {lastActive}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => handleUnmatch(item.id)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#666" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Matches</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5864" />
          <Text style={styles.loadingText}>Loading matches...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Matches</Text>
      </View>
      <FlatList
        data={matches}
        renderItem={renderMatchItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={matches.length === 0 ? { flex: 1 } : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  discoverButton: {
    backgroundColor: '#FF5864',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 30,
  },
  discoverButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  matchTimestamp: {
    fontSize: 14,
    color: '#666',
  },
  moreButton: {
    padding: 8,
  },
});