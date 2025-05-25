import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationTest() {
  const { permissions, sendTestNotification, requestPermissions, getCurrentToken } = useNotifications();

  const handleTestNotification = async (type: 'match' | 'message' | 'superlike' | 'like') => {
    if (!permissions.granted) {
      Alert.alert(
        'Notifications Disabled',
        'Please enable notifications first to test them.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', onPress: requestPermissions }
        ]
      );
      return;
    }

    await sendTestNotification(type);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Test</Text>
      <Text style={styles.status}>
        Status: {permissions.granted ? '✅ Enabled' : '❌ Disabled'}
      </Text>
      {getCurrentToken() === 'expo-go-local-token' && (
        <Text style={styles.devMode}>
          🔧 Development Mode - Local notifications only
        </Text>
      )}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => handleTestNotification('match')}
        >
          <Text style={styles.buttonText}>Test Match</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => handleTestNotification('message')}
        >
          <Text style={styles.buttonText}>Test Message</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => handleTestNotification('superlike')}
        >
          <Text style={styles.buttonText}>Test Super Like</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => handleTestNotification('like')}
        >
          <Text style={styles.buttonText}>Test Like</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  status: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
  },
  devMode: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#F59E0B',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    backgroundColor: '#FE3C72',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
}); 