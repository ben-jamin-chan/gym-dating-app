import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Heart, X, Star } from 'lucide-react-native';
import { useProfileActions } from '@/hooks/useProfileActions';

interface ProfileActionsProps {
  currentUserId: string;
  targetUserId: string;
  isCurrentUser: boolean;
}

export function ProfileActions({ currentUserId, targetUserId, isCurrentUser }: ProfileActionsProps) {
  const { handleLike, handleSuperLike, handleDislike } = useProfileActions();

  if (isCurrentUser) {
    return null;
  }

  return (
    <View style={styles.actionButtons}>
      <TouchableOpacity 
        style={[styles.actionButton, styles.nopeButton]}
        onPress={() => handleDislike(currentUserId, targetUserId)}
      >
        <X size={30} color="#F87171" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.actionButton, styles.superlikeButton]}
        onPress={() => handleSuperLike(currentUserId, targetUserId)}
      >
        <Star size={30} color="#60A5FA" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.actionButton, styles.likeButton]}
        onPress={() => handleLike(currentUserId, targetUserId)}
      >
        <Heart size={30} color="#FF5864" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
}); 