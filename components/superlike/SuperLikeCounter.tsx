import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSuperLikeStatus, subscribeToSuperLikeStatus, clearSuperLikeCache, resetSuperLikes, refreshSuperLikeData } from '@/services/superLikeService';
import { SuperLikeStatus } from '@/types';
import { getCurrentUser } from '@/utils/firebase';
import { Timestamp } from 'firebase/firestore';
import { checkNetworkStatus } from '@/utils/networkUtilsLite';
import NetInfo from '@react-native-community/netinfo';

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
    let retryTimeout: NodeJS.Timeout | null = null;
    let networkUnsubscribe: (() => void) | null = null;
    let lastNetworkState = true; // Assume online initially

    // Setup subscription with improved error handling
    const setupSubscription = async () => {
      try {
        setError(null); // Clear any previous errors
        
        // Initial load with better offline handling
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
          
          // Clear any error state when we get successful data
          setError(null);
          
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
        
        const errorObj = err as any;
        let errorMessage = 'Connection issue';
        
        // Provide more specific error messages
        if (errorObj?.message?.includes('offline')) {
          errorMessage = 'Offline';
        } else if (errorObj?.message?.includes('unavailable')) {
          errorMessage = 'Service unavailable';
        } else if (errorObj?.message?.includes('timeout')) {
          errorMessage = 'Timeout';
        }
        
        setError(errorMessage);
        setLoading(false);
        
        // Clear cache and schedule retry with exponential backoff
        clearSuperLikeCache();
        
        // Auto-retry with increasing delays (3s, 6s, 12s max)
        const retryDelay = Math.min(3000 * Math.pow(2, (retryTimeout ? 1 : 0)), 12000);
        
        retryTimeout = setTimeout(() => {
          if (user) {
            console.log('Retrying Super Like initialization...');
            setupSubscription();
          }
        }, retryDelay);
      }
    };

    // Setup network state monitoring to detect reconnections
    const setupNetworkMonitoring = () => {
      networkUnsubscribe = NetInfo.addEventListener(async (state) => {
        const isConnected = state.isConnected && state.isInternetReachable !== false;
        
        // Detect transition from offline to online
        if (!lastNetworkState && isConnected) {
          console.log('🔄 Network reconnected, refreshing Super Like data...');
          
          try {
            // Force refresh Super Like data after reconnection
            const refreshedStatus = await refreshSuperLikeData(user.uid);
            const status = convertSuperLikeStatus(refreshedStatus);
            setSuperLikeStatus(status);
            onStatusChange?.(status);
            setError(null);
            
            // Re-establish subscription
            if (unsubscribe) {
              unsubscribe();
            }
            setupSubscription();
          } catch (refreshError) {
            console.error('Failed to refresh Super Like data after reconnection:', refreshError);
            // Still try to re-establish subscription
            setupSubscription();
          }
        }
        
        lastNetworkState = isConnected;
      });
    };

    setupSubscription();
    setupNetworkMonitoring();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (networkUnsubscribe) {
        networkUnsubscribe();
      }
    };
  }, [onStatusChange]);

  // Format time remaining
  const formatTimeRemaining = (hours: number): string => {
    if (hours <= 0) {
      // Check if it's actually time to reset or if we're just having data issues
      if (superLikeStatus && superLikeStatus.resetTime) {
        const now = new Date();
        const resetTime = superLikeStatus.resetTime;
        
        // If reset time is actually in the past, show "Ready!"
        if (resetTime <= now) {
          return 'Ready!';
        }
      }
      return 'Resetting...';
    }
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

  const showDiagnosticInfo = async () => {
    try {
      const user = getCurrentUser();
      if (!user) {
        Alert.alert('Debug Info', 'No user authenticated');
        return;
      }

      const isOnline = await checkNetworkStatus();
      const currentStatus = superLikeStatus;
      
      const diagnosticInfo = [
        `User ID: ${user.uid}`,
        `Network: ${isOnline ? 'Online' : 'Offline'}`,
        `Loading: ${loading}`,
        `Error: ${error || 'None'}`,
        `Remaining: ${currentStatus?.remaining ?? 'Unknown'}`,
        `Total: ${currentStatus?.total ?? 'Unknown'}`,
        `Can Use: ${currentStatus?.canUse ?? 'Unknown'}`,
        `Hours Until Reset: ${currentStatus?.hoursUntilReset ?? 'Unknown'}`,
        `Reset Time: ${currentStatus?.resetTime ? new Date(currentStatus.resetTime).toLocaleString() : 'Unknown'}`,
        `Platform: ${require('react-native').Platform.OS}`,
      ].join('\n');

      Alert.alert(
        'Super Like Debug Info',
        diagnosticInfo,
        [
          { text: 'Close', style: 'cancel' },
          { 
            text: 'Clear Cache & Retry', 
            onPress: () => {
              clearSuperLikeCache();
              Alert.alert('Cache Cleared', 'Super Like cache has been cleared. The counter will refresh automatically.');
            }
          },
          {
            text: 'Reset Super Likes (Test)',
            style: 'destructive',
            onPress: async () => {
              try {
                await resetSuperLikes(user.uid);
                Alert.alert('Reset Complete', 'Super Likes have been reset to 3/3.');
              } catch (err) {
                Alert.alert('Reset Failed', `Error: ${(err as any)?.message || 'Unknown error'}`);
              }
            }
          }
        ]
      );
    } catch (err) {
      Alert.alert('Diagnostic Error', `Could not gather diagnostic info: ${(err as any)?.message || 'Unknown error'}`);
    }
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
          {error === 'Offline' ? '○' : '!'}
        </Text>
        {error === 'Offline' && (
          <Text style={[styles.timerText, { fontSize: config.fontSize - 2 }]}>
            Offline
          </Text>
        )}
      </View>
    );
  }

  const countColor = getCountColor(superLikeStatus.remaining, superLikeStatus.total);

  return (
    <View 
      style={[styles.container, { padding: config.containerPadding }, style]}
      onStartShouldSetResponder={() => true}
      onResponderGrant={() => {
        // Start long press timer
        const timer = setTimeout(showDiagnosticInfo, 2000); // 2 second long press
        return () => clearTimeout(timer);
      }}
    >
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