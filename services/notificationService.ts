import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db, usersRef } from '@/utils/firebase/config';
import { router } from 'expo-router';
import Constants from 'expo-constants';

export interface NotificationData {
  type: 'match' | 'message' | 'superlike' | 'like';
  userId?: string;
  matchId?: string;
  conversationId?: string;
  messageId?: string;
  senderName?: string;
  senderPhoto?: string;
  timestamp?: string;
}

// Configure notification behavior - wrap in try/catch for Expo Go
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (error) {
  const errorObj = error as any;
  console.log('⚠️ Could not set notification handler (likely Expo Go):', errorObj?.message || 'Unknown error');
}

class NotificationService {
  private expoPushToken: string | null = null;
  private fcmToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;
  private isExpoGo: boolean = false;

  /**
   * Initialize the notification service
   */
  async initialize() {
    try {
      // Check if we're in Expo Go first
      this.isExpoGo = Constants.appOwnership === 'expo';
      
      if (this.isExpoGo) {
        console.log('⚠️ Detected Expo Go - initializing with limited functionality');
      }

      // Register for push notifications
      const token = await this.registerForPushNotifications();
      
      // Set up notification listeners
      this.setupNotificationListeners();
      
      if (token) {
        console.log('✅ Notification service initialized with push notifications');
      } else {
        console.log('✅ Notification service initialized (local notifications only)');
      }
    } catch (error) {
      console.error('❌ Error initializing notification service:', error);
      console.log('ℹ️ Notification service will continue with limited functionality');
    }
  }

