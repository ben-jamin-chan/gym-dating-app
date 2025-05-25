// Safe wrapper for notification service that handles Expo Go limitations
import Constants from 'expo-constants';

let notificationService: any = null;
let isExpoGo = false;

// Check if we're in Expo Go
try {
  isExpoGo = Constants.appOwnership === 'expo';
} catch (error) {
  console.log('Could not detect app ownership, assuming production');
}

// Mock notification service for Expo Go
const mockNotificationService = {
  async initialize() {
    console.log('✅ Mock notification service initialized (Expo Go mode)');
    return true;
  },
  
  async registerForPushNotifications() {
    console.log('ℹ️ Mock push notification registration (Expo Go mode)');
    return 'expo-go-mock-token';
  },
  
  async sendLocalNotification(title: string, body: string, data?: any) {
    console.log(`📱 Mock notification: ${title} - ${body}`);
    // In Expo Go, we can't send real notifications, but we can log them
  },
  
  async getNotificationSettings() {
    return { granted: true };
  },
  
  async updateNotificationPreferences(preferences: any) {
    console.log('ℹ️ Mock notification preferences update');
    return true;
  },
  
  async getNotificationPreferences() {
    return {
      matches: true,
      messages: true,
      likes: true,
    };
  },
  
  getCurrentToken() {
    return 'expo-go-mock-token';
  },
  
  cleanup() {
    console.log('ℹ️ Mock notification service cleanup');
  }
};

// Try to load the real notification service
try {
  if (!isExpoGo) {
    // Only import the real service in production builds
    const { notificationService: realService } = require('./notificationService');
    notificationService = realService;
  } else {
    console.log('🔧 Using mock notification service for Expo Go');
    notificationService = mockNotificationService;
  }
} catch (error) {
  const errorObj = error as any;
  console.log('⚠️ Could not load notification service, using mock version:', errorObj?.message || 'Unknown error');
  notificationService = mockNotificationService;
}

export { notificationService };
export default notificationService; 