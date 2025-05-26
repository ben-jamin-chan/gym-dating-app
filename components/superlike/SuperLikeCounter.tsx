import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSuperLikeStatus, subscribeToSuperLikeStatus, clearSuperLikeCache } from '@/services/superLikeService';
import { SuperLikeStatus } from '@/types';
import { getCurrentUser } from '@/utils/firebase';
import { Timestamp } from 'firebase/firestore';

interface SuperLikeCounterProps {
  style?: any;
  size?: 'small' | 'medium' | 'large';
  showTimer?: boolean;
  onStatusChange?: (status: SuperLikeStatus) => void;
}

export default function SuperLikeCounter({ 
  style, 
  size = 'medium', 
  showTimer = true,
  onStatusChange 
}: SuperLikeCounterProps) {
  const [superLikeStatus, setSuperLikeStatus] = useState<SuperLikeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pulseAnim = new Animated.Value(1);

  // Size configurations
  const sizeConfig = {
    small: {
      iconSize: 16,
      fontSize: 12,
      containerPadding: 6,
    },
    medium: {
      iconSize: 20,
      fontSize: 14,
      containerPadding: 8,
    },
    large: {
      iconSize: 24,
      fontSize: 16,
      containerPadding: 10,
    },
  };

  const config = sizeConfig[size];

  // Convert service SuperLikeStatus (with Timestamp) to component SuperLikeStatus (with Date)
  const convertSuperLikeStatus = (serviceStatus: any): SuperLikeStatus => {
    return {
      ...serviceStatus,
      resetTime: serviceStatus.resetTime instanceof Timestamp 
        ? serviceStatus.resetTime.toDate() 
        : serviceStatus.resetTime
    };
  };

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    // Setup subscription
    const setupSubscription = async () => {
      try {
        // Initial load
        const serviceStatus = await getSuperLikeStatus(user.uid);
        const status = convertSuperLikeStatus(serviceStatus);
        setSuperLikeStatus(status);
        onStatusChange?.(status);
        setLoading(false);

        // Subscribe to real-time updates
        unsubscribe = await subscribeToSuperLikeStatus(user.uid, (serviceStatus) => {
          const status = convertSuperLikeStatus(serviceStatus);
          setSuperLikeStatus(status);
          onStatusChange?.(status);
          
          // Pulse animation when count changes
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        });
      } catch (err) {
        console.error('Error setting up Super Like subscription:', err);
        
        // Clear cache and retry once on error
        clearSuperLikeCache();
        
        // Set error state with retry capability
        setError('Connection issue');
        setLoading(false);
        
        // Auto-retry after a short delay
        setTimeout(() => {
          if (user) {
            console.log('Retrying Super Like initialization...');
            setupSubscription();
          }
        }, 3000);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [onStatusChange]);

  // Format time remaining
  const formatTimeRemaining = (hours: number): string => {
    if (hours <= 0) return 'Resetting...';
    if (hours < 1) return '< 1h';
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  // Get color based on remaining count
  const getCountColor = (remaining: number, total: number): string => {
    const ratio = remaining / total;
    if (ratio <= 0) return '#999';
    if (ratio <= 0.33) return '#FF5864';
    if (ratio <= 0.66) return '#FFA500';
    return '#60A5FA'; // Changed from green to blue to match superlike action button
  };

  if (loading) {
    return (
      <View style={[styles.container, { padding: config.containerPadding }, style]}>
        <Ionicons name="star" size={config.iconSize} color="#ccc" />
        <Text style={[styles.countText, { fontSize: config.fontSize, color: '#ccc' }]}>
          -
        </Text>
      </View>
    );
  }

  if (error || !superLikeStatus) {
    return (
      <View style={[styles.container, { padding: config.containerPadding }, style]}>
        <Ionicons name="star-outline" size={config.iconSize} color="#999" />
        <Text style={[styles.countText, { fontSize: config.fontSize, color: '#999' }]}>
          !
        </Text>
      </View>
    );
  }

  const countColor = getCountColor(superLikeStatus.remaining, superLikeStatus.total);

  return (
    <View style={[styles.container, { padding: config.containerPadding }, style]}>
      <Animated.View 
        style={[
          styles.iconContainer,
          { transform: [{ scale: pulseAnim }] }
        ]}
      >
        <Ionicons 
          name={superLikeStatus.remaining > 0 ? "star" : "star-outline"} 
          size={config.iconSize} 
          color={countColor}
        />
      </Animated.View>
      
      <Text style={[styles.countText, { fontSize: config.fontSize, color: countColor }]}>
        {superLikeStatus.remaining}
      </Text>
      
      {showTimer && superLikeStatus.remaining === 0 && (
        <Text style={[styles.timerText, { fontSize: config.fontSize - 2 }]}>
          {formatTimeRemaining(superLikeStatus.hoursUntilReset)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    marginRight: 4,
  },
  countText: {
    fontWeight: 'bold',
    marginRight: 4,
  },
  timerText: {
    color: '#666',
    fontWeight: '500',
    marginLeft: 4,
  },
}); 