  /**
   * Register device for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if we're running in Expo Go (development mode)
      const isExpoGo = Constants.appOwnership === 'expo';
      
      if (isExpoGo) {
        console.log('⚠️ Running in Expo Go - push notifications will be limited');
        console.log('ℹ️ Local notifications will still work for testing');
        // We can still request permissions for local notifications
        try {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status === 'granted') {
            console.log('✅ Local notification permissions granted');
            return 'expo-go-local-token';
          }
        } catch (permError) {
          console.log('⚠️ Could not get notification permissions in Expo Go:', permError);
        }
        return null;
      }

      if (!Device.isDevice) {
        console.log('⚠️ Push notifications only work on physical devices');
        return null;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('⚠️ Push notification permissions not granted');
        return null;
      }

      // Get the Expo push token (only works in standalone/dev builds)
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: '2d488a1a-eb72-4455-b6b1-7c5c29c8ddcd',
        });
        
        this.expoPushToken = tokenData.data;
        console.log('✅ Expo push token:', this.expoPushToken);

        // Store token in Firestore
        await this.storeTokenInFirestore(this.expoPushToken);

        // Configure notification channel for Android
        if (Platform.OS === 'android') {
          await this.setupAndroidNotificationChannel();
        }

        return this.expoPushToken;
      } catch (tokenError) {
        const errorObj = tokenError as any;
        console.log('⚠️ Could not get Expo push token (likely running in Expo Go):', errorObj?.message || 'Unknown error');
        console.log('ℹ️ Local notifications will still work for testing');
        return null;
      }
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Setup Android notification channels
   */
  private async setupAndroidNotificationChannel() {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });

      // Channel for matches
      await Notifications.setNotificationChannelAsync('matches', {
        name: 'Matches',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });

      // Channel for messages
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });

      // Channel for likes
      await Notifications.setNotificationChannelAsync('likes', {
        name: 'Likes & Super Likes',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 100],
        lightColor: '#FF231F7C',
        sound: 'default',
      });

      console.log('✅ Android notification channels set up');
    } catch (error) {
      const errorObj = error as any;
      console.log('⚠️ Could not set up Android notification channels (likely Expo Go):', errorObj?.message || 'Unknown error');
    }
  }

  /**
   * Store push token in Firestore
   */
  private async storeTokenInFirestore(token: string) {
    try {
      // Don't store fake tokens from Expo Go
      if (token === 'expo-go-local-token') {
        console.log('ℹ️ Skipping token storage for Expo Go development mode');
        return;
      }

      const currentUser = getAuth().currentUser;
      if (!currentUser) {
        console.log('⚠️ No authenticated user to store token for');
        return;
      }

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        expoPushTokens: arrayUnion(token),
        lastTokenUpdate: new Date(),
      });

      console.log('✅ Push token stored in Firestore');
    } catch (error) {
      console.error('❌ Error storing token in Firestore:', error);
    }
  }

  /**
   * Remove push token from Firestore
   */
  async removeTokenFromFirestore(token?: string) {
    try {
      const currentUser = getAuth().currentUser;
      if (!currentUser) return;

      const tokenToRemove = token || this.expoPushToken;
      if (!tokenToRemove) return;

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        expoPushTokens: arrayRemove(tokenToRemove),
      });

      console.log('✅ Push token removed from Firestore');
    } catch (error) {
      console.error('❌ Error removing token from Firestore:', error);
    }
  }

  /**
   * Setup notification listeners
   */
  private setupNotificationListeners() {
    try {
      // Listener for notifications received while app is foreground
      this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('📱 Notification received:', notification);
        this.handleForegroundNotification(notification);
      });

      // Listener for when user taps on notification
      this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('👆 Notification tapped:', response);
        this.handleNotificationResponse(response);
      });
      
      console.log('✅ Notification listeners set up');
    } catch (error) {
      const errorObj = error as any;
      console.log('⚠️ Could not set up notification listeners (likely Expo Go):', errorObj?.message || 'Unknown error');
    }
  }

  /**
   * Handle notifications received while app is in foreground
   */
  private handleForegroundNotification(notification: Notifications.Notification) {
    const data = notification.request.content.data as NotificationData;
    
    // You can customize foreground behavior here
    // For example, show an in-app notification banner
    console.log('Foreground notification data:', data);
  }

  /**
   * Handle notification tap responses (deep linking)
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse) {
    const data = response.notification.request.content.data as NotificationData;
    
    try {
      switch (data.type) {
        case 'match':
          if (data.matchId) {
            router.push('/(tabs)/matches');
          }
          break;
          
        case 'message':
          if (data.conversationId) {
            router.push(`/chat/${data.conversationId}`);
          }
          break;
          
        case 'superlike':
        case 'like':
          router.push('/(tabs)/' as any);
          break;
          
        default:
          router.push('/(tabs)/' as any);
      }
    } catch (error) {
      console.error('❌ Error handling notification response:', error);
    }
  }

  /**
   * Send a local notification (for testing)
   */
  async sendLocalNotification(title: string, body: string, data?: NotificationData) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Show immediately
      });
      console.log('✅ Local notification sent:', title);
    } catch (error) {
      console.error('❌ Error sending local notification:', error);
      if (this.isExpoGo) {
        console.log('ℹ️ Local notifications may be limited in Expo Go');
      }
    }
  }

  /**
   * Get notification settings
   */
  async getNotificationSettings() {
    try {
      const settings = await Notifications.getPermissionsAsync();
      return {
        granted: settings.status === 'granted',
        ios: settings.ios,
        android: settings.android,
      };
    } catch (error) {
      console.error('❌ Error getting notification settings:', error);
      if (this.isExpoGo) {
        console.log('ℹ️ Returning default permissions for Expo Go');
        return { granted: true }; // Allow local notifications in Expo Go
      }
      return { granted: false };
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(preferences: {
    matches?: boolean;
    messages?: boolean;
    likes?: boolean;
  }) {
    try {
      await AsyncStorage.setItem('notificationPreferences', JSON.stringify(preferences));
      console.log('✅ Notification preferences updated');
    } catch (error) {
      console.error('❌ Error updating notification preferences:', error);
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences() {
    try {
      const preferences = await AsyncStorage.getItem('notificationPreferences');
      return preferences ? JSON.parse(preferences) : {
        matches: true,
        messages: true,
        likes: true,
      };
    } catch (error) {
      console.error('❌ Error getting notification preferences:', error);
      return {
        matches: true,
        messages: true,
        likes: true,
      };
    }
  }

  /**
   * Clean up listeners
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  /**
   * Get current push token
   */
  getCurrentToken(): string | null {
    return this.expoPushToken;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService; 