import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { X, Heart, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SuperLikeStatus } from '@/types';

type CardActionsProps = {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSuperLike: () => void;
  disabled?: boolean;
  superLikeStatus?: SuperLikeStatus | null;
};

export default function CardActions({ onSwipeLeft, onSwipeRight, onSuperLike, disabled = false, superLikeStatus }: CardActionsProps) {
  const handleSwipeLeft = () => {
    if (disabled) return;
    
    console.log("Action button: Swipe Left (Dislike)");
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSwipeLeft();
  };

  const handleSwipeRight = () => {
    if (disabled) return;
    
    console.log("Action button: Swipe Right (Like)");
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onSwipeRight();
  };

  const handleSuperLike = () => {
    if (disabled) return;
    
    // Check if user can use super like
    if (!superLikeStatus?.canUse) {
      console.log("Super Like disabled: No remaining super likes");
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      return;
    }
    
    console.log("Action button: Super Like");
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    onSuperLike();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, styles.nopeButton, disabled && styles.disabledButton]}
        onPress={handleSwipeLeft}
        activeOpacity={disabled ? 0.9 : 0.7}
        disabled={disabled}
      >
        <X size={30} color={disabled ? "#CCCCCC" : "#F87171"} />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.button, 
          styles.superlikeButton, 
          (disabled || !superLikeStatus?.canUse) && styles.disabledButton
        ]}
        onPress={handleSuperLike}
        activeOpacity={(disabled || !superLikeStatus?.canUse) ? 0.9 : 0.7}
        disabled={disabled || !superLikeStatus?.canUse}
      >
        <Star 
          size={30} 
          color={(disabled || !superLikeStatus?.canUse) ? "#CCCCCC" : "#60A5FA"} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.likeButton, disabled && styles.disabledButton]}
        onPress={handleSwipeRight}
        activeOpacity={disabled ? 0.9 : 0.7}
        disabled={disabled}
      >
        <Heart size={30} color={disabled ? "#CCCCCC" : "#FF5864"} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 55,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 26,
    paddingHorizontal: 10,
    zIndex: 10,
  },
  button: {
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
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
      }
    }),
  },
  disabledButton: {
    opacity: 0.5,
    borderColor: '#CCCCCC',
  },
  nopeButton: {
    borderWidth: 2,
    borderColor: '#F87171',
  },
  superlikeButton: {
    borderWidth: 2,
    borderColor: '#60A5FA',
  },
  likeButton: {
    borderWidth: 2,
    borderColor: '#FF5864',
  },
});