import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { X, Heart, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

type CardActionsProps = {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSuperLike: () => void;
};

export default function CardActions({ onSwipeLeft, onSwipeRight, onSuperLike }: CardActionsProps) {
  const handleSwipeLeft = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSwipeLeft();
  };

  const handleSwipeRight = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onSwipeRight();
  };

  const handleSuperLike = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    onSuperLike();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, styles.nopeButton]}
        onPress={handleSwipeLeft}
      >
        <X size={30} color="#F87171" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.superlikeButton]}
        onPress={handleSuperLike}
      >
        <Star size={30} color="#60A5FA" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.likeButton]}
        onPress={handleSwipeRight}
      >
        <Heart size={30} color="#FF5864" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 16,
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
  superlikeButton: {
    borderWidth: 2,
    borderColor: '#60A5FA',
  },
  likeButton: {
    borderWidth: 2,
    borderColor: '#FF5864',
  },
});