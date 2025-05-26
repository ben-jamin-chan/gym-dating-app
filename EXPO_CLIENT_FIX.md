# Fixing "com.benjaminchan.bolt-expo-nativewind Is No Longer Available" Error

## What Caused This Issue

The error message occurs because of a mismatch between your iOS device's development client and the project configuration. The main causes are:

1. The bundle identifier in `app.json` was changed from `com.benjaminchan.bolt-expo-nativewind` to `com.benjaminchan.boltexponativewind` (removed hyphen)
2. The Expo Go client on your device is looking for the old bundle ID

## Fix Steps

I've made the following changes:

1. **Updated the iOS bundle identifier** in `app.json` to be consistent with the Android package name
2. **Added development client settings** to improve the development experience
3. **Added runtime version and update URL** configurations

## How to Fix on Your iPhone

### Method 1: Using the updated configuration (Recommended)

1. **Stop any running Metro bundler** instances
2. **Uninstall the Expo Go app** from your iPhone
3. **Reinstall the Expo Go app** from the App Store 
4. **Restart your development server** with this command:
   ```
   npx expo start --clear
   ```
5. **Scan the QR code** with your iPhone camera

### Method 2: Use Expo Go's development build

1. **Install the development build** on your device:
   ```
   npx expo run:ios
   ```
   This will build a development client specifically for your app

### Method 3: Delete and recreate the project link

1. Open Expo Go on your iPhone
2. Find the project in your "Recently Opened" list
3. Long press on it and select "Remove"
4. Scan the new QR code from the terminal

## If Issues Persist

You may need to create a custom development build:

```
npx expo prebuild --clean
npx expo run:ios
```

This will create an iOS build customized for your app, which should resolve any bundle identifier issues.

## Prevention for Future

Always:
1. Keep bundle identifiers consistent between development cycles
2. Use the same format for iOS bundleIdentifier and Android package (both use `.` not `-`)
3. Maintain the same Expo project ID 