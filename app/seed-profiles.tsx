import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveUserProfile } from '@/utils/firebase';
import { UserProfile } from '@/types';

// Mock profiles to be created in Firestore
const mockProfiles: UserProfile[] = [
  {
    id: 'user1',
    displayName: 'Emma Wilson',
    age: 26,
    bio: 'Yoga instructor and CrossFit competitor. Looking for someone to train with and explore new trails.',
    images: ['https://randomuser.me/api/portraits/women/32.jpg', 'https://randomuser.me/api/portraits/women/33.jpg'],
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
    images: ['https://randomuser.me/api/portraits/women/44.jpg', 'https://randomuser.me/api/portraits/women/45.jpg'],
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
    images: ['https://randomuser.me/api/portraits/women/68.jpg', 'https://randomuser.me/api/portraits/women/69.jpg'],
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
    images: ['https://randomuser.me/api/portraits/men/79.jpg', 'https://randomuser.me/api/portraits/men/80.jpg'],
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
    images: ['https://randomuser.me/api/portraits/men/52.jpg', 'https://randomuser.me/api/portraits/men/53.jpg'],
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
    images: ['https://randomuser.me/api/portraits/women/90.jpg', 'https://randomuser.me/api/portraits/women/91.jpg'],
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
    images: ['https://randomuser.me/api/portraits/women/22.jpg', 'https://randomuser.me/api/portraits/women/23.jpg'],
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
    images: ['https://randomuser.me/api/portraits/men/34.jpg', 'https://randomuser.me/api/portraits/men/35.jpg'],
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
    images: ['https://randomuser.me/api/portraits/women/54.jpg', 'https://randomuser.me/api/portraits/women/55.jpg'],
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
    images: ['https://randomuser.me/api/portraits/men/62.jpg', 'https://randomuser.me/api/portraits/men/63.jpg'],
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
  const [results, setResults] = useState<{id: string, success: boolean, message: string}[]>([]);
  const [allCompleted, setAllCompleted] = useState(false);

  const handleSeedProfiles = async () => {
    setIsSeeding(true);
    setResults([]);
    setAllCompleted(false);
    
    const seedResults = [];
    
    for (const profile of allProfiles) {
      try {
        // Add a small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Store the user profile in Firestore
        await saveUserProfile(profile.id, {
          ...profile,
          // Convert images array to photos field for compatibility
          photos: profile.images,
          // Also keep images array for backward compatibility
          images: profile.images,
          // Add photoURL for single image use
          photoURL: profile.images?.[0] || '',
          verified: true
        });
        
        seedResults.push({
          id: profile.id,
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
          {isSeeding ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.seedButtonText}>
              {allCompleted ? 'Seed Profiles Again' : 'Seed Mock Profiles'}
            </Text>
          )}
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
}); 