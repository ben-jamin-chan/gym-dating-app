# Maps Configuration

This document explains how to configure Google Maps in the fitness dating app.

## Setup

### 1. Get API Keys

You need to get Google Maps API keys:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Maps APIs:
   - Maps SDK for iOS
   - Maps SDK for Android
4. Create API keys for both iOS and Android

### 2. Configure the API Keys

In `app.json`, replace the placeholder API keys with your actual keys:

```json
"ios": {
  "config": {
    "googleMapsApiKey": "YOUR_IOS_API_KEY"
  }
},
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_ANDROID_API_KEY"
    }
  }
}
```

### 3. Platform Support

- **iOS and Android**: Full map functionality with check-ins and nearby users
- **Web**: Shows a fallback message as react-native-maps is not web-compatible

## Troubleshooting

### Common Issues

1. **"RNMapsAirModule could not be found"**:
   - Make sure you've run `npx expo prebuild` after updating the API keys
   - Ensure the plugins are correctly set up in app.json

2. **Maps not displaying correctly**:
   - Verify your API keys are correct and have the right permissions
   - Check that the device has location services enabled

3. **Web errors**:
   - The app is designed to show a fallback on web as react-native-maps isn't web-compatible

### Rebuild the Native Code

If you've made configuration changes, rebuild the native code:

```
npx expo prebuild --clean
```

Then run the app again:

```
npx expo run:ios
```

or

```
npx expo run:android
``` 