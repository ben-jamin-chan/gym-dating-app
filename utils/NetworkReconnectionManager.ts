import { Platform, AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import { processPendingMessages, refreshFirebaseConnection, refreshFirestoreConnection, enableFirestoreNetwork, disableFirestoreNetwork } from './firebase';
import { refreshConversationsData, refreshMessagesData, cleanupAllListeners } from './firebase';
import { refreshSuperLikeData, clearSuperLikeCache } from '../services/superLikeService';
import { getCurrentUser } from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processPendingLocationUpdates } from './processPendingLocationUpdates';

// Constants
const LAST_RECONNECTION_ATTEMPT_KEY = 'last_reconnection_attempt';
const RECONNECTION_COUNT_KEY = 'reconnection_count';
const MAX_QUICK_RECONNECTIONS = 3;
const RECONNECTION_COOLDOWN = 5 * 60 * 1000; // 5 minutes

class NetworkReconnectionManager {
  private netInfoSubscription: NetInfoSubscription | null = null;
  private appStateSubscription: any = null;
  private reconnectionTimerId: NodeJS.Timeout | null = null;
  private lastReconnectionAttempt: number = 0;
  private consecutiveFailures: number = 0;
  private readonly RECONNECT_INTERVAL_BASE: number = 5000; // 5 seconds base
  private readonly MAX_RECONNECT_INTERVAL: number = 60000; // Max 1 minute
  private readonly RECONNECT_THRESHOLD_MS: number = 3000; // Throttle reconnection attempts - reduced from 10s to 3s
  private isReconnecting: boolean = false;
  private onConnectionStateChangeCallbacks: ((isConnected: boolean) => void)[] = [];
  
  // Controls whether detailed logs are shown
  private verboseLogging: boolean = false;
  // Controls whether periodic checks are enabled
  private periodicChecksEnabled: boolean = true;
  // Time between periodic checks (default 3 minutes)
  private periodicCheckInterval: number = 180000;

  constructor() {
    this.setupNetworkListeners();
    this.setupAppStateListeners();
    
    // Set less frequent periodic checks for iOS simulator
    // Default is 3 minutes, but can be changed using setPeriodicCheckInterval
    if (Platform.OS === 'ios') {
      this.startReconnectionTimer(this.periodicCheckInterval);
    }
  }
  
  // Method to enable/disable verbose logging
  public setVerboseLogging(enabled: boolean) {
    this.verboseLogging = enabled;
  }
  
  // Method to enable/disable periodic checks
  public setPeriodicChecksEnabled(enabled: boolean) {
    this.periodicChecksEnabled = enabled;
    
    if (enabled) {
      this.startReconnectionTimer(this.periodicCheckInterval);
    } else {
      this.stopReconnectionTimer();
    }
  }
  
  // Method to set the interval for periodic checks
  public setPeriodicCheckInterval(intervalMs: number) {
    this.periodicCheckInterval = Math.max(60000, intervalMs); // Minimum 1 minute
    
    if (this.periodicChecksEnabled) {
      this.startReconnectionTimer(this.periodicCheckInterval);
    }
  }

  setupNetworkListeners() {
    // Unsubscribe if already subscribed
    if (this.netInfoSubscription) {
      this.netInfoSubscription();
      this.netInfoSubscription = null;
    }

    // Subscribe to network changes
    this.netInfoSubscription = NetInfo.addEventListener(this.handleNetworkChange);
  }

