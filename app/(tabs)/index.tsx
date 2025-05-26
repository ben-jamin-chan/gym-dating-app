import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import SwipeCards from '@/components/cards/SwipeCards';
import SuperLikeCounter from '@/components/superlike/SuperLikeCounter';
import { UserProfile, SuperLikeStatus } from '@/types';
import { getCurrentUser } from '@/utils/firebase';
import { recordSwipe, getSwipedUsers, getPotentialMatchesWithPreferences } from '@/services/matchService';
import { notificationService } from '@/services/notificationServiceSafe';
import { getCurrentUserPreferences } from '@/services/preferencesService';
import { getSuperLikeStatus } from '@/services/superLikeService';
import { useLocalSearchParams } from 'expo-router';

export default function DiscoverScreen() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [noMoreProfiles, setNoMoreProfiles] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [superLikeStatus, setSuperLikeStatus] = useState<SuperLikeStatus | null>(null);
  const { refresh } = useLocalSearchParams();

  // Register for push notifications when the screen loads
  useEffect(() => {
    const registerForNotifications = async () => {
      try {
        await notificationService.registerForPushNotifications();
      } catch (error) {
        console.error('Error registering for push notifications:', error);
      }
    };
    
    registerForNotifications();
  }, []);

  // Get the current user ID
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUserId(user.uid);
    }
  }, []);

  // Fetch potential matches whenever the screen comes into focus or refresh param changes
  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        fetchPotentialMatches();
      }
      
      return () => {
        // Cleanup if needed - this ensures we don't have animation conflicts when refreshing
        console.log('Cleaning up animations on screen blur');
      };
    }, [currentUserId, refresh])
  );

  // Function to fetch potential matches from Firebase
  const fetchPotentialMatches = async () => {
    if (!currentUserId) return;
    
    setLoading(true);
    
    try {
      console.log('Fetching potential matches for user:', currentUserId);
      
      // Get users that have been swiped on
      const swipedUsers = await getSwipedUsers(currentUserId);
      console.log(`User has swiped on ${swipedUsers.length} profiles:`, swipedUsers);
      
      // Get real profiles from Firestore using our updated function
      const matchedProfiles = await getPotentialMatchesWithPreferences(currentUserId);
      
      // Log the results for debugging
      console.log(`Fetched ${matchedProfiles.length} potential matches`);
      
      if (matchedProfiles.length === 0) {
        console.log('No profiles found, setting noMoreProfiles to true');
        setNoMoreProfiles(true);
      } else {
        console.log('Profiles found, updating state');
        console.log('Profile IDs:', matchedProfiles.map(p => p.id));
        setProfiles(matchedProfiles);
        setNoMoreProfiles(false);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching potential matches:', error);
      setLoading(false);
      Alert.alert(
        'Error',
        'Failed to load profiles. Please try again later.'
      );
    }
  };

  // Handle user swipe left (pass)
  const handleSwipeLeft = async (userId: string) => {
    if (!currentUserId) return;
    
    try {
      // If we reached the end of profiles
      if (userId === "-1") {
        setNoMoreProfiles(true);
        return;
      }
      
      // Record the pass in Firebase
      await recordSwipe(currentUserId, userId, 'pass');
      
      // If we're running low on profiles, fetch more
      if (profiles.length <= 2) {
        fetchPotentialMatches();
      }
    } catch (error) {
      console.error('Error recording swipe left:', error);
      Alert.alert(
        'Error',
        'Failed to record your response. Please try again.'
      );
    }
  };

  // Handle user swipe right (like)
  const handleSwipeRight = async (userId: string) => {
    if (!currentUserId) return;
    
    try {
      // If we reached the end of profiles
      if (userId === "-1") {
        setNoMoreProfiles(true);
        return;
      }
      
      // Record the like in Firebase
      const matchResult = await recordSwipe(currentUserId, userId, 'like');
      
      // If a match occurred, show a notification
      if (matchResult) {
        Alert.alert(
          'New Match! 🎉',
          'You have a new match! Start chatting now.',
          [
            { 
              text: 'Later', 
              style: 'cancel' 
            },
            { 
              text: 'Chat Now', 
              onPress: () => {
                // Navigate to chat screen with the match
                // This would be implemented in a real app
                console.log('Navigate to chat with match:', matchResult.id);
              }
            }
          ]
        );
      }
      
      // If we're running low on profiles, fetch more
      if (profiles.length <= 2) {
        fetchPotentialMatches();
      }
    } catch (error) {
      console.error('Error recording swipe right:', error);
      Alert.alert(
        'Error',
        'Failed to record your response. Please try again.'
      );
    }
  };

  // Handle user super like
  const handleSuperLike = async (userId: string) => {
    if (!currentUserId) return;
    
    try {
      // If we reached the end of profiles
      if (userId === "-1") {
        setNoMoreProfiles(true);
        return;
      }
      
      // Check if user can super like before attempting
      if (!superLikeStatus?.canUse) {
        console.log('Super Like attempted but none available - showing alert');
        Alert.alert(
          'No Super Likes Available',
          `You've used all your Super Likes for today. They will reset in ${superLikeStatus?.hoursUntilReset || 0} hours.`,
          [{ 
            text: 'OK',
            onPress: () => {
              console.log('Super Like alert dismissed - user should continue swiping normally');
            }
          }]
        );
        return;
      }
      
      // Record the super like in Firebase
      const matchResult = await recordSwipe(currentUserId, userId, 'superlike');
      
      // If a match occurred, show a notification
      if (matchResult) {
        Alert.alert(
          'Super Match! ⭐️',
          'You have a new match! They know you super liked them!',
          [
            { 
              text: 'Later', 
              style: 'cancel' 
            },
            { 
              text: 'Chat Now', 
              onPress: () => {
                // Navigate to chat screen with the match
                // This would be implemented in a real app
                console.log('Navigate to chat with match:', matchResult.id);
              }
            }
          ]
        );
      } else {
        // Show a confirmation that the super like was sent
        Alert.alert(
          'Super Like Sent! ⭐️',
          'Your Super Like has been sent! If they like you back, you\'ll get a match.',
          [{ text: 'OK' }]
        );
      }
      
      // If we're running low on profiles, fetch more
      if (profiles.length <= 2) {
        fetchPotentialMatches();
      }
    } catch (error) {
      console.error('Error recording super like:', error);
      
      // Type guard for error handling
      const errorObj = error as any;
      console.log('🔴 [' + new Date().toISOString() + '] ERROR: Error recording super like:', {
        code: errorObj?.code,
        name: errorObj?.name,
        message: errorObj?.message
      });
      
      // Extract user-friendly error message
      let errorMessage = 'Failed to record your response. Please try again.';
      if (errorObj?.message?.includes('super like') || errorObj?.message?.includes('Super Like')) {
        errorMessage = errorObj.message;
      } else if (errorObj?.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your connection and try again.';
      } else if (errorObj?.message) {
        errorMessage = errorObj.message;
      }
      
      Alert.alert(
        'Super Like Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    }
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.appTitle}>SwoleMates</Text>
          <SuperLikeCounter 
            size="medium" 
            showTimer={true}
            onStatusChange={setSuperLikeStatus}
            style={styles.superLikeCounter}
          />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5864" />
          <Text style={styles.loadingText}>Loading profiles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render no more profiles state
  if (noMoreProfiles) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.appTitle}>SwoleMates</Text>
          <SuperLikeCounter 
            size="medium" 
            showTimer={true}
            onStatusChange={setSuperLikeStatus}
            style={styles.superLikeCounter}
          />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="search" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>No More Profiles</Text>
          <Text style={styles.emptyText}>
            We've run out of profiles for now. Check back later for new matches!
          </Text>
          <View style={styles.refreshButton}>
            <Text 
              style={styles.refreshButtonText}
              onPress={fetchPotentialMatches}
            >
              Refresh
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Render the swipe cards
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.appTitle}>SwoleMates</Text>
        <SuperLikeCounter 
          size="medium" 
          showTimer={true}
          onStatusChange={setSuperLikeStatus}
          style={styles.superLikeCounter}
        />
      </View>
      
      <View style={styles.cardsContainer}>
        <SwipeCards
          profiles={profiles}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onSuperLike={handleSuperLike}
          superLikeStatus={superLikeStatus}
        />
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF5864',
    flex: 1,
  },
  superLikeCounter: {
    marginLeft: 16,
  },
  cardsContainer: {
    flex: 1,
    marginTop: 10,
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
  refreshButton: {
    backgroundColor: '#FF5864',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 30,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});