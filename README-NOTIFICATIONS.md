# Push Notifications System

This document describes the comprehensive push notification system implemented for the gym dating app, similar to Tinder's notification experience.

## Overview

The notification system supports:
- **Match notifications**: When two users like each other
- **Message notifications**: When someone sends you a message
- **Super Like notifications**: When someone super likes your profile
- **Like notifications**: When someone likes your profile (future feature)

## Architecture

### Client-Side Components

1. **NotificationService** (`services/notificationService.ts`)
   - Handles Expo push token registration
   - Manages notification permissions
   - Sets up notification channels (Android)
   - Handles foreground and background notifications
   - Manages deep linking from notifications

2. **useNotifications Hook** (`hooks/useNotifications.ts`)
   - React hook for easy notification management
   - Handles permissions, preferences, and testing
   - Provides loading states and error handling

3. **Settings Integration** (`app/settings.tsx`)
   - User-friendly notification preferences
   - Permission status display
   - Test notification buttons
   - Individual notification type toggles

### Server-Side Components

1. **Firebase Cloud Functions** (`functions/index.js`)
   - `notifyMatch`: Triggered when a match is created
   - `notifyNewMessage`: Triggered when a message is sent
   - `onSuperLikeUsed`: Triggered when someone uses a super like
   - Supports both FCM and Expo push notifications

## Setup Instructions

### 1. Install Dependencies

```bash
npm install expo-notifications expo-device expo-server-sdk
```

### 2. Configure app.json

The app.json includes:
- iOS notification permissions
- Android notification permissions
- Notification icon and color configuration
- Project ID for Expo push notifications

### 3. Firebase Functions Setup

Install the Expo server SDK in your functions directory:

```bash
cd functions
npm install expo-server-sdk
```

### 4. Initialize Notification Service

The notification service is automatically initialized in `app/_layout.tsx` when the app starts.

## Usage

### Basic Usage

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const { 
    permissions, 
    preferences, 
    requestPermissions, 
    updatePreferences,
    sendTestNotification 
  } = useNotifications();

  // Check if notifications are enabled
  if (!permissions.granted) {
    return <Button onPress={requestPermissions} title="Enable Notifications" />;
  }

  // Send a test notification
  const testMatch = () => sendTestNotification('match');
}
```

### Settings Integration

The settings screen automatically shows:
- Current notification permission status
- Individual toggles for each notification type
- Test buttons for each notification type
- Enable/disable buttons for permissions

## Notification Types

### 1. Match Notifications
- **Trigger**: When both users swipe right on each other
- **Title**: "New Match! 🎉"
- **Body**: "You and [Name] have matched! Start chatting now."
- **Deep Link**: Opens the matches tab
- **Channel**: `matches` (Android)

### 2. Message Notifications
- **Trigger**: When someone sends you a message
- **Title**: "New message from [Name]"
- **Body**: First 50 characters of the message
- **Deep Link**: Opens the specific chat conversation
- **Channel**: `messages` (Android)

### 3. Super Like Notifications
- **Trigger**: When someone super likes your profile
- **Title**: "You got a Super Like! ⭐️"
- **Body**: "[Name] super liked you! Check them out."
- **Deep Link**: Opens the discovery tab
- **Channel**: `likes` (Android)

## Deep Linking

Notifications automatically deep link to relevant screens:

```typescript
switch (data.type) {
  case 'match':
    router.push('/(tabs)/matches');
    break;
  case 'message':
    router.push(`/chat/${data.conversationId}`);
    break;
  case 'superlike':
  case 'like':
    router.push('/(tabs)/');
    break;
}
```

## Testing

### Local Testing

Use the test component or settings screen:

```typescript
import NotificationTest from '@/components/NotificationTest';

// Add to any screen for testing
<NotificationTest />
```

### Production Testing

1. Build and install the app on a physical device
2. Go to Settings > Notifications
3. Enable notifications if prompted
4. Use the test buttons to verify each notification type
5. Test deep linking by tapping on notifications

## Development vs Production

### Development Mode (Expo Go)

When running in Expo Go during development:
- ✅ Local notifications work for testing
- ❌ Push notifications are not available
- ❌ Remote notifications from Firebase won't be delivered
- ⚠️ You'll see "Development Mode" indicators in the UI

### Production Mode (Standalone Build)

When building for production:
- ✅ Full push notification support
- ✅ Remote notifications from Firebase
- ✅ Deep linking works completely
- ✅ All notification features available

## Troubleshooting

### Common Issues

1. **"Cannot find native module 'ExpoPushTokenManager'" error**
   - This is normal in Expo Go development mode
   - Local notifications will still work
   - Build a standalone app for full push notification support

2. **Notifications not appearing**
   - Check device notification permissions
   - Verify Expo project ID is correct
   - Ensure device is physical (not simulator)
   - In development: only local notifications work

3. **Deep linking not working**
   - Check URL scheme in app.json
   - Verify router navigation paths
   - Test with local notifications first

4. **Cloud Functions not triggering**
   - Check Firebase Functions logs
   - Verify Firestore triggers are set up correctly
   - Ensure user documents have push tokens

### Debug Information

The notification service logs detailed information:
- ✅ Success messages
- ❌ Error messages
- ⚠️ Warning messages
- 📱 Notification events

## Security Considerations

1. **Token Management**
   - Tokens are stored securely in Firestore
   - Invalid tokens are automatically cleaned up
   - Tokens are removed when users log out

2. **Permissions**
   - Users must explicitly grant notification permissions
   - Preferences are stored locally and respected
   - Users can disable specific notification types

3. **Data Privacy**
   - Only necessary data is included in notifications
   - Sensitive information is not exposed
   - Messages are truncated for privacy

## Performance

1. **Token Cleanup**
   - Invalid tokens are automatically removed
   - Batch operations are used for efficiency
   - Minimal data is stored per user

2. **Notification Batching**
   - Expo SDK handles notification batching
   - Multiple tokens per user are supported
   - Efficient delivery to multiple devices

## Future Enhancements

1. **Rich Notifications**
   - Profile pictures in notifications
   - Action buttons (Reply, Like Back)
   - Notification grouping

2. **Advanced Features**
   - Quiet hours support
   - Location-based notifications
   - Smart notification timing

3. **Analytics**
   - Notification delivery tracking
   - User engagement metrics
   - A/B testing for notification content

## Support

For issues or questions about the notification system:
1. Check the console logs for detailed error messages
2. Verify all dependencies are installed correctly
3. Test on physical devices only
4. Check Firebase Functions logs for server-side issues 