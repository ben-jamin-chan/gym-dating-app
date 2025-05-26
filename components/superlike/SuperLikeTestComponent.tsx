import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { getCurrentUser } from '@/utils/firebase';
import { getSuperLikeStatus, useSuperLike, resetSuperLikes } from '@/services/superLikeService';
import { SuperLikeStatus } from '@/types';
import { Timestamp } from 'firebase/firestore';

export default function SuperLikeTestComponent() {
  const [status, setStatus] = useState<SuperLikeStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const user = getCurrentUser();
  const userId = user?.uid;

  // Convert Firestore Timestamp to Date for UI display
  const convertStatus = (firebaseStatus: any): SuperLikeStatus => ({
    ...firebaseStatus,
    resetTime: firebaseStatus.resetTime instanceof Timestamp 
      ? firebaseStatus.resetTime.toDate() 
      : firebaseStatus.resetTime
  });

  const loadStatus = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const result = await getSuperLikeStatus(userId);
      setStatus(convertStatus(result));
    } catch (error) {
      console.error('Error loading status:', error);
      Alert.alert('Error', 'Failed to load Super Like status');
    }
    setLoading(false);
  };

  const testUseSuperLike = async () => {
    if (!userId) {
      Alert.alert('Error', 'No user logged in');
      return;
    }
    
    setLoading(true);
    try {
      // Use a test target user ID
      const testTargetId = 'test_user_' + Date.now();
      await useSuperLike(userId, testTargetId);
      Alert.alert('Success', 'Super Like used successfully!');
      await loadStatus(); // Reload status
    } catch (error) {
      console.error('Error using super like:', error);
      const errorObj = error as any;
      Alert.alert('Error', errorObj?.message || 'Failed to use Super Like');
    }
    setLoading(false);
  };

  const testReset = async () => {
    if (!userId) {
      Alert.alert('Error', 'No user logged in');
      return;
    }
    
    setLoading(true);
    try {
      await resetSuperLikes(userId);
      Alert.alert('Success', 'Super Likes reset successfully!');
      await loadStatus(); // Reload status
    } catch (error) {
      console.error('Error resetting:', error);
      const errorObj = error as any;
      Alert.alert('Error', errorObj?.message || 'Failed to reset Super Likes');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStatus();
  }, [userId]);

  if (!userId) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>No user logged in</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Super Like Test</Text>
      
      {status && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Remaining: {status.remaining}</Text>
          <Text style={styles.statusText}>Total: {status.total}</Text>
          <Text style={styles.statusText}>Can Use: {status.canUse ? 'Yes' : 'No'}</Text>
          <Text style={styles.statusText}>Hours Until Reset: {status.hoursUntilReset}</Text>
          <Text style={styles.statusText}>
            Reset Time: {status.resetTime instanceof Date 
              ? status.resetTime.toLocaleString() 
              : 'Unknown'}
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, loading && styles.disabled]} 
          onPress={loadStatus}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Refresh Status</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, (loading || !status?.canUse) && styles.disabled]} 
          onPress={testUseSuperLike}
          disabled={loading || !status?.canUse}
        >
          <Text style={styles.buttonText}>Use Super Like</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.resetButton, loading && styles.disabled]} 
          onPress={testReset}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Reset (Test)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  buttonContainer: {
    gap: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#FF3B30',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 