  setupAppStateListeners() {
    // Unsubscribe if already subscribed
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    // Subscribe to app state changes
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  handleNetworkChange = async (state: NetInfoState) => {
    if (this.verboseLogging) {
      console.log('Network state changed:', state);
    }
    
    // More robust network state check
    // isInternetReachable can be null on some platforms, so we treat null as potentially connected
    const isConnected = state.isConnected && (state.isInternetReachable !== false);
    
    if (isConnected) {
      try {
        // Check if we should attempt automatic reconnection
        const shouldReconnect = await this.shouldAttemptReconnection();
        if (shouldReconnect) {
          console.log('Network is back - attempting comprehensive reconnection');
          
          // First do the standard Firebase reconnection
          await this.attemptReconnection('Network connectivity restored');
          
          // Then refresh app-specific data
          await this.refreshAppData();
          
          // Process any pending location updates
          try {
            await processPendingLocationUpdates();
          } catch (error) {
            console.warn('Error processing pending location updates:', error);
          }
        }
      } catch (error) {
        console.error('Error in network change handler:', error);
      }
    } else {
      this.stopReconnectionTimer();
      this.notifyConnectionStateChange(false);
    }
  };

  handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (this.verboseLogging) {
      console.log('App state changed to:', nextAppState);
    }
    
    // When app comes to foreground
    if (nextAppState === 'active') {
      this.attemptReconnection('App became active');
      
      // For iOS simulator specifically, force a more aggressive reconnection pattern
      // but only do this when foregrounding the app to avoid constant logs
      if (Platform.OS === 'ios') {
        // First attempt immediately when app becomes active
        this.forceImmediateReconnection();
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      this.stopReconnectionTimer();
    }
  };

  // Force an immediate reconnection bypassing throttling
  forceImmediateReconnection = async () => {
    this.isReconnecting = false; // Reset this to bypass the throttling check
    this.lastReconnectionAttempt = 0; // Reset this to bypass the throttling check
    await this.attemptReconnection('Forced immediate reconnection');
  }

  // New method to refresh app-specific data after reconnection
  private async refreshAppData() {
    const user = getCurrentUser();
    if (!user) {
      console.log('No user authenticated, skipping app data refresh');
      return;
    }

    console.log('🔄 Refreshing app data after reconnection...');

    try {
      // Refresh Super Like data
      try {
        await refreshSuperLikeData(user.uid);
        console.log('✅ Super Like data refreshed');
      } catch (error) {
        console.warn('Failed to refresh Super Like data:', error);
        // Clear cache as fallback
        clearSuperLikeCache();
      }

      // Clean up stale listeners to prevent conflicts
      try {
        cleanupAllListeners();
        console.log('✅ Stale listeners cleaned up');
      } catch (error) {
        console.warn('Failed to cleanup listeners:', error);
      }

      // Small delay to prevent subscription conflicts
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refresh conversations data
      try {
        await refreshConversationsData(user.uid);
        console.log('✅ Conversations data refreshed');
      } catch (error) {
        console.warn('Failed to refresh conversations data:', error);
      }

      console.log('✅ App data refresh completed');
    } catch (error) {
      console.error('❌ Error refreshing app data:', error);
    }
  }

  // Enhanced manual reconnection that includes app data refresh
  async manualReconnect(): Promise<boolean> {
    console.log('🔄 Starting manual reconnection with app data refresh...');
    
    try {
      // First do the standard reconnection
      const success = await this.attemptReconnection('Manual reconnection requested', false);
      
      if (success) {
        // Then refresh app data
        await this.refreshAppData();
        console.log('✅ Manual reconnection with app data refresh completed');
        return true;
      } else {
        console.warn('⚠️ Manual reconnection failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Manual reconnection with app data refresh failed:', error);
      return false;
    }
  }

  // Register a callback to be notified of connection state changes
  public registerConnectionStateChangeCallback = (callback: (isConnected: boolean) => void): (() => void) => {
    this.onConnectionStateChangeCallbacks.push(callback);
    
    // Return a function to unregister this callback
    return () => {
      this.onConnectionStateChangeCallbacks = this.onConnectionStateChangeCallbacks.filter(cb => cb !== callback);
    };
  };

  // Notify all registered callbacks about connection state changes
  private notifyConnectionStateChange = (isConnected: boolean) => {
    this.onConnectionStateChangeCallbacks.forEach(callback => {
      try {
        callback(isConnected);
      } catch (error) {
        console.error('Error in connection state change callback:', error);
      }
    });
  };

  attemptReconnection = async (reason: string, silent: boolean = false): Promise<boolean> => {
    // Throttle reconnection attempts
    const now = Date.now();
    if (this.isReconnecting || (now - this.lastReconnectionAttempt < this.RECONNECT_THRESHOLD_MS)) {
      if (!silent || this.verboseLogging) {
        console.log(`Skipping reconnection attempt (${reason}): Too soon or already reconnecting`);
      }
      return false;
    }
    
    this.lastReconnectionAttempt = now;
    this.isReconnecting = true;
    
    // Only log for manual reconnection, forced reconnection, or app state changes
    // Don't log for periodic checks to reduce noise
    const isSilentCheck = reason === 'Periodic check';
    if (!isSilentCheck || this.verboseLogging) {
      console.log(`Attempting network reconnection (${reason})...`);
    }
    
    try {
      // First, check if we're actually online
      const netInfo = await NetInfo.fetch();
      const isConnected = netInfo.isConnected && (netInfo.isInternetReachable !== false);
      
      if (!isConnected) {
        if (!isSilentCheck || this.verboseLogging) {
          console.log('No internet connection available, skipping reconnection');
        }
        this.isReconnecting = false;
        this.notifyConnectionStateChange(false);
        return false;
      }
      
      // Track this reconnection attempt
      await this.trackReconnectionAttempt();
      
      // Refresh Firestore connection first
      if (!isSilentCheck || this.verboseLogging) {
        console.log('🔄 Refreshing Firestore connection...');
      }
      await refreshFirestoreConnection();
      
      // Then refresh Firebase connection
      if (!isSilentCheck || this.verboseLogging) {
        console.log('🔄 Refreshing Firebase connection...');
      }
      await refreshFirebaseConnection();
      
      // Process any pending messages
      try {
        await processPendingMessages();
      } catch (messageError) {
        console.warn('Error processing pending messages:', messageError);
      }
      
      // Reset consecutive failures on success
      this.consecutiveFailures = 0;
      
      if (!isSilentCheck || this.verboseLogging) {
        console.log('✅ Network reconnection successful');
      }
      
      this.notifyConnectionStateChange(true);
      
      this.isReconnecting = false;
      return true;
      
    } catch (error) {
      console.error('❌ Network reconnection failed:', error);
      this.handleReconnectionFailure();
      this.isReconnecting = false;
      this.notifyConnectionStateChange(false);
      return false;
    }
  };

  handleReconnectionFailure() {
    this.consecutiveFailures++;
    
    // Exponential backoff with max limit
    const nextInterval = Math.min(
      this.RECONNECT_INTERVAL_BASE * Math.pow(2, this.consecutiveFailures),
      this.MAX_RECONNECT_INTERVAL
    );
    
    console.log(`Reconnection failed. Next attempt in ${nextInterval / 1000} seconds.`);
    
    // Start timer for next attempt
    this.startReconnectionTimer(nextInterval);
  }

  startReconnectionTimer(interval: number = this.periodicCheckInterval) {
    // Clear existing timer
    this.stopReconnectionTimer();
    
    if (!this.periodicChecksEnabled) return;
    
    this.reconnectionTimerId = setTimeout(() => {
      this.attemptReconnection('Periodic check');
    }, interval);
  }

  stopReconnectionTimer() {
    if (this.reconnectionTimerId) {
      clearTimeout(this.reconnectionTimerId);
      this.reconnectionTimerId = null;
    }
  }

  cleanup() {
    // Clean up all subscriptions and timers
    if (this.netInfoSubscription) {
      this.netInfoSubscription();
      this.netInfoSubscription = null;
    }
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    this.stopReconnectionTimer();
    this.onConnectionStateChangeCallbacks = [];
  }

  private async shouldAttemptReconnection(): Promise<boolean> {
    try {
      const lastAttemptString = await AsyncStorage.getItem(LAST_RECONNECTION_ATTEMPT_KEY);
      const lastAttempt = lastAttemptString ? parseInt(lastAttemptString, 10) : 0;
      const countString = await AsyncStorage.getItem(RECONNECTION_COUNT_KEY);
      const count = countString ? parseInt(countString, 10) : 0;
      
      const now = Date.now();
      const timeSinceLastAttempt = now - lastAttempt;
      
      // If more than cooldown period has passed, reset count
      if (timeSinceLastAttempt > RECONNECTION_COOLDOWN) {
        await AsyncStorage.setItem(RECONNECTION_COUNT_KEY, '0');
        return true;
      }
      
      // Allow if we haven't exceeded max quick reconnections
      return count < MAX_QUICK_RECONNECTIONS;
    } catch (error) {
      console.error('Error checking reconnection eligibility:', error);
      return true; // Default to allowing reconnection if we can't check
    }
  }

  private async trackReconnectionAttempt() {
    try {
      const now = Date.now();
      const countString = await AsyncStorage.getItem(RECONNECTION_COUNT_KEY);
      const count = countString ? parseInt(countString, 10) : 0;
      
      await AsyncStorage.setItem(LAST_RECONNECTION_ATTEMPT_KEY, now.toString());
      await AsyncStorage.setItem(RECONNECTION_COUNT_KEY, (count + 1).toString());
    } catch (error) {
      console.error('Error tracking reconnection attempt:', error);
    }
  }
}

// Create a singleton instance
const networkReconnectionManager = new NetworkReconnectionManager();

export default networkReconnectionManager; 