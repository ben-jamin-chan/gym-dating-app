import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, ActivityIndicator, Image, TouchableOpacity, Dimensions, Platform, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';
import { Image as ExpoImage } from 'expo-image';
import { getUserProfile } from '@/utils/firebase';
import { useAuthStore } from '@/utils/authStore';
import { Heart, X, Star, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { recordSwipe } from '@/services/matchService';
import { calculateAge } from '@/utils/dateUtils';

// Default profile image URL as a fallback
const DEFAULT_PROFILE_IMAGE = 'https://randomuser.me/api/portraits/lego/1.jpg';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function UserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        // If no userId is provided, use the current user's ID
        const targetUserId = userId ? String(userId) : user?.uid;
        
        // Determine if this is the current user's profile
        setIsCurrentUser(targetUserId === user?.uid);
        
        if (!targetUserId) {
          throw new Error('No user ID available');
        }
        
        const profileData = await getUserProfile(targetUserId);
        if (profileData) {
          // Log profile data to debug image issues
          console.log('Profile data fetched:', JSON.stringify({
            id: profileData.id,
            photoURLs: profileData.photoURL,
            photos: profileData.photos,
            images: profileData.images
          }));
          
          // Normalize profile data to ensure consistent structure
          // Handle both "photos" and "images" fields for backward compatibility
          const normalizedProfile = {
            ...profileData,
            photos: profileData.photos || 
                   profileData.images || 
                   (profileData.photoURL ? [profileData.photoURL] : []),
            name: profileData.name || profileData.displayName,
            // Add additional normalizations
            gymCheckIns: profileData.gymCheckIns || 0,
            workoutFrequency: profileData.workoutFrequency || 'Not specified',
            interests: profileData.interests || [],
            age: profileData.age || 'N/A',
            bio: profileData.bio || 'No bio available',
            // Onboarding fields
            height: profileData.height || null,
            weight: profileData.weight || null,
            goal1: profileData.goal1 || '',
            goal2: profileData.goal2 || '',
            goal3: profileData.goal3 || '',
            intensity: profileData.intensity || 'Not specified',
            preferred_time: profileData.preferred_time || '',
            gym_name: profileData.gym_name || '',
            location: typeof profileData.location === 'string' 
              ? profileData.location 
              : (profileData.location ? 'Location available' : 'Location not available'),
          };
          setProfile(normalizedProfile);
          
          // Log normalized photos array for debugging
          console.log('Normalized photos array:', normalizedProfile.photos);
        } else {
          throw new Error('Profile not found');
        }
      } catch (err: any) {
        console.error('Error fetching profile:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [userId, user]);
  
  const handleNextImage = () => {
    const photos = profile?.photos || profile?.images || [];
    if (photos.length > 0) {
      setActiveImageIndex((prev) => (prev + 1) % photos.length);
    }
  };
  
  const handlePreviousImage = () => {
    const photos = profile?.photos || profile?.images || [];
    if (photos.length > 0) {
      setActiveImageIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  const handleGoBack = () => {
    router.back();
  };
  
  const handleLike = async () => {
    // Implement like functionality
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    try {
      if (user?.uid && profile?.id) {
        console.log('Liked profile:', profile.id);
        
        // Record the like in Firebase
        const matchResult = await recordSwipe(user.uid, profile.id, 'like');
        
        // If a match occurred, show a notification
        if (matchResult) {
          Alert.alert(
            'New Match! 🎉',
            'You have a new match! Start chatting now.',
            [
              { text: 'Later', style: 'cancel' },
              { 
                text: 'Chat Now', 
                onPress: () => {
                  router.push(`/chat/${matchResult.id}`);
                }
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error recording like:', error);
    }
    
    // Add a small delay before navigation for better UX
    setTimeout(() => {
      // Navigate back to discover tab with a refresh parameter, using replace instead of push
      router.replace({
        pathname: '/(tabs)',
        params: { refresh: Date.now() }
      });
    }, 300);
  };
  
  const handleSuperLike = async () => {
    // Implement superlike functionality
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    try {
      if (user?.uid && profile?.id) {
        console.log('Superliked profile:', profile.id);
        
        // Record the superlike in Firebase
        const matchResult = await recordSwipe(user.uid, profile.id, 'superlike');
        
        // If a match occurred, show a notification
        if (matchResult) {
          Alert.alert(
            'Super Match! ⭐️',
            'You have a new match! They know you super liked them!',
            [
              { text: 'Later', style: 'cancel' },
              { 
                text: 'Chat Now', 
                onPress: () => {
                  router.push(`/chat/${matchResult.id}`);
                }
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error recording superlike:', error);
    }
    
    // Add a small delay before navigation for better UX
    setTimeout(() => {
      // Navigate back to discover tab with a refresh parameter, using replace instead of push
      router.replace({
        pathname: '/(tabs)',
        params: { refresh: Date.now() }
      });
    }, 300);
  };
  
  const handleDislike = async () => {
    // Implement dislike functionality
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      if (user?.uid && profile?.id) {
        console.log('Disliked profile:', profile.id);
        
        // Record the pass in Firebase
        await recordSwipe(user.uid, profile.id, 'pass');
      }
    } catch (error) {
      console.error('Error recording dislike:', error);
    }
    
    // Add a small delay before navigation for better UX
    setTimeout(() => {
      // Navigate back to discover tab with a refresh parameter, using replace instead of push
      router.replace({
        pathname: '/(tabs)',
        params: { refresh: Date.now() }
      });
    }, 300);
  };
  
  const handleMessage = () => {
    // Navigate to chat with this user
    if (profile?.id) {
      router.push(`/chat/${profile.id}`);
    }
  };
  
  // Function to get a safe image URL with fallback
  const getSafeImageUrl = (index = 0) => {
    // Get the photos array (or empty array if none)
    const photos = profile?.photos || profile?.images || [];
    
    if (photos.length > 0 && photos[index] && typeof photos[index] === 'string') {
      if (photos[index].startsWith('http')) {
        console.log(`Using image at index ${index}:`, photos[index]);
        return photos[index];
      } else {
        console.log(`Invalid image URL at index ${index}:`, photos[index]);
      }
    } else {
      console.log('No valid photos array found or index out of bounds:', {
        photosLength: photos.length,
        requestedIndex: index,
        profile: profile ? 'Profile exists' : 'No profile'
      });
    }
    
    // Fallback to default if no valid image
    console.log('Using default profile image');
    return DEFAULT_PROFILE_IMAGE;
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={50} color="#EF4444" />
          <Text style={styles.errorText}>
            {error || 'Could not load profile'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleGoBack}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      
      {/* Image Gallery */}
      <View style={styles.imageContainer}>
        {(profile?.photos?.length > 0) || (profile?.images?.length > 0) ? (
          <>
            <Image 
              source={{ uri: getSafeImageUrl(activeImageIndex) }}
              style={styles.profileImage}
              resizeMode="cover"
              defaultSource={require('../assets/images/icon.png')}
            />
            {/* Image indicators */}
            <View style={styles.imageIndicators}>
              {(profile.photos || profile.images || []).map((_, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.imageIndicator, 
                    index === activeImageIndex && styles.activeImageIndicator
                  ]} 
                />
              ))}
            </View>
            
            {/* Navigation arrows for images */}
            <TouchableOpacity 
              style={[styles.imageNavButton, styles.leftNavButton]} 
              onPress={handlePreviousImage}
              disabled={(profile.photos || profile.images || []).length <= 1}
            >
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.imageNavButton, styles.rightNavButton]} 
              onPress={handleNextImage}
              disabled={(profile.photos || profile.images || []).length <= 1}
            >
              <Ionicons name="chevron-forward" size={24} color="white" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.noPhotoContainer}>
            <Image 
              source={{ uri: DEFAULT_PROFILE_IMAGE }}
              style={styles.defaultProfileImage}
              resizeMode="cover"
            />
            <Text style={styles.noPhotoText}>No profile photos</Text>
          </View>
        )}
        
        {/* Overlay gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.overlay}
        />
        
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="chevron-down" size={28} color="white" />
        </TouchableOpacity>
      </View>
      
      {/* Profile details */}
      <ScrollView style={styles.detailsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerInfo}>
          <View style={styles.nameAgeContainer}>
            <Text style={styles.name}>{profile.name || profile.displayName}</Text>
            <Text style={styles.age}>
              {profile.dateOfBirth ? calculateAge(profile.dateOfBirth) : profile.age}
            </Text>
          </View>
          {profile.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="white" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
        
        {/* Location and activity */}
        <View style={styles.locationContainer}>
          <View style={styles.infoItem}>
            <Ionicons name="barbell-outline" size={18} color="#9CA3AF" />
            <Text style={styles.infoText}>{profile.workoutFrequency || 'Not specified'}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={18} color="#9CA3AF" />
            <Text style={styles.infoText}>
              {profile.distance ? `${profile.distance} miles away` : 'Location not available'}
            </Text>
          </View>
        </View>
        
        {/* Bio section */}
        {profile.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}
        
        {/* Fitness Goals section */}
        {(profile.goal1 || profile.goal2 || profile.goal3) && (
          <View style={styles.goalsSection}>
            <Text style={styles.sectionTitle}>Fitness Goals</Text>
            <View style={styles.goalsList}>
              {profile.goal1 && (
                <View style={styles.goalItem}>
                  <Ionicons name="trophy-outline" size={18} color="#9CA3AF" />
                  <Text style={styles.goalText}>{profile.goal1}</Text>
                </View>
              )}
              {profile.goal2 && (
                <View style={styles.goalItem}>
                  <Ionicons name="trophy-outline" size={18} color="#9CA3AF" />
                  <Text style={styles.goalText}>{profile.goal2}</Text>
                </View>
              )}
              {profile.goal3 && (
                <View style={styles.goalItem}>
                  <Ionicons name="trophy-outline" size={18} color="#9CA3AF" />
                  <Text style={styles.goalText}>{profile.goal3}</Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        {/* Interests section */}
        {profile.interests && profile.interests.length > 0 && (
          <View style={styles.interestsSection}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.interestTags}>
              {profile.interests.map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* Workout stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Workout Stats</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.gymCheckIns || 0}</Text>
              <Text style={styles.statLabel}>Gym Check-ins</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.workoutFrequency || 'N/A'}</Text>
              <Text style={styles.statLabel}>Frequency</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.intensity || 'N/A'}</Text>
              <Text style={styles.statLabel}>Intensity</Text>
            </View>
          </View>
        </View>
        
        {/* Body Stats */}
        {(profile.height || profile.weight) && (
          <View style={styles.bodyStatsSection}>
            <Text style={styles.sectionTitle}>Body Stats</Text>
            <View style={styles.statsContainer}>
              {profile.height && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile.height}</Text>
                  <Text style={styles.statLabel}>Height (cm)</Text>
                </View>
              )}
              {profile.weight && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile.weight}</Text>
                  <Text style={styles.statLabel}>Weight (kg)</Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        {/* Gym Information */}
        {(profile.gym_name || profile.preferred_time || profile.location) && (
          <View style={styles.gymSection}>
            <Text style={styles.sectionTitle}>Gym Information</Text>
            {profile.gym_name && (
              <View style={styles.infoItem}>
                <Ionicons name="fitness-outline" size={18} color="#9CA3AF" />
                <Text style={styles.infoText}>{profile.gym_name}</Text>
              </View>
            )}
            {profile.location && (
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={18} color="#9CA3AF" />
                <Text style={styles.infoText}>{profile.location}</Text>
              </View>
            )}
            {profile.preferred_time && (
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={18} color="#9CA3AF" />
                <Text style={styles.infoText}>Preferred time: {profile.preferred_time}</Text>
              </View>
            )}
          </View>
        )}
        
        {/* Video if available */}
        {profile.video && (
          <View style={styles.videoSection}>
            <Text style={styles.sectionTitle}>Workout Video</Text>
            <Video
              source={{ uri: profile.video }}
              rate={1.0}
              volume={1.0}
              isMuted={false}
              resizeMode="cover"
              shouldPlay={false}
              useNativeControls
              style={styles.video}
            />
          </View>
        )}
        
        {/* Spacer to ensure content is scrollable past the action buttons */}
        <View style={{ height: 100 }} />
      </ScrollView>
      
      {/* Action buttons */}
      {!isCurrentUser && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.nopeButton]}
            onPress={handleDislike}
          >
            <X size={30} color="#F87171" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.superlikeButton]}
            onPress={handleSuperLike}
          >
            <Star size={30} color="#60A5FA" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.likeButton]}
            onPress={handleLike}
          >
            <Heart size={30} color="#FF5864" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageContainer: {
    height: SCREEN_HEIGHT * 0.55,
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#d1d5db', // Light gray background while loading
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageIndicators: {
    position: 'absolute',
    top: 50,
    left: 70,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  imageIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  activeImageIndicator: {
    backgroundColor: '#FFFFFF',
    width: 12,
  },
  imageNavButton: {
    position: 'absolute',
    top: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -20 }],
  },
  leftNavButton: {
    left: 10,
  },
  rightNavButton: {
    right: 10,
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nameAgeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 8,
  },
  age: {
    fontSize: 22,
    color: '#4B5563',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  bioSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  goalsSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  goalsList: {
    paddingHorizontal: 16,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  goalText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#374151',
  },
  interestsSection: {
    marginBottom: 20,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  interestText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  statsSection: {
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  videoSection: {
    marginBottom: 20,
  },
  video: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
      }
    }),
  },
  nopeButton: {
    borderWidth: 2,
    borderColor: '#F87171',
  },
  likeButton: {
    borderWidth: 2,
    borderColor: '#FF5864',
  },
  superlikeButton: {
    borderWidth: 2,
    borderColor: '#60A5FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noPhotoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  noPhotoText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  defaultProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
  },
  bodyStatsSection: {
    marginBottom: 24,
  },
  gymSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
}); 