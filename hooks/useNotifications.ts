import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { notificationService } from '@/services/notificationServiceSafe';
import { NotificationData } from '@/services/notificationService';
import { useAuthStore } from '@/utils/authStore';

export interface NotificationPermissions {
  granted: boolean;
  ios?: any;
  android?: any;
}

export interface NotificationPreferences {
  matches: boolean;
  messages: boolean;
  likes: boolean;
}

export const useNotifications = () => {
  const [permissions, setPermissions] = useState<NotificationPermissions>({ granted: false });
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    matches: true,
    messages: true,
    likes: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();

  // Load permissions and preferences on mount
  useEffect(() => {
    loadNotificationData();
  }, [user]);

  const loadNotificationData = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Load permissions
      const permissionsData = await notificationService.getNotificationSettings();
      setPermissions(permissionsData);
      
      // Load preferences
      const preferencesData = await notificationService.getNotificationPreferences();
      setPreferences(preferencesData);
    } catch (error) {
      console.error('Error loading notification data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const requestPermissions = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await notificationService.registerForPushNotifications();
      
      if (token) {
        const newPermissions = await notificationService.getNotificationSettings();
        setPermissions(newPermissions);
        
        if (token === 'expo-go-local-token') {
          Alert.alert(
            'Development Mode',
            'You\'re running in development mode. Local notifications will work, but push notifications require a production build.',
            [{ text: 'OK' }]
          );
        }
        
        return true;
      } else {
        Alert.alert(
          'Notification Permissions',
          'Push notifications are disabled. To enable them, go to Settings > Notifications and allow notifications for this app.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {
              // On iOS, this would open the app settings
              // For now, just show an alert
              Alert.alert('Settings', 'Please enable notifications in your device settings.');
            }}
          ]
        );
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      Alert.alert('Error', 'Failed to setup notifications. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      setIsLoading(true);
      const updatedPreferences = { ...preferences, ...newPreferences };
      
      await notificationService.updateNotificationPreferences(updatedPreferences);
      setPreferences(updatedPreferences);
      
      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      Alert.alert('Error', 'Failed to update notification preferences.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [preferences]);

  const sendTestNotification = useCallback(async (type: 'match' | 'message' | 'superlike' | 'like' = 'match') => {
    try {
      const testData: NotificationData = {
        type,
        timestamp: new Date().toISOString(),
      };

      switch (type) {
        case 'match':
          await notificationService.sendLocalNotification(
            'New Match! 🎉',
            'You and Alex have matched! Start chatting now.',
            testData
          );
          break;
        case 'message':
          await notificationService.sendLocalNotification(
            'New message from Alex',
            'Hey! How are you doing?',
            { ...testData, conversationId: 'test', senderId: 'test', senderName: 'Alex' }
          );
          break;
        case 'superlike':
          await notificationService.sendLocalNotification(
            'You got a Super Like! ⭐️',
            'Alex super liked you! Check them out.',
            { ...testData, senderId: 'test', senderName: 'Alex' }
          );
          break;
        case 'like':
          await notificationService.sendLocalNotification(
            'Someone liked you! ❤️',
            'You have a new like. Check it out!',
            testData
          );
          break;
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification.');
    }
  }, []);

  const getCurrentToken = useCallback(() => {
    return notificationService.getCurrentToken();
  }, []);

  return {
    permissions,
    preferences,
    isLoading,
    requestPermissions,
    updatePreferences,
    sendTestNotification,
    getCurrentToken,
    refresh: loadNotificationData,
  };
}; 