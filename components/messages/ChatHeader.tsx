import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, User } from 'lucide-react-native';
import { Conversation } from '@/types';

type ChatHeaderProps = {
  conversation: Conversation;
};

export default function ChatHeader({ conversation }: ChatHeaderProps) {
  // Default values and safety checks
  const defaultPhotoUrl = 'https://via.placeholder.com/40x40';
  
  // Safely check if user object and properties exist
  const userPhoto = conversation?.user?.photo || defaultPhotoUrl;
  const isUserOnline = conversation?.user?.online || false;
  const userName = conversation?.user?.name || 'User';
  const userId = conversation?.user?.id || conversation?.userId || 'unknown';
  const userDistance = conversation?.user?.distance || 3; // Default to 3 km if not provided
  
  const handleBack = () => {
    router.back();
  };
  
  const handleViewProfile = () => {
    // Check if we're dealing with a test user or real profile
    if (userId === 'unknown' || userName === 'User') {
      Alert.alert(
        "Test Profile",
        "This is a test or mock profile for development purposes. There's no actual user profile to display.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // Navigate to the user's profile page
    try {
      router.push(`/user-profile?userId=${userId}`);
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert(
        "Navigation Error",
        "Unable to view this user's profile at this time.",
        [{ text: "OK" }]
      );
    }
  };
  
  // Get exact distance in km
  const getDistanceDisplay = () => {
    if (userId === 'unknown' || userName === 'User') {
      // For test profiles
      return `${userDistance} km away`;
    }
    
    // For real profiles with actual distance data
    if (typeof userDistance === 'number') {
      return `${userDistance} km away`;
    }
    
    return "Distance unavailable";
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <ChevronLeft size={26} color="#FFFFFF" />
      </TouchableOpacity>
      
      <View style={styles.profileContainer}>
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: userPhoto }} 
            style={styles.avatar} 
          />
          {isUserOnline && <View style={styles.onlineIndicator} />}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.name}>{userName}</Text>
          <Text style={styles.distance}>{getDistanceDisplay()}</Text>
          <Text style={styles.status}>
            {isUserOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.profileButton} onPress={handleViewProfile}>
        <User size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  profileContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  distance: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#E0E7FF',
    marginTop: 1,
    marginBottom: 1,
  },
  status: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#E0E7FF',
  },
  profileButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
}); 