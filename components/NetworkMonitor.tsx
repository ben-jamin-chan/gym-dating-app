import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useChatStore } from '@/utils/chatStore';
import { usePendingMessages } from '@/utils/usePendingMessages';
import { useRouter } from 'expo-router';
import networkReconnectionManager from '@/utils/NetworkReconnectionManager';
import { processPendingLocationUpdates } from '@/utils/processPendingLocationUpdates';

const { width } = Dimensions.get('window');

export default function NetworkMonitor() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const translateY = useRef(new Animated.Value(-60)).current;
  const networkStatus = useChatStore(state => state.networkStatus);
  const lastNetworkStatus = useRef(networkStatus.isConnected);
  const lastNotificationTime = useRef(0);
  const processPendingMessages = usePendingMessages();
  const router = useRouter();
  
  useEffect(() => {
    // Only process if the network status changed or it's a real error
    if (networkStatus.isConnected !== lastNetworkStatus.current) {
      lastNetworkStatus.current = networkStatus.isConnected;
      
      // Don't show repeated notifications in a short time period (15 seconds instead of 5)
      const now = Date.now();
      if (now - lastNotificationTime.current < 15000 && visible) {
        return;
      }
      
      lastNotificationTime.current = now;
      
      // Show banner when offline
      if (!networkStatus.isConnected) {
        setVisible(true);
        setMessage('No internet connection. The app will continue to work in offline mode.');
        setIsError(true);
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } 
      // Show temporary message when coming back online
      else if (networkStatus.isConnected) {
        // Try to process any pending messages when coming back online
        processPendingMessages();
        
        // Also process any pending location updates
        processPendingLocationUpdates().catch(error => {
          console.warn('Error processing pending location updates:', error);
        });
        
        setVisible(true);
        setMessage('Connected! Syncing data...');
        setIsError(false);
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
        
        // Hide the "connected" message after 2 seconds instead of 3
        setTimeout(() => {
          Animated.timing(translateY, {
            toValue: -60,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setVisible(false);
          });
        }, 2000);
      }
    }
  }, [networkStatus.isConnected, visible, translateY, isError, processPendingMessages]);
  
  const navigateToDiagnostics = () => {
    router.push('/diagnostics');
  };
  
  const handleManualReconnect = async () => {
    setIsReconnecting(true);
    setMessage('Attempting to reconnect...');
    
    try {
      const success = await networkReconnectionManager.manualReconnect();
      
      if (success) {
        setMessage('Reconnection successful! Resuming connection...');
        setIsError(false);
        
        // Process any pending messages
        await processPendingMessages();
        
        // Process any pending location updates
        try {
          await processPendingLocationUpdates();
        } catch (error) {
          console.warn('Error processing pending location updates after reconnection:', error);
        }
        
        // Hide after 2 seconds
        setTimeout(() => {
          Animated.timing(translateY, {
            toValue: -60,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setVisible(false);
          });
        }, 2000);
      } else {
        setMessage('Reconnection failed. Please check your internet connection.');
        setIsError(true);
      }
    } catch (error) {
      console.error('Error during manual reconnection:', error);
      setMessage('Reconnection failed. Please try again later.');
      setIsError(true);
    } finally {
      setIsReconnecting(false);
    }
  };
  
  if (!visible) {
    return null;
  }
  
  return (
    <Animated.View 
      style={[
        styles.container,
        isError ? styles.errorContainer : styles.infoContainer,
        { transform: [{ translateY }] }
      ]}
    >
      <TouchableOpacity onPress={navigateToDiagnostics} style={styles.touchable}>
        <Text style={styles.text}>{message}</Text>
        {isError && (
          <Text style={styles.subText}>
            The app is running in offline mode. Location tracking and messages will sync when you're back online.
          </Text>
        )}
        {isError && (
          <TouchableOpacity 
            onPress={handleManualReconnect} 
            style={styles.reconnectButton}
            disabled={isReconnecting}
          >
            {isReconnecting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.reconnectButtonText}>Try Reconnecting</Text>
            )}
          </TouchableOpacity>
        )}
        <Text style={styles.diagLink}>Tap for diagnostics</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 40,
    paddingBottom: 10,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  errorContainer: {
    backgroundColor: '#ef4444',
  },
  infoContainer: {
    backgroundColor: '#10b981',
  },
  touchable: {
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  subText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
    textAlign: 'center',
  },
  diagLink: {
    color: 'white',
    fontSize: 12,
    marginTop: 6,
    textDecorationLine: 'underline',
    opacity: 0.8,
  },
  reconnectButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginTop: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  reconnectButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
}); 