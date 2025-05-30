import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveUserProfile, getCurrentUser } from '@/utils/firebase';
import { UserProfile } from '@/types';

// Mock profiles to be created in Firestore
const mockProfiles: UserProfile[] = [
  {
    id: 'user1',
    displayName: 'Emma Wilson',
    age: 26,
    bio: 'Yoga instructor and CrossFit competitor. Looking for someone to train with and explore new trails.',
    images: ['https://i.pinimg.com/564x/e5/20/08/e520081e08b851bf7758ec3ee87eb891.jpg', 'https://randomuser.me/api/portraits/women/33.jpg'],
    interests: ['CrossFit', 'Yoga', 'Nutrition', 'Hiking'],
    gender: 'Female',
    workoutFrequency: 'Daily',
    gymCheckIns: 45,
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
    images: ['https://ifbbproofficial.com/wp-content/uploads/2024/08/Categorie-IFBB-Elite-Pro-Women-Bodyfitness.jpeg', 'https://randomuser.me/api/portraits/women/45.jpg'],
    interests: ['Fitness', 'Running', 'Nutrition'],
    gender: 'Female',
    workoutFrequency: '3-5x/week',
    gymCheckIns: 28,
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
    images: ['https://www.greatestphysiques.com/wp-content/uploads/2018/01/Larry-Wheels.07.jpg', 'https://randomuser.me/api/portraits/women/69.jpg'],
    interests: ['Crossfit', 'Climbing', 'Protein Shakes'],
    gender: 'Female',
    workoutFrequency: 'Daily',
    gymCheckIns: 62,
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
    images: ['https://ifbbproofficial.com/wp-content/uploads/2024/08/Categorie-IFBB-Elite-Pro-Women-Bodyfitness.jpeg', 'https://randomuser.me/api/portraits/men/80.jpg'],
    interests: ['Weightlifting', 'Boxing', 'Meal Prep'],
    gender: 'Male',
    workoutFrequency: '3-5x/week',
    gymCheckIns: 34,
    location: {
      latitude: 37.7855,
      longitude: -122.4012
    }
  },
  {
    id: 'user5',
    displayName: 'Mike Johnson',
    age: 32,
    bio: 'Marathon runner and yoga enthusiast. Looking for a workout partner with similar interests.',
    images: ['https://www.greatestphysiques.com/wp-content/uploads/2017/05/Long-Wu-06.jpg', 'https://randomuser.me/api/portraits/men/53.jpg'],
    interests: ['Running', 'Yoga', 'Nutrition'],
    gender: 'Male',
    workoutFrequency: 'Daily',
    gymCheckIns: 49,
    location: {
      latitude: 37.7935,
      longitude: -122.3980
    }
  },
  {
    id: 'user6',
    displayName: 'Alex Chen',
    age: 24,
    bio: 'Part-time fitness instructor, full-time fitness enthusiast. Love trying new workout classes!',
    images: ['https://www.evogennutrition.com/cdn/shop/articles/Evogen_Elite_Signs_IFBB_Pro_League_Star_Derek_Lunsford_1200x1200_f550c491-91b4-4294-af69-151bda2c7ec5_1200x1200.jpg?v=1614281193', 'https://randomuser.me/api/portraits/women/91.jpg'],
    interests: ['HIIT', 'Pilates', 'Dancing'],
    gender: 'Female',
    workoutFrequency: '1-2x/week',
    gymCheckIns: 15,
    location: {
      latitude: 37.8044,
      longitude: -122.4151
    }
  }
];

// Additional mock profiles
const additionalProfiles: UserProfile[] = [
  {
    id: 'user7',
    displayName: 'Sophie Walker',
    age: 28,
    bio: 'Powerlifting champion and nutrition coach. Looking for someone who appreciates good form in the gym and in life.',
    images: ['https://i.pinimg.com/564x/e5/20/08/e520081e08b851bf7758ec3ee87eb891.jpg', 'https://randomuser.me/api/portraits/women/23.jpg'],
    interests: ['Powerlifting', 'Nutrition', 'Recovery', 'Cooking'],
    gender: 'Female',
    workoutFrequency: '3-5x/week',
    gymCheckIns: 37,
    location: {
      latitude: 37.7838,
      longitude: -122.4090
    }
  },
  {
    id: 'user8',
    displayName: 'David Kim',
    age: 31,
    bio: 'Olympic weightlifter and sports medicine doctor. I believe in balanced training and active recovery.',
    images: ['https://ifbbproofficial.com/wp-content/uploads/2024/08/Categorie-IFBB-Elite-Pro-Women-Bodyfitness.jpeg', 'https://randomuser.me/api/portraits/men/35.jpg'],
    interests: ['Olympic Weightlifting', 'Mobility', 'Sports Medicine'],
    gender: 'Male',
    workoutFrequency: 'Daily',
    gymCheckIns: 53,
    location: {
      latitude: 37.7899,
      longitude: -122.4103
    }
  },
  {
    id: 'user9',
    displayName: 'Rachel Green',
    age: 26,
    bio: 'Avid hiker and outdoor enthusiast. Can\'t get enough of trail running and mountain views.',
    images: ['https://www.evogennutrition.com/cdn/shop/articles/Evogen_Elite_Signs_IFBB_Pro_League_Star_Derek_Lunsford_1200x1200_f550c491-91b4-4294-af69-151bda2c7ec5_1200x1200.jpg?v=1614281193', 'https://randomuser.me/api/portraits/women/91.jpg', 'https://randomuser.me/api/portraits/women/55.jpg'],
    interests: ['Hiking', 'Trail Running', 'Rock Climbing'],
    gender: 'Female',
    workoutFrequency: '3-5x/week',
    gymCheckIns: 22,
    location: {
      latitude: 37.7752,
      longitude: -122.4232
    }
  },
  {
    id: 'user10',
    displayName: 'Marcus Wilson',
    age: 33,
    bio: 'Former pro basketball player, now a fitness coach. Looking for someone who enjoys competitive sports.',
    images: ['https://i.pinimg.com/564x/e5/20/08/e520081e08b851bf7758ec3ee87eb891.jpg', 'https://randomuser.me/api/portraits/men/63.jpg'],
    interests: ['Basketball', 'Coaching', 'HIIT', 'Team Sports'],
    gender: 'Male',
    workoutFrequency: 'Daily',
    gymCheckIns: 67,
    location: {
      latitude: 37.7957,
      longitude: -122.3942
    }
  }
];

