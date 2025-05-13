import { Platform, AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import { processPendingMessages, refreshFirebaseConnection } from './firebase';

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

  handleNetworkChange = (state: NetInfoState) => {
    if (this.verboseLogging) {
      console.log('Network state changed:', state);
    }
    
    if (state.isConnected && state.isInternetReachable !== false) {
      this.attemptReconnection('Network change detected');
      this.notifyConnectionStateChange(true);
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

  // Public method for components to manually trigger reconnection
  public manualReconnect = async (): Promise<boolean> => {
    // Always log manual reconnection requests regardless of verbose setting
    console.log('Manual reconnection requested by user');
    this.isReconnecting = false; // Reset reconnection state
    this.lastReconnectionAttempt = 0; // Reset throttling
    const result = await this.attemptReconnection('Manual reconnection');
    return result;
  };

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

  attemptReconnection = async (reason: string): Promise<boolean> => {
    // Throttle reconnection attempts
    const now = Date.now();
    if (this.isReconnecting || (now - this.lastReconnectionAttempt < this.RECONNECT_THRESHOLD_MS)) {
      if (this.verboseLogging) {
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
      // Check current network state
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected && netInfo.isInternetReachable !== false) {
        if (!isSilentCheck || this.verboseLogging) {
          console.log('Network is available, refreshing Firebase connection...');
        }
        
        // Refresh Firebase connection
        await refreshFirebaseConnection(isSilentCheck);
        
        // Process any pending messages
        await processPendingMessages();
        
        if (!isSilentCheck || this.verboseLogging) {
          console.log('Reconnection successful');
        }
        
        this.consecutiveFailures = 0;
        
        // Start periodic checks again if enabled
        if (this.periodicChecksEnabled) {
          this.startReconnectionTimer(this.periodicCheckInterval);
        }
        
        this.notifyConnectionStateChange(true);
        return true;
      } else {
        if (this.verboseLogging) {
          console.log('Network not available for reconnection');
        }
        this.handleReconnectionFailure();
        this.notifyConnectionStateChange(false);
        return false;
      }
    } catch (error) {
      console.error('Error during reconnection attempt:', error);
      this.handleReconnectionFailure();
      return false;
    } finally {
      this.isReconnecting = false;
    }
  };

  handleReconnectionFailure() {
    this.consecutiveFailures++;
    
    // Calculate next interval with exponential backoff
    const backoffFactor = Math.min(Math.pow(2, this.consecutiveFailures - 1), 10);
    const nextInterval = Math.min(
      this.RECONNECT_INTERVAL_BASE * backoffFactor,
      this.MAX_RECONNECT_INTERVAL
    );
    
    if (this.verboseLogging) {
      console.log(`Reconnection failed. Next attempt in ${nextInterval/1000} seconds`);
    }
    
    if (this.periodicChecksEnabled) {
      this.startReconnectionTimer(nextInterval);
    }
  }

  startReconnectionTimer(interval: number = this.periodicCheckInterval) {
    this.stopReconnectionTimer();
    
    // Set timer for next reconnection attempt
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
    this.stopReconnectionTimer();
    
    if (this.netInfoSubscription) {
      this.netInfoSubscription();
      this.netInfoSubscription = null;
    }
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

// Create a singleton instance
const networkReconnectionManager = new NetworkReconnectionManager();

export default networkReconnectionManager; 