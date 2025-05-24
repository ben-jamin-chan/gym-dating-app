import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateUserLocation } from './firebase';
import NetInfo from '@react-native-community/netinfo';

/**
 * Process pending location updates that were stored during offline periods
 * This function should be called when the app reconnects to the internet
 */
export const processPendingLocationUpdates = async (): Promise<boolean> => {
  try {
    // First check if we're online
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected || netInfo.isInternetReachable === false) {
      console.log('Cannot process pending location updates: device is offline');
      return false;
    }
    
    // Get stored location updates
    const pendingUpdatesStr = await AsyncStorage.getItem('pendingLocationUpdates');
    if (!pendingUpdatesStr) {
      // No pending updates
      return true;
    }
    
    const pendingUpdates = JSON.parse(pendingUpdatesStr);
    if (!Array.isArray(pendingUpdates) || pendingUpdates.length === 0) {
      // No valid updates to process
      await AsyncStorage.removeItem('pendingLocationUpdates');
      return true;
    }
    
    console.log(`Processing ${pendingUpdates.length} pending location updates`);
    
    // Sort updates by timestamp (oldest first)
    pendingUpdates.sort((a, b) => a.timestamp - b.timestamp);
    
    // Keep track of successful updates by userId (to only send the latest location per user)
    const processedUserIds = new Set<string>();
    const failedUpdates = [];
    
    // Process each update
    for (const update of pendingUpdates) {
      // If we've already processed a newer update for this user, skip older ones
      if (processedUserIds.has(update.userId)) {
        continue;
      }
      
      try {
        // Try to update the location
        const success = await updateUserLocation(
          update.userId,
          update.latitude,
          update.longitude
        );
        
        if (success) {
          processedUserIds.add(update.userId);
        } else {
          // Keep track of failed updates to retry later
          failedUpdates.push(update);
        }
      } catch (error) {
        console.warn('Error processing pending location update:', error);
        failedUpdates.push(update);
      }
    }
    
    // Store any failed updates back for later processing
    if (failedUpdates.length > 0) {
      await AsyncStorage.setItem('pendingLocationUpdates', JSON.stringify(failedUpdates));
      console.log(`${failedUpdates.length} location updates still pending for later processing`);
    } else {
      // All updates processed successfully, clear the storage
      await AsyncStorage.removeItem('pendingLocationUpdates');
      console.log('All pending location updates processed successfully');
    }
    
    return failedUpdates.length === 0;
  } catch (error) {
    console.error('Error processing pending location updates:', error);
    return false;
  }
}; 