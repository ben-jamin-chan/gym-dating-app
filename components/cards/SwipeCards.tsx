import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, PanResponder, Animated, Platform } from 'react-native';
import ProfileCard from '@/components/cards/ProfileCard';
import CardActions from '@/components/cards/CardActions';
import { UserProfile } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.15;
const SWIPE_UP_THRESHOLD = SCREEN_HEIGHT * 0.08;
const SWIPE_OUT_DURATION = 250;

type SwipeCardsProps = {
  profiles: UserProfile[];
  onSwipeLeft: (id: string) => void;
  onSwipeRight: (id: string) => void;
  onSuperLike: (id: string) => void;
};

export default function SwipeCards({ profiles, onSwipeLeft, onSwipeRight, onSuperLike }: SwipeCardsProps) {
  // Track the current card index
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Animation values - create a new ValueXY for each animation cycle to avoid conflicts
  const position = useRef(new Animated.ValueXY()).current;
  const [overlay, setOverlay] = useState<'like' | 'nope' | 'superlike' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Reset when profiles change
  useEffect(() => {
    setCurrentIndex(0);
    
    // Reset position when component re-renders
    position.setValue({ x: 0, y: 0 });
    
    return () => {
      // Cleanup animations on unmount
      position.setValue({ x: 0, y: 0 });
    };
  }, [profiles]);

  // Handler for swiping a card
  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up') => {
    if (isAnimating || currentIndex >= profiles.length) return;
    
    console.log(`Swiping ${direction} for profile ${profiles[currentIndex]?.id}`);
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
    
    // Create a new animation
    Animated.timing(position, {
      toValue: animationTarget,
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false, // Must be false to avoid 'top/left' errors
    }).start(() => {
      // Notify the parent component
      if (direction === 'left') {
        onSwipeLeft(profile.id);
      } else if (direction === 'right') {
        onSwipeRight(profile.id);
      } else {
        onSuperLike(profile.id);
      }
      
      // Reset animation state - do this manually to avoid animation conflicts
      position.setValue({ x: 0, y: 0 });
      setOverlay(null);
      
      // Move to the next card
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      
      // Check if we've run out of profiles
      if (nextIndex >= profiles.length) {
        onSwipeLeft("-1");
      }
      
      // Wait a short time before allowing new swipes
      setTimeout(() => {
        setIsAnimating(false);
      }, 100);
    });
  }, [currentIndex, isAnimating, onSwipeLeft, onSwipeRight, onSuperLike, position, profiles]);
  
  // Pan responder for gesture handling
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !isAnimating,
    onMoveShouldSetPanResponder: () => !isAnimating,
    onPanResponderGrant: () => {
      // Optional: Add any logic for when touch starts
    },
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
      
      // Show overlay based on gesture
      if (gesture.dx > SWIPE_THRESHOLD) {
        setOverlay('like');
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        setOverlay('nope');
      } else if (gesture.dy < -SWIPE_UP_THRESHOLD) {
        setOverlay('superlike');
      } else {
        setOverlay(null);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) {
        handleSwipe('right');
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        handleSwipe('left');
      } else if (gesture.dy < -SWIPE_UP_THRESHOLD) {
        handleSwipe('up');
      } else {
        resetPosition();
      }
    },
    onPanResponderTerminate: () => {
      resetPosition();
    }
  });
  
  // Reset card position for cancelled swipes
  const resetPosition = () => {
    // Make sure we're using the same driver setting as in handleSwipe
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      useNativeDriver: false, // Must match the setting in handleSwipe
      tension: 40, // Lower tension for smoother reset animation
    }).start(() => {
      setOverlay(null);
    });
  };
  
  // Card rotation animation - simplified to avoid transform conflicts
  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
      outputRange: ['-30deg', '0deg', '30deg'],
    });
    
    return {
      transform: [
        { translateX: position.x },
        { translateY: position.y },
        { rotate }
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
      
      // Only show the current card
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
      
      // Render next card but make it invisible until current card is swiped
      // Only render the next card (index === currentIndex + 1) to improve performance
      if (index === currentIndex + 1) {
        return (
          <View 
            key={profile.id} 
            style={[
              styles.cardContainer, 
              styles.hiddenCard
            ]}
          >
            <ProfileCard profile={profile} />
          </View>
        );
      }
      
      // Don't render any other cards
      return null;
    }).reverse();
  };
  
  // Button handlers
  const handleSwipeLeft = useCallback(() => {
    handleSwipe('left');
  }, [handleSwipe]);
  
  const handleSwipeRight = useCallback(() => {
    handleSwipe('right');
  }, [handleSwipe]);
  
  const handleSuperLike = useCallback(() => {
    handleSwipe('up');
  }, [handleSwipe]);

  return (
    <View style={styles.container}>
      <View style={styles.cardsContainer}>
        {renderCards()}
      </View>
      <CardActions 
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        onSuperLike={handleSuperLike}
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
    marginTop: -10, // Pull cards up slightly to reduce top gap
  },
  cardContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.98, // Wider to fill more horizontal space
    maxWidth: 450, 
    height: '85%',     // Taller to fill more vertical space
    borderRadius: 12,  // Reduced borderRadius for more screen space
    overflow: 'hidden',
    top: '0%',         // Position at the top
  },
  hiddenCard: {
    opacity: 0,
    zIndex: -1,
  }
});