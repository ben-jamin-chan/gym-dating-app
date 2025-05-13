import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import SwipeCards from '@/components/cards/SwipeCards';
import { UserProfile } from '@/types';
import { getCurrentUser } from '@/utils/firebase';
import { recordSwipe, getSwipedUsers, registerForPushNotifications } from '@/services/matchService';

export default function DiscoverScreen() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [noMoreProfiles, setNoMoreProfiles] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Register for push notifications when the screen loads
  useEffect(() => {
    const registerForNotifications = async () => {
      try {
        await registerForPushNotifications();
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

  // Fetch potential matches whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        fetchPotentialMatches();
      }
      
      return () => {
        // Cleanup if needed
      };
    }, [currentUserId])
  );

  // Function to fetch potential matches from Firebase
  const fetchPotentialMatches = async () => {
    if (!currentUserId) return;
    
    setLoading(true);
    
    try {
      // Get list of users the current user has already swiped on
      const swipedUserIds = await getSwipedUsers(currentUserId);
      
      // In a real app, you would query Firestore for users matching criteria
      // and filter out users already swiped on
      // For this example, we'll create some dummy profiles
      
      // Simulate a Firestore query
      setTimeout(() => {
        const dummyProfiles: UserProfile[] = [
          {
            id: 'user1',
            displayName: 'Emma Wilson',
            age: 26,
            bio: 'Yoga instructor and CrossFit competitor. Looking for someone to train with and explore new trails.',
            images: ['https://randomuser.me/api/portraits/women/32.jpg'],
            interests: ['CrossFit', 'Yoga', 'Nutrition', 'Hiking'],
            location: {
              latitude: 37.7749,
              longitude: -122.4194
            }
          },
          {
            id: 'user2',
            displayName: 'Taylor Smith',
            age: 27,
            bio: 'Personal trainer who loves outdoor activities and trying new workout routines.',
            images: ['https://randomuser.me/api/portraits/women/44.jpg'],
            interests: ['Fitness', 'Running', 'Nutrition'],
            location: {
              latitude: 37.7833,
              longitude: -122.4167
            }
          },
          {
            id: 'user3',
            displayName: 'Jamie Lee',
            age: 30,
            bio: 'Crossfit coach and mountain climber. Looking for a gym buddy who enjoys protein shakes!',
            images: ['https://randomuser.me/api/portraits/women/68.jpg'],
            interests: ['Crossfit', 'Climbing', 'Protein Shakes'],
            location: {
              latitude: 37.7694,
              longitude: -122.4862
            }
          },
          {
            id: 'user4',
            displayName: 'Chris Morgan',
            age: 29,
            bio: 'Gym owner and fitness blogger who never skips leg day. Coffee enthusiast.',
            images: ['https://randomuser.me/api/portraits/men/79.jpg'],
            interests: ['Weightlifting', 'Boxing', 'Meal Prep'],
            location: {
              latitude: 37.7855,
              longitude: -122.4012
            }
          }
        ];
        
        // Filter out already swiped users
        const filteredProfiles = dummyProfiles.filter(
          profile => !swipedUserIds.includes(profile.id) && profile.id !== currentUserId
        );
        
        setProfiles(filteredProfiles);
        setNoMoreProfiles(filteredProfiles.length === 0);
        setLoading(false);
      }, 1000);
      
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
      }
      
      // If we're running low on profiles, fetch more
      if (profiles.length <= 2) {
        fetchPotentialMatches();
      }
    } catch (error) {
      console.error('Error recording super like:', error);
      Alert.alert(
        'Error',
        'Failed to record your response. Please try again.'
      );
    }
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <Text style={styles.appTitle}>SwoleMates</Text>
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
        <Text style={styles.appTitle}>SwoleMates</Text>
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
      <Text style={styles.appTitle}>SwoleMates</Text>
      <View style={styles.cardsContainer}>
        <SwipeCards
          profiles={profiles}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onSuperLike={handleSuperLike}
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
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF5864',
    textAlign: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
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