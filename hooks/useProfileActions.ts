import { Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { recordSwipe } from '@/services/matchService';

interface ProfileActionsHook {
  handleLike: (currentUserId: string, targetUserId: string) => Promise<void>;
  handleSuperLike: (currentUserId: string, targetUserId: string) => Promise<void>;
  handleDislike: (currentUserId: string, targetUserId: string) => Promise<void>;
  handleMessage: (targetUserId: string) => void;
}

export function useProfileActions(): ProfileActionsHook {
  const router = useRouter();

  const navigateBackWithDelay = () => {
    setTimeout(() => {
      router.replace({
        pathname: '/(tabs)',
        params: { refresh: Date.now() }
      });
    }, 300);
  };

  const handleLike = async (currentUserId: string, targetUserId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    try {
      if (currentUserId && targetUserId) {
        console.log('Liked profile:', targetUserId);
        
        // Record the like in Firebase
        const matchResult = await recordSwipe(currentUserId, targetUserId, 'like');
        
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
      Alert.alert('Error', 'Failed to record like. Please try again.');
    }
    
    navigateBackWithDelay();
  };

  const handleSuperLike = async (currentUserId: string, targetUserId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    try {
      if (currentUserId && targetUserId) {
        console.log('Superliked profile:', targetUserId);
        
        // Record the superlike in Firebase
        const matchResult = await recordSwipe(currentUserId, targetUserId, 'superlike');
        
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
      Alert.alert('Error', 'Failed to record super like. Please try again.');
    }
    
    navigateBackWithDelay();
  };

  const handleDislike = async (currentUserId: string, targetUserId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      if (currentUserId && targetUserId) {
        console.log('Disliked profile:', targetUserId);
        
        // Record the pass in Firebase
        await recordSwipe(currentUserId, targetUserId, 'pass');
      }
    } catch (error) {
      console.error('Error recording dislike:', error);
      Alert.alert('Error', 'Failed to record dislike. Please try again.');
    }
    
    navigateBackWithDelay();
  };

  const handleMessage = (targetUserId: string) => {
    if (targetUserId) {
      router.push(`/chat/${targetUserId}`);
    }
  };

  return {
    handleLike,
    handleSuperLike,
    handleDislike,
    handleMessage,
  };
} 