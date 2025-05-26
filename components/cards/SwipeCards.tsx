import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions, PanResponder, Animated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import ProfileCard from '@/components/cards/ProfileCard';
import CardActions from '@/components/cards/CardActions';
import { UserProfile, SuperLikeStatus } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_UP_THRESHOLD = SCREEN_HEIGHT * 0.1;
const SWIPE_OUT_DURATION = 300; // Increased for smoother animation

type SwipeCardsProps = {
  profiles: UserProfile[];
  onSwipeLeft: (id: string) => void;
  onSwipeRight: (id: string) => void;
  onSuperLike: (id: string) => void;
  superLikeStatus?: SuperLikeStatus | null;
};

export default function SwipeCards({ profiles, onSwipeLeft, onSwipeRight, onSuperLike, superLikeStatus }: SwipeCardsProps) {
  // Track the current card index
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Animation values with separate refs to prevent mutation issues
  const position = useRef(new Animated.ValueXY()).current;
  const [overlay, setOverlay] = useState<'like' | 'nope' | 'superlike' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const gestureInProgress = useRef(false);
  
  // Reset when profiles change
  useEffect(() => {
    setCurrentIndex(0);
    position.setValue({ x: 0, y: 0 });
    setOverlay(null);
    
    return () => {
      position.setValue({ x: 0, y: 0 });
    };
  }, [profiles]);

  // Handle overlay display based on position
  const updateOverlay = useCallback((dx: number, dy: number) => {
    if (dx > SWIPE_THRESHOLD) {
      setOverlay('like');
    } else if (dx < -SWIPE_THRESHOLD) {
      setOverlay('nope');
            } else if (dy < -SWIPE_UP_THRESHOLD && superLikeStatus?.canUse) {
          setOverlay('superlike');
        } else {
          setOverlay(null);
        }
  }, [superLikeStatus]);

  // Handler for swiping a card
  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up') => {
    if (isAnimating || currentIndex >= profiles.length) return;
    
    // Check if Super Like is available before processing up swipe
    if (direction === 'up' && (!superLikeStatus?.canUse)) {
      console.log('Super Like not available, resetting card position');
      // Provide haptic feedback for failed superlike attempt
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      resetPosition();
      return;
    }
    
    setIsAnimating(true);
    
    // Get the profile to swipe
    const profile = profiles[currentIndex];
    
    // Set the animation target based on direction
    let animationTarget;
    if (direction === 'left') {
      animationTarget = { x: -SCREEN_WIDTH * 1.5, y: 0 };
      setOverlay('nope');
    } else if (direction === 'right') {
      animationTarget = { x: SCREEN_WIDTH * 1.5, y: 0 };
      setOverlay('like');
    } else {
      animationTarget = { x: 0, y: -SCREEN_HEIGHT * 1.2 };
      setOverlay('superlike');
    }
    
    // Create a single animation to avoid conflicts
    Animated.timing(position, {
      toValue: animationTarget,
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: true,
    }).start(({ finished }) => {
      // Only proceed if animation completed
      if (finished) {
        // Reset position immediately
        position.setValue({ x: 0, y: 0 });
        
        // Notify the parent component
        if (direction === 'left') {
          onSwipeLeft(profile.id);
        } else if (direction === 'right') {
          onSwipeRight(profile.id);
        } else {
          onSuperLike(profile.id);
        }
        
        // Move to the next card
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        
        // Check if we've run out of profiles
        if (nextIndex >= profiles.length) {
          onSwipeLeft("-1");
        }
        
        // Reset overlay after a slight delay to avoid flashing
        setTimeout(() => {
          setOverlay(null);
          setIsAnimating(false);
        }, 50);
      }
    });
  }, [currentIndex, isAnimating, onSwipeLeft, onSwipeRight, onSuperLike, profiles, superLikeStatus]);
  
  // Reset card position for cancelled swipes
  const resetPosition = useCallback(() => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 7, // Higher friction for smoother reset
      tension: 40,
      useNativeDriver: true,
      restDisplacementThreshold: 0.01, // More precise reset
      restSpeedThreshold: 0.01, // More precise reset
    }).start(() => {
      // Only clear overlay if animation actually finishes
      setOverlay(null);
    });
  }, [position]);
  
  // Pan responder with improved gesture handling
  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating,
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Only respond to intentional movement to avoid stuttering
        return !isAnimating && (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5);
      },
      onPanResponderGrant: () => {
        gestureInProgress.current = true;
      },
      onPanResponderMove: (_, gesture) => {
        // Update position directly to avoid timing issues
        position.setValue({ x: gesture.dx, y: gesture.dy });
        updateOverlay(gesture.dx, gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        gestureInProgress.current = false;
        
        // Base decision on both distance and velocity
        const swipeRight = gesture.dx > SWIPE_THRESHOLD || (gesture.dx > SCREEN_WIDTH * 0.15 && gesture.vx > 0.3);
        const swipeLeft = gesture.dx < -SWIPE_THRESHOLD || (gesture.dx < -SCREEN_WIDTH * 0.15 && gesture.vx < -0.3);
        const swipeUp = gesture.dy < -SWIPE_UP_THRESHOLD || (gesture.dy < -SCREEN_HEIGHT * 0.07 && gesture.vy < -0.3);
        
        if (swipeRight) {
          handleSwipe('right');
        } else if (swipeLeft) {
          handleSwipe('left');
        } else if (swipeUp && superLikeStatus?.canUse) {
          handleSwipe('up');
        } else {
          resetPosition();
        }
      },
      onPanResponderTerminate: () => {
        gestureInProgress.current = false;
        resetPosition();
      }
    }), [isAnimating, handleSwipe, resetPosition, updateOverlay]);
  
  // Card rotation and transform
  const getCardStyle = () => {
    // Apply rotation based on horizontal position
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
      outputRange: ['-25deg', '0deg', '25deg'],
      extrapolate: 'clamp',
    });
    
    // Apply slight scale effect for visual feedback
    const scale = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH * 1.5, -SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD, SCREEN_WIDTH * 1.5],
      outputRange: [0.93, 0.95, 1, 0.95, 0.93],
      extrapolate: 'clamp',
    });
    
    return {
      transform: [
        { translateX: position.x },
        { translateY: position.y },
        { rotate },
        { scale }
      ]
    };
  };
  
  // Render all cards
  const renderCards = () => {
    if (profiles.length === 0 || currentIndex >= profiles.length) {
      return null;
    }
    
    return profiles.map((profile, index) => {
      // Don't render cards that have been swiped
      if (index < currentIndex) {
        return null;
      }
      
      // Only show the current card with animation
      if (index === currentIndex) {
        return (
          <Animated.View
            key={profile.id}
            style={[styles.cardContainer, getCardStyle()]}
            {...panResponder.panHandlers}
          >
            <ProfileCard profile={profile} overlay={overlay} />
          </Animated.View>
        );
      }
      
      // Render the next card behind for a stacked effect
      if (index === currentIndex + 1) {
        return (
          <View 
            key={profile.id} 
            style={[styles.cardContainer, styles.nextCard]}
          >
            <ProfileCard profile={profile} />
          </View>
        );
      }
      
      return null;
    }).reverse();
  };
  
  // Button handlers
  const handleSwipeLeft = useCallback(() => {
    if (!gestureInProgress.current) {
      handleSwipe('left');
    }
  }, [handleSwipe]);
  
  const handleSwipeRight = useCallback(() => {
    if (!gestureInProgress.current) {
      handleSwipe('right');
    }
  }, [handleSwipe]);
  
  const handleSuperLike = useCallback(() => {
    if (!gestureInProgress.current && superLikeStatus?.canUse) {
      handleSwipe('up');
    } else if (!superLikeStatus?.canUse) {
      console.log('Super Like button pressed but no Super Likes available');
    }
  }, [handleSwipe, superLikeStatus]);

  return (
    <View style={styles.container}>
      <View style={styles.cardsContainer}>
        {renderCards()}
      </View>
      <CardActions 
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        onSuperLike={handleSuperLike}
        disabled={isAnimating}
        superLikeStatus={superLikeStatus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  cardsContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: -10,
  },
  cardContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.98,
    maxWidth: 450, 
    height: '85%',
    borderRadius: 12,
    overflow: 'hidden',
    top: '0%',
    backgroundColor: '#fff', // Ensure cards have a background color
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextCard: {
    opacity: 0.65,
    transform: [{ scale: 0.95 }],
    top: '2%',
    zIndex: -1,
  }
});