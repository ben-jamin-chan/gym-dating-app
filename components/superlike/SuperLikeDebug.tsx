import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { getCurrentUser } from '@/utils/firebase';
import { 
  getSuperLikeStatus, 
  useSuperLike, 
  resetSuperLikes, 
  clearSuperLikeCache,
  initializeSuperLikeData 
} from '@/services/superLikeService';

export default function SuperLikeDebug() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const currentUser = getCurrentUser();
  const userId = currentUser?.uid;

  const handleGetStatus = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const result = await getSuperLikeStatus(userId);
      setStatus(result);
      console.log('Super Like Status:', result);
    } catch (error) {
      console.error('Error getting status:', error);
      const errorObj = error as any;
      Alert.alert('Error', errorObj?.message || 'Unknown error');
    }
    setLoading(false);
  };

  const handleUseSuperLike = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Use a test target user ID
      const testTargetId = 'test_user_' + Date.now();
      await useSuperLike(userId, testTargetId);
      Alert.alert('Success', 'Super Like used successfully!');
      // Refresh status
      handleGetStatus();
    } catch (error) {
      console.error('Error using super like:', error);
      const errorObj = error as any;
      Alert.alert('Error', errorObj?.message || 'Unknown error');
    }
    setLoading(false);
  };

  const handleReset = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      await resetSuperLikes(userId);
      Alert.alert('Success', 'Super Likes reset!');
      // Refresh status
      handleGetStatus();
    } catch (error) {
      console.error('Error resetting:', error);
      const errorObj = error as any;
      Alert.alert('Error', errorObj?.message || 'Unknown error');
    }
    setLoading(false);
  };

  const handleClearCache = () => {
    clearSuperLikeCache();
    Alert.alert('Success', 'Cache cleared!');
  };

  const handleInitialize = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const result = await initializeSuperLikeData(userId);
      console.log('Initialized data:', result);
      Alert.alert('Success', 'Data initialized!');
      handleGetStatus();
    } catch (error) {
      console.error('Error initializing:', error);
      const errorObj = error as any;
      Alert.alert('Error', errorObj?.message || 'Unknown error');
    }
    setLoading(false);
  };

  if (!userId) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Not authenticated</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Super Like Debug</Text>
      <Text style={styles.userId}>User: {userId}</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, loading && styles.disabled]} 
          onPress={handleGetStatus}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Get Status</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, loading && styles.disabled]} 
          onPress={handleInitialize}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Initialize</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, loading && styles.disabled]} 
          onPress={handleUseSuperLike}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Use Super Like</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, loading && styles.disabled]} 
          onPress={handleReset}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={handleClearCache}
        >
          <Text style={styles.buttonText}>Clear Cache</Text>
        </TouchableOpacity>
      </View>

      {status && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Current Status:</Text>
          <Text style={styles.statusText}>Remaining: {status.remaining}</Text>
          <Text style={styles.statusText}>Total: {status.total}</Text>
          <Text style={styles.statusText}>Can Use: {status.canUse ? 'Yes' : 'No'}</Text>
          <Text style={styles.statusText}>Hours Until Reset: {status.hoursUntilReset}</Text>
          <Text style={styles.statusText}>Reset Time: {status.resetTime?.toDate?.()?.toLocaleString() || 'Unknown'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  userId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#FF5864',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#666',
  },
  disabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 5,
  },
}); 