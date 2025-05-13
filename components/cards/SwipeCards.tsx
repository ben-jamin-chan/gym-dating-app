import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, PanResponder, Animated } from 'react-native';
import ProfileCard from '@/components/cards/ProfileCard';
import CardActions from '@/components/cards/CardActions';
import { UserProfile } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
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
  
  // Animation values
  const position = useRef(new Animated.ValueXY()).current;
  const [overlay, setOverlay] = useState<'like' | 'nope' | 'superlike' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Reset when profiles change
  useEffect(() => {
    setCurrentIndex(0);
  }, [profiles]);

  // Handler for swiping a card
  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up') => {
    if (isAnimating || currentIndex >= profiles.length) return;
    
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
      animationTarget = { x: 0, y: -SCREEN_WIDTH * 1.2 };
      setOverlay('superlike');
    }
    
    // Animate the card off screen
    Animated.timing(position, {
      toValue: animationTarget,
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false
    }).start(() => {
      // Notify the parent component
      if (direction === 'left') {
        onSwipeLeft(profile.id);
      } else if (direction === 'right') {
        onSwipeRight(profile.id);
      } else {
        onSuperLike(profile.id);
      }
      
      // Reset animation state
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
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
      
      // Show overlay based on gesture
      if (gesture.dx > SWIPE_THRESHOLD) {
        setOverlay('like');
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        setOverlay('nope');
      } else if (gesture.dy < -SWIPE_THRESHOLD) {
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
      } else if (gesture.dy < -SWIPE_THRESHOLD) {
        handleSwipe('up');
      } else {
        resetPosition();
      }
    }
  });
  
  // Reset card position for cancelled swipes
  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      useNativeDriver: false
    }).start(() => {
      setOverlay(null);
    });
  };
  
  // Card rotation animation
  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
      outputRange: ['-30deg', '0deg', '30deg'],
    });
    
    return {
      ...position.getLayout(),
      transform: [{ rotate }]
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
      
      // Render the current card with animation
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
      
      // Render cards behind the current one
      return (
        <View 
          key={profile.id} 
          style={[styles.cardContainer, { top: 10 * (index - currentIndex) }]}
        >
          <ProfileCard profile={profile} />
        </View>
      );
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
      {renderCards()}
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
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  cardContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
    height: '75%',
    borderRadius: 20,
    overflow: 'hidden',
  },
});