// Combine all profiles
const allProfiles = [...mockProfiles, ...additionalProfiles];

export default function SeedProfilesScreen() {
  const router = useRouter();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);
  const [isDeletingMockProfiles, setIsDeletingMockProfiles] = useState(false);
  const [results, setResults] = useState<{id: string, success: boolean, message: string}[]>([]);
  const [allCompleted, setAllCompleted] = useState(false);

  const handleSeedProfiles = async () => {
    setIsSeeding(true);
    setResults([]);
    setAllCompleted(false);
    
    const seedResults = [];
    const timestamp = Date.now(); // Add timestamp to make IDs unique
    const currentUser = getCurrentUser();
    const userId = currentUser ? currentUser.uid : 'nouser';
    
    for (const profile of allProfiles) {
      try {
        // Add a small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Create a unique ID with timestamp and current user ID to avoid conflicts
        const uniqueId = `test_${userId.slice(0,5)}_${profile.id}_${timestamp}`;
        
        // Store the user profile in Firestore
        await saveUserProfile(uniqueId, {
          ...profile,
          id: uniqueId, // Update the ID field as well
          // Convert images array to photos field for compatibility
          photos: profile.images,
          // Also keep images array for backward compatibility
          images: profile.images,
          // Add photoURL for single image use
          photoURL: profile.images?.[0] || '',
          verified: true,
          // Add timestamp to ensure it's seen as a new profile
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        seedResults.push({
          id: uniqueId,
          success: true,
          message: `Profile for ${profile.displayName} created successfully`
        });
      } catch (error: any) {
        seedResults.push({
          id: profile.id,
          success: false,
          message: `Error creating profile for ${profile.displayName}: ${error.message}`
        });
      }
      
      // Update results after each profile
      setResults([...seedResults]);
    }
    
    setIsSeeding(false);
    setAllCompleted(true);
    
    // Show completion alert
    Alert.alert(
      'Seeding Complete',
      `Successfully created ${seedResults.filter(r => r.success).length} out of ${allProfiles.length} profiles.`,
      [{ text: 'OK' }]
    );
  };

  // Function to reset swipes for the current user
  const handleResetSwipes = async () => {
    try {
      setIsResetting(true);
      
      // Get the current user
      const user = getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'No user is logged in');
        setIsResetting(false);
        return;
      }
      
      // Import necessary Firebase functions
      const { collection, query, where, getDocs, deleteDoc, doc } = require('firebase/firestore');
      const { db } = require('@/utils/firebase');
      
      // Get all swipes by the current user
      const swipesRef = collection(db, 'swipes');
      const q = query(swipesRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      // Delete each swipe document
      const deletePromises = [];
      querySnapshot.forEach((document) => {
        deletePromises.push(deleteDoc(doc(db, 'swipes', document.id)));
      });
      
      await Promise.all(deletePromises);
      
      setIsResetting(false);
      
      Alert.alert(
        'Swipes Reset',
        `Successfully reset ${querySnapshot.size} swipes.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error resetting swipes:', error);
      setIsResetting(false);
      
      Alert.alert(
        'Error',
        `Failed to reset swipes: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
  };

  // Function to reset ALL swipes in the database
  const handleResetAllSwipes = async () => {
    try {
      setIsResettingAll(true);
      
      // Import necessary Firebase functions
      const { collection, getDocs, deleteDoc, doc } = require('firebase/firestore');
      const { db } = require('@/utils/firebase');
      
      // Get ALL swipes from the swipes collection
      const swipesRef = collection(db, 'swipes');
      const querySnapshot = await getDocs(swipesRef);
      
      // Delete each swipe document
      const deletePromises = [];
      querySnapshot.forEach((document) => {
        deletePromises.push(deleteDoc(doc(db, 'swipes', document.id)));
      });
      
      await Promise.all(deletePromises);
      
      setIsResettingAll(false);
      
      Alert.alert(
        'All Swipes Reset',
        `Successfully reset ${querySnapshot.size} swipes for all users.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error resetting all swipes:', error);
      setIsResettingAll(false);
      
      Alert.alert(
        'Error',
        `Failed to reset all swipes: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
  };

  // Function to delete all mock profiles from the database
  const handleDeleteAllMockProfiles = async () => {
    Alert.alert(
      'Delete All Mock Profiles',
      'This will permanently delete ALL mock/test profiles from the discover page. This action cannot be undone. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeletingMockProfiles(true);
              
              // Import necessary Firebase functions
              const { collection, getDocs, deleteDoc, doc, query, where } = require('firebase/firestore');
              const { db } = require('@/utils/firebase');
              
              // Get all users from the users collection
              const usersRef = collection(db, 'users');
              const querySnapshot = await getDocs(usersRef);
              
                             // Filter and delete profiles that start with 'test_'
              const deletePromises: Promise<void>[] = [];
              let mockProfileCount = 0;
              
              querySnapshot.forEach((document: any) => {
                const userId = document.id;
                
                // Check if this is a mock profile (starts with 'test_')
                if (userId.startsWith('test_')) {
                  deletePromises.push(deleteDoc(doc(db, 'users', document.id)));
                  mockProfileCount++;
                }
              });
              
              // Execute all deletions
              if (deletePromises.length > 0) {
                await Promise.all(deletePromises);
              }
              
              setIsDeletingMockProfiles(false);
              
              Alert.alert(
                'Mock Profiles Deleted',
                `Successfully deleted ${mockProfileCount} mock profiles from the discover page.`,
                [{ text: 'OK' }]
              );
            } catch (error: any) {
              console.error('Error deleting mock profiles:', error);
              setIsDeletingMockProfiles(false);
              
              Alert.alert(
                'Error',
                `Failed to delete mock profiles: ${error.message}`,
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Seed Mock Profiles',
        headerShown: true 
      }} />
      <StatusBar style="auto" />
      
      <View style={styles.content}>
        <Text style={styles.title}>Profile Seeder</Text>
        <Text style={styles.description}>
          This screen will create mock user profiles in Firestore for testing purposes.
          It will create {allProfiles.length} different profiles with various interests and attributes.
        </Text>
        
        <TouchableOpacity 
          style={[
            styles.seedButton, 
            isSeeding && styles.seedButtonDisabled
          ]}
          onPress={handleSeedProfiles}
          disabled={isSeeding}
        >
          <Text style={styles.seedButtonText}>
            {isSeeding ? 'Creating Profiles...' : 'Create Test Profiles'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.resetButton, 
            isResetting && styles.seedButtonDisabled
          ]}
          onPress={handleResetSwipes}
          disabled={isResetting}
        >
          <Text style={styles.seedButtonText}>
            {isResetting ? 'Resetting My Swipes...' : 'Reset My Swipes'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.resetAllButton, 
            isResettingAll && styles.seedButtonDisabled
          ]}
          onPress={handleResetAllSwipes}
          disabled={isResettingAll}
        >
          <Text style={styles.seedButtonText}>
            {isResettingAll ? 'Resetting All Swipes...' : 'Reset ALL Swipes (Testing)'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.deleteAllProfilesButton, 
            isDeletingMockProfiles && styles.seedButtonDisabled
          ]}
          onPress={handleDeleteAllMockProfiles}
          disabled={isDeletingMockProfiles}
        >
          <Text style={styles.seedButtonText}>
            {isDeletingMockProfiles ? 'Deleting Mock Profiles...' : 'Delete ALL Mock Profiles'}
          </Text>
        </TouchableOpacity>
        
        {results.length > 0 && (
          <ScrollView style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Results:</Text>
            {results.map((result, index) => (
              <View 
                key={index} 
                style={[
                  styles.resultItem, 
                  result.success ? styles.successItem : styles.errorItem
                ]}
              >
                <Text style={styles.resultText}>{result.message}</Text>
              </View>
            ))}
          </ScrollView>
        )}
        
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
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
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    fontFamily: 'Inter-Bold',
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 24,
    lineHeight: 24,
    fontFamily: 'Inter-Regular',
  },
  seedButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  seedButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  seedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  resultsContainer: {
    flex: 1,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1F2937',
    fontFamily: 'Inter-SemiBold',
  },
  resultItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  successItem: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  errorItem: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  resultText: {
    fontSize: 14,
    color: '#1F2937',
    fontFamily: 'Inter-Regular',
  },
  backButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  resetButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  resetAllButton: {
    backgroundColor: '#EC4899', // Different color to indicate this is a "danger" action
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  deleteAllProfilesButton: {
    backgroundColor: '#DC2626', // Red color to indicate this is a destructive action
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
}); 