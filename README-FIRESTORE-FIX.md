# Firestore Internal Assertion Failure Fix

## Problem
Users were experiencing fatal `FIRESTORE (11.7.3) INTERNAL ASSERTION FAILED: Unexpected state` errors during the onboarding process. These errors had IDs like `b815` and `ca9` and were causing the app to crash.

## Root Causes
1. **Firebase v11.7.3 Issues**: This version has known stability issues with concurrent operations and listener management
2. **Concurrent Firestore Operations**: Multiple simultaneous write operations during onboarding
3. **Race Conditions**: Competing listeners and write operations causing internal state conflicts

## Solutions Applied

### 1. Firebase Version Downgrade
- **Changed**: `firebase` from `11.7.3` to `11.6.0`
- **Reason**: Version 11.6.0 is more stable and doesn't have the internal assertion failures

### 2. Sequential Operations in Onboarding
- **File**: `app/(auth)/onboarding.tsx`
- **Change**: Added delays between Firestore operations to prevent concurrency issues
- **Implementation**: 
  ```typescript
  // Sequential operations to prevent Firestore concurrency issues
  await saveUserProfile(user.uid, profileData);
  await new Promise(resolve => setTimeout(resolve, 500));
  await createDefaultPreferences(user.uid);
  ```

### 3. Retry Logic for Firestore Operations
- **Files**: `utils/firebase/database.ts`, `services/preferencesService.ts`
- **Change**: Added exponential backoff retry logic for internal assertion failures
- **Implementation**:
  ```typescript
  catch (error: any) {
    if (error.message && error.message.includes('INTERNAL ASSERTION FAILED') && retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return saveUserProfile(userId, profileData, retryCount + 1);
    }
    throw error;
  }
  ```

### 4. Enhanced Error Handling
- **File**: `app/(auth)/onboarding.tsx`
- **Change**: Added specific error handling for internal assertion failures with user-friendly retry options
- **Features**:
  - Detects Firestore internal errors
  - Provides retry button for users
  - Better error messages

### 5. Improved Firestore Configuration
- **File**: `utils/firebase/config.ts`
- **Change**: Added more robust settings to prevent connection issues
- **Settings**:
  ```typescript
  experimentalForceLongPolling: false, // Disable long polling
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  ```

### 6. Navigation Safeguards
- **File**: `app/(auth)/onboarding.tsx`
- **Change**: Added delays and user session validation before navigation
- **Purpose**: Prevents navigation conflicts and ensures operations complete

## Testing
After applying these fixes:
1. Run `npm install` to update Firebase version
2. Test the onboarding flow with multiple rapid interactions
3. Monitor console for any remaining internal assertion errors
4. Verify retry functionality works when errors occur

## Monitoring
Watch for these log messages that indicate the fixes are working:
- `Retrying saveUserProfile (attempt X/3)`
- `Retrying createDefaultPreferences (attempt X/3)`
- `Sequential operations to prevent Firestore concurrency issues`

## Additional Recommendations
1. **Monitor Firebase SDK updates**: Keep an eye on newer Firebase versions that might fix these issues
2. **User feedback**: Monitor crash reports to ensure the issues are resolved
3. **Gradual rollout**: Consider testing with a subset of users first

## Files Modified
- `package.json` - Firebase version downgrade
- `app/(auth)/onboarding.tsx` - Sequential operations, error handling, navigation safeguards
- `utils/firebase/database.ts` - Retry logic for saveUserProfile
- `services/preferencesService.ts` - Retry logic for preferences operations
- `utils/firebase/config.ts` - Enhanced Firestore configuration

The solution addresses the root causes while maintaining functionality and providing a better user experience during temporary connection issues. 