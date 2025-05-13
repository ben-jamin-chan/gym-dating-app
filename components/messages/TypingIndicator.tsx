import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Image } from 'expo-image';

export default function TypingIndicator() {
  // Animated values for each dot
  const dot1 = React.useRef(new Animated.Value(0)).current;
  const dot2 = React.useRef(new Animated.Value(0)).current;
  const dot3 = React.useRef(new Animated.Value(0)).current;
  
  // Animation sequence
  useEffect(() => {
    const animate = () => {
      // Reset values
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
      
      // Create animation sequence
      Animated.sequence([
        // First dot
        Animated.timing(dot1, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        // Second dot
        Animated.timing(dot2, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        // Third dot
        Animated.timing(dot3, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Restart animation after a short delay
        setTimeout(animate, 600);
      });
    };
    
    animate();
    
    return () => {
      // Cleanup animations on component unmount
      dot1.stopAnimation();
      dot2.stopAnimation();
      dot3.stopAnimation();
    };
  }, [dot1, dot2, dot3]);
  
  // Interpolate animation values for each dot
  const translateY1 = dot1.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -6, 0],
  });
  
  const translateY2 = dot2.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -6, 0],
  });
  
  const translateY3 = dot3.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -6, 0],
  });
  
  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg' }}
          style={styles.avatar}
        />
      </View>
      
      <View style={styles.typingBubble}>
        <View style={styles.dotsContainer}>
          <Animated.View 
            style={[
              styles.dot, 
              { transform: [{ translateY: translateY1 }] }
            ]} 
          />
          <Animated.View 
            style={[
              styles.dot, 
              { transform: [{ translateY: translateY2 }] }
            ]} 
          />
          <Animated.View 
            style={[
              styles.dot, 
              { transform: [{ translateY: translateY3 }] }
            ]} 
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 8,
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopLeftRadius: 4,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 1,
    elevation: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
    marginHorizontal: 3,
  },
}); 