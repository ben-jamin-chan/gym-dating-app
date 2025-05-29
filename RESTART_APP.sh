#!/bin/bash

# Reset and restart app script after Firebase fix

echo "🔄 Resetting app state and cache..."

# Kill any running Metro processes
pkill -f "node.*metro" || true
echo "✅ Stopped Metro server"

# Clear React Native cache
rm -rf $TMPDIR/metro-* || true
rm -rf $TMPDIR/haste-map-* || true
echo "✅ Cleared Metro cache"

# Clear Watchman cache
watchman watch-del-all || true
echo "✅ Reset Watchman"

# Clear node_modules caches
npm cache clean --force
echo "✅ Cleaned npm cache"

# Remove node_modules and reinstall
echo "📦 Reinstalling packages (this may take a minute)..."
rm -rf node_modules
npm install

# Clear iOS build if on Mac
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "🧹 Cleaning iOS build..."
  rm -rf ios/build
  rm -rf ios/Pods
  
  # Reinstall iOS pods if CocoaPods is available
  if command -v pod &> /dev/null; then
    cd ios && pod install && cd ..
    echo "✅ Reinstalled iOS pods"
  fi
fi

# Clear Android build
echo "🧹 Cleaning Android build..."
rm -rf android/app/build
rm -rf android/build
rm -rf android/.gradle

echo "🔥 Starting app with clean state..."
npm run start
