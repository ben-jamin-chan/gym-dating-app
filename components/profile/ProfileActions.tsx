import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { Heart, X, Star, MessageCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { recordSwipe } from '@/services/matchService';

interface ProfileActionsProps {
  userId: string;
  profileId: string;
  onActionComplete?: () => void;
  isCurrentUser?: boolean;
}

export default function ProfileActions({ 
  userId, 
  profileId, 
  onActionComplete,
  isCurrentUser = false 
}: ProfileActionsProps) {
  const router = useRouter();

  const handleLike = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    try {
      if (userId && profileId) {
        console.log('Liked profile:', profileId);
        
        const matchResult = await recordSwipe(userId, profileId, 'like');
        
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
    
    setTimeout(() => {
      router.replace({
        pathname: '/(tabs)',
        params: { refresh: Date.now() }
      });
    }, 300);
  };

  const handleSuperLike = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    try {
      if (userId && profileId) {
        console.log('Superliked profile:', profileId);
        
        const matchResult = await recordSwipe(userId, profileId, 'superlike');
        
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
    
    setTimeout(() => {
      router.replace({
        pathname: '/(tabs)',
        params: { refresh: Date.now() }
      });
    }, 300);
  };

  const handleDislike = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      if (userId && profileId) {
        console.log('Disliked profile:', profileId);
        await recordSwipe(userId, profileId, 'pass');
      }
    } catch (error) {
      console.error('Error recording dislike:', error);
    }
    
    setTimeout(() => {
      router.replace({
        pathname: '/(tabs)',
        params: { refresh: Date.now() }
      });
    }, 300);
  };

  const handleMessage = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    console.log('Navigate to messages with:', profileId);
    router.push(`/chat/${profileId}`);
  };

  if (isCurrentUser) {
    return null; // Don't show action buttons for current user's own profile
  }

  return (
    <View style={styles.actionsContainer}>
      <TouchableOpacity 
        style={[styles.actionButton, styles.dislikeButton]}
        onPress={handleDislike}
      >
        <X size={28} color="#FF4458" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.actionButton, styles.superlikeButton]}
        onPress={handleSuperLike}
      >
        <Star size={28} color="#60A5FA" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.actionButton, styles.likeButton]}
        onPress={handleLike}
      >
        <Heart size={28} color="#4ADE80" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.actionButton, styles.messageButton]}
        onPress={handleMessage}
      >
        <MessageCircle size={28} color="#8B5CF6" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 2,
  },
  dislikeButton: {
    borderColor: '#FF4458',
  },
  superlikeButton: {
    borderColor: '#60A5FA',
  },
  likeButton: {
    borderColor: '#4ADE80',
  },
  messageButton: {
    borderColor: '#8B5CF6',
  },
}); 