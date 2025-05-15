import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, Text as RNText, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import Header from '@/components/ui/Header';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileSection from '@/components/profile/ProfileSection';
import ProfileAction from '@/components/profile/ProfileAction';
import { Settings, Bell, Shield, CircleHelp as HelpCircle, LogOut, RefreshCw, Wifi, Edit2 as Edit, Eye } from 'lucide-react-native';
import { useAuthStore } from '@/utils/authStore';
import { getUserProfile } from '@/utils/firebase';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCallback } from 'react';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuthStore();
  const { isInitialized } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Function to fetch user profile
  const fetchUserProfile = async () => {
    if (!user?.uid) {
      console.log('No user ID available for profile fetch');
      setError('You must be logged in to view your profile.');
      setProfileLoading(false);
      return;
    }
    
    try {
      setProfileLoading(true);
      setError(null);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timed out')), 10000);
      });
      
      console.log(`Attempting to fetch profile for user ID: ${user.uid}`);
      
      // Race the profile fetch against a timeout
      const profileData = await Promise.race([
        getUserProfile(user.uid),
        timeoutPromise
      ]) as any;
      
      console.log('Profile data fetched:', profileData ? 'success' : 'null');
      
      if (profileData) {
        setUserProfile(profileData);
      } else {
        // Use default profile if no data in Firestore yet
        console.log('No profile data found, using default');
        setUserProfile({
          id: user.uid,
          displayName: user.displayName || 'User',
          email: user.email,
          photoURL: user.photoURL,
          bio: 'Fitness enthusiast',
          age: 30,
          workoutFrequency: '4-5x/week',
          gymCheckIns: 0,
          interests: ['Weightlifting', 'Running', 'Yoga']
        });
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err.message || err);
      
      if (err.message === 'Profile fetch timed out') {
        setError('Loading profile timed out. Please check your connection and try again.');
      } else {
        setError(`Failed to load profile data: ${err.message || 'Unknown error'}`);
      }
      
      // Fall back to default profile on error
      setUserProfile({
        id: user?.uid || '',
        displayName: user?.displayName || 'User',
        email: user?.email,
        photoURL: user?.photoURL,
        bio: 'Fitness enthusiast',
        age: 30,
        workoutFrequency: '4-5x/week',
        gymCheckIns: 0,
        interests: ['Weightlifting', 'Running', 'Yoga']
      });
    } finally {
      setProfileLoading(false);
    }
  };
  
  // Effect to fetch profile data when user or initialization state changes
  useEffect(() => {
    console.log(`ProfileScreen: User initialized: ${isInitialized}, User exists: ${!!user}`);
    
    if (isInitialized) {
      fetchUserProfile();
    }
  }, [user, isInitialized]);
  
  // Refresh profile data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Profile screen focused, refreshing data');
      if (isInitialized && user) {
        fetchUserProfile();
      }
      return () => {
        // Cleanup if needed
      };
    }, [isInitialized, user])
  );
  
  const handleLogout = async () => {
    if (isLoading) return; // Prevent logout when loading
    
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Navigate to auth screen
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };
  
  const handleNavigateToSettings = () => {
    router.push('/settings');
  };
  
  const handleEditProfile = () => {
    router.push('/edit-profile');
  };
  
  const handleViewProfile = () => {
    router.push('/user-profile');
  };
  
  const handleRefresh = () => {
    fetchUserProfile();
  };

  // Build profile object from both Firebase Auth and Firestore profile data
  const profileData = userProfile ? {
    id: user?.uid || '',
    name: userProfile.name || user?.displayName || 'User',
    age: userProfile.age || 30,
    bio: userProfile.bio || 'Fitness enthusiast',
    photos: userProfile.photos || [user?.photoURL || 'https://via.placeholder.com/150'],
    verified: true,
    distance: 0,
    workoutFrequency: userProfile.workoutFrequency || '4-5x/week',
    gymCheckIns: userProfile.gymCheckIns || 0,
    interests: userProfile.interests || ['Weightlifting', 'Running', 'Yoga'],
    gender: userProfile.gender || 'Not specified'
  } : null;

  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <Header title="Profile" showSettingsButton onSettingsPress={handleNavigateToSettings} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <RNText style={styles.loadingText}>Initializing authentication...</RNText>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <Header title="Profile" showSettingsButton onSettingsPress={handleNavigateToSettings} />
        <View style={styles.errorContainer}>
          <RNText style={styles.errorText}>You need to sign in to view your profile.</RNText>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.replace('/(auth)/login')}
          >
            <RNText style={styles.buttonText}>Sign In</RNText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <Header title="Profile" showSettingsButton onSettingsPress={handleNavigateToSettings} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <RNText style={styles.loadingText}>Loading profile...</RNText>
        </View>
      </SafeAreaView>
    );
  }

  // Even if there's an error, show the profile if we have fallback data
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <Header title="Profile" showSettingsButton onSettingsPress={handleNavigateToSettings} />
      
      {error && (
        <View style={styles.errorBanner}>
          <RNText style={styles.errorBannerText}>{error}</RNText>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <RefreshCw size={16} color="#EF4444" />
            <RNText style={styles.refreshText}>Retry</RNText>
          </TouchableOpacity>
        </View>
      )}
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {profileData && <ProfileHeader user={profileData} />}
        
        <View style={styles.sections}>
          {/* View Profile Button */}
          <TouchableOpacity
            style={styles.viewProfileButton}
            onPress={handleViewProfile}
          >
            <Eye size={18} color="#FFFFFF" />
            <RNText style={styles.viewProfileButtonText}>View Profile Card</RNText>
          </TouchableOpacity>
          
          {/* Edit Profile Button */}
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={handleEditProfile}
          >
            <Edit size={18} color="#FFFFFF" />
            <RNText style={styles.editProfileButtonText}>Edit Profile</RNText>
          </TouchableOpacity>
          
          <ProfileSection title="Account">
            <ProfileAction
              icon={<Settings size={22} color="#6B7280" />}
              title="Settings"
              onPress={handleNavigateToSettings}
            />
            <ProfileAction
              icon={<Bell size={22} color="#6B7280" />}
              title="Notifications"
              onPress={() => {}}
            />
            <ProfileAction
              icon={<Shield size={22} color="#6B7280" />}
              title="Privacy"
              onPress={() => {}}
            />
          </ProfileSection>
          
          <ProfileSection title="Support">
            <ProfileAction
              icon={<HelpCircle size={22} color="#6B7280" />}
              title="Help Center"
              onPress={() => {}}
            />
            <ProfileAction
              icon={<Wifi size={22} color="#6B7280" />}
              title="Network Diagnostics"
              onPress={() => router.push('/diagnostics')}
            />
            <ProfileAction
              icon={<Settings size={22} color="#6B7280" />}
              title="Seed Test Profiles"
              onPress={() => router.push('/seed-profiles')}
            />
          </ProfileSection>
          
          <ProfileSection>
            <ProfileAction
              icon={<LogOut size={22} color="#EF4444" />}
              title="Log Out"
              titleColor="#EF4444"
              onPress={handleLogout}
            />
          </ProfileSection>
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 40,
  },
  sections: {
    padding: 16,
    gap: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EF4444',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBannerText: {
    fontSize: 14,
    color: '#EF4444',
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
  },
  refreshText: {
    fontSize: 14,
    color: '#EF4444',
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    textAlign: 'center',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  editProfileButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6', // Purple color for distinction
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  viewProfileButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
});