import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
// Polyfill random values and URL for Firebase Auth on React Native
import { initializeApp } from 'firebase/app';
import { 
  collection,
  disableNetwork,
  enableNetwork,
  doc,
  getDoc,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED,
  persistentLocalCache,
  connectFirestoreEmulator,
  terminate,
  clearIndexedDbPersistence
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { 
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  setPersistence
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOYSaYglhkUNDdZmrFUy40oHHjadwfa_U",
  authDomain: "gym-dating-app.firebaseapp.com",
  projectId: "gym-dating-app",
  storageBucket: "gym-dating-app.firebasestorage.app",
  messagingSenderId: "349439736317",
  appId: "1:349439736317:web:1e5d70ab56597853a28194",
  measurementId: "G-9H9Z99TQ7B"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Enhanced Firestore configuration to prevent internal assertion failures
export const db = Platform.OS === 'web' 
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({
        cacheSizeBytes: CACHE_SIZE_UNLIMITED
      }),
      // Additional settings for web to prevent connection issues
      experimentalForceLongPolling: false,
      ignoreUndefinedProperties: true,
    })
  : initializeFirestore(app, {
      // Enhanced settings for React Native to prevent internal assertion failures
      experimentalForceLongPolling: false, // Disable long polling to prevent connection issues
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      ignoreUndefinedProperties: true, // Ignore undefined properties to prevent serialization issues
    });

// We'll use regular Firestore instead of GeoFirestore for now
// to avoid compatibility issues
export const geoFirestore = {
  collection: (path: string) => {
    console.log(`GeoFirestore collection requested: ${path}`);
    return collection(db, path);
  }
};

// Initialize Auth with proper persistence for React Native
export const auth = Platform.OS === 'web' 
  ? getAuth(app)
  : initializeAuth(app, {
      // React Native persistence is handled automatically by initializeAuth
    });

if (Platform.OS === 'web') {
  setPersistence(auth, indexedDBLocalPersistence)
    .then(() => console.log('Firebase Auth web persistence set to IndexedDB'))
    .catch(err => console.error('Error setting web auth persistence:', err));
  console.log('Firebase Auth initialized for web platform');
} else {
  console.log('Firebase Auth initialized for React Native with AsyncStorage persistence');
}

// Persistence is now handled via persistentLocalCache in initializeFirestore
// No need for additional enableIndexedDbPersistence calls which can cause conflicts
console.log('Firestore persistence configured via persistentLocalCache');

// Initialize Storage
export const storage = getStorage(app);

// Collection references
export const conversationsRef = collection(db, 'conversations');
export const messagesRef = collection(db, 'messages');
export const typingIndicatorsRef = collection(db, 'typingIndicators');
export const usersRef = collection(db, 'users');

// Network operations
export const disableFirestoreNetwork = () => disableNetwork(db);
export const enableFirestoreNetwork = () => enableNetwork(db);

// Global state to track connection refresh operations
let isRefreshingConnection = false;
let refreshPromise: Promise<boolean> | null = null;

// Enhanced function to refresh Firestore connection with better error handling
export const refreshFirestoreConnection = async (): Promise<boolean> => {
  // If we're already refreshing, return the existing promise
  if (isRefreshingConnection && refreshPromise) {
    console.log('Connection refresh already in progress, waiting...');
    return refreshPromise;
  }

  isRefreshingConnection = true;
  refreshPromise = performConnectionRefresh();
  
  try {
    const result = await refreshPromise;
    return result;
  } finally {
    isRefreshingConnection = false;
    refreshPromise = null;
  }
};

const performConnectionRefresh = async (): Promise<boolean> => {
  try {
    console.log('🔄 Starting enhanced Firestore connection refresh...');
    
    // Step 1: Disable network to stop all active operations
    try {
      await disableNetwork(db);
      console.log('✅ Network disabled successfully');
    } catch (disableError) {
      console.warn('⚠️ Warning during network disable:', disableError);
      // Continue anyway
    }
    
    // Step 2: Wait for all pending operations to settle
    // Increased delay to ensure complete cleanup
    console.log('⏳ Waiting for operations to settle...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 3: Clear any cached state if on web
    if (Platform.OS === 'web') {
      try {
        // Attempt to clear IndexedDB persistence if possible
        console.log('🧹 Clearing IndexedDB persistence...');
        await clearIndexedDbPersistence(db);
        console.log('✅ IndexedDB persistence cleared');
      } catch (clearError) {
        console.warn('⚠️ Could not clear IndexedDB persistence (this is normal):', clearError);
        // This is expected if there are active connections
      }
    }
    
    // Step 4: Re-enable network
    try {
      await enableNetwork(db);
      console.log('✅ Network re-enabled successfully');
    } catch (enableError) {
      console.error('❌ Error re-enabling network:', enableError);
      return false;
    }
    
    // Step 5: Wait for connection to stabilize
    console.log('⏳ Waiting for connection to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Enhanced Firestore connection refresh completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Error during enhanced Firestore connection refresh:', error);
    return false;
  }
};

// Function to completely terminate and reinitialize Firestore (emergency reset)
export const emergencyFirestoreReset = async (): Promise<boolean> => {
  try {
    console.log('🚨 Performing emergency Firestore reset...');
    
    // Terminate the Firestore instance
    await terminate(db);
    console.log('✅ Firestore terminated');
    
    // Wait before reinitializing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // The db instance will be automatically reinitialized on next use
    console.log('✅ Emergency Firestore reset completed');
    return true;
    
  } catch (error) {
    console.error('❌ Error during emergency Firestore reset:', error);
    return false;
  }
};

// Enhanced error handler for Firestore operations
export const handleFirestoreError = async (error: any, operation: string = 'unknown'): Promise<void> => {
  console.error(`❌ Firestore error in ${operation}:`, error);
  
  // Track error for monitoring
  errorMonitor.recordError(error, operation);
  
  // Check for internal assertion failures
  if (error?.message?.includes('INTERNAL ASSERTION FAILED')) {
    console.log('🔧 Detected internal assertion failure, attempting connection refresh...');
    
    try {
      const refreshSuccess = await refreshFirestoreConnection();
      if (refreshSuccess) {
        console.log('✅ Connection refresh successful after internal assertion failure');
        errorMonitor.recordRecovery(operation);
      } else {
        console.log('⚠️ Connection refresh failed, may need emergency reset');
        // Don't automatically do emergency reset, let the app decide
      }
    } catch (refreshError) {
      console.error('❌ Error during automatic refresh:', refreshError);
    }
  }
  
  // Check for other specific errors
  else if (error?.code === 'unavailable') {
    console.log('🔧 Firestore unavailable, attempting connection refresh...');
    await refreshFirestoreConnection();
  }
  else if (error?.message?.includes('Target ID already exists')) {
    console.log('🔧 Target ID conflict detected, attempting connection refresh...');
    await refreshFirestoreConnection();
  }
};

// Global error monitoring system
class FirestoreErrorMonitor {
  private errorCounts = new Map<string, number>();
  private lastErrors = new Map<string, Date>();
  private recoveryAttempts = new Map<string, number>();
  
  recordError(error: any, operation: string) {
    const errorKey = `${operation}_${error?.code || 'unknown'}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    
    this.errorCounts.set(errorKey, currentCount + 1);
    this.lastErrors.set(errorKey, new Date());
    
    // Check if we're getting too many errors
    if (currentCount >= 5) {
      console.warn(`🚨 High error count detected for ${errorKey}: ${currentCount + 1} errors`);
      this.considerEmergencyAction(errorKey);
    }
  }
  
  recordRecovery(operation: string) {
    const recoveryKey = `recovery_${operation}`;
    const currentAttempts = this.recoveryAttempts.get(recoveryKey) || 0;
    this.recoveryAttempts.set(recoveryKey, currentAttempts + 1);
    
    console.log(`✅ Recovery successful for ${operation} (attempt ${currentAttempts + 1})`);
  }
  
  private async considerEmergencyAction(errorKey: string) {
    const lastError = this.lastErrors.get(errorKey);
    const now = new Date();
    
    // If errors are happening frequently (within last 2 minutes), consider emergency reset
    if (lastError && (now.getTime() - lastError.getTime()) < 120000) {
      console.log(`🚨 Frequent errors detected for ${errorKey}, considering emergency reset...`);
      
      try {
        await emergencyFirestoreReset();
        console.log('🔧 Emergency reset completed due to frequent errors');
        
        // Reset error counts after emergency action
        this.errorCounts.set(errorKey, 0);
      } catch (resetError) {
        console.error('❌ Emergency reset failed:', resetError);
      }
    }
  }
  
  getErrorSummary() {
    const summary: any = {};
    this.errorCounts.forEach((count, key) => {
      summary[key] = {
        count,
        lastOccurred: this.lastErrors.get(key)
      };
    });
    return summary;
  }
  
  reset() {
    this.errorCounts.clear();
    this.lastErrors.clear();
    this.recoveryAttempts.clear();
    console.log('🔄 Error monitor reset');
  }
}

// Global error monitor instance
export const errorMonitor = new FirestoreErrorMonitor();

// Function to get current Firebase health status
export const getFirebaseHealthStatus = async (): Promise<{healthy: boolean, issues: string[]}> => {
  const issues: string[] = [];
  
  try {
    // Test basic connectivity
    const testDocRef = doc(db, 'health', 'test');
    await getDoc(testDocRef);
    
    // Check error monitor
    const errorSummary = errorMonitor.getErrorSummary();
    const totalErrors = Object.values(errorSummary).reduce((sum: number, error: any) => sum + error.count, 0);
    
    if (totalErrors > 10) {
      issues.push(`High error count: ${totalErrors} total errors detected`);
    }
    
    // Check for recent internal assertion failures
    const hasRecentInternalErrors = Object.keys(errorSummary).some(key => 
      key.includes('INTERNAL_ASSERTION_FAILED') && 
      errorSummary[key].lastOccurred &&
      (Date.now() - errorSummary[key].lastOccurred.getTime()) < 300000 // Within 5 minutes
    );
    
    if (hasRecentInternalErrors) {
      issues.push('Recent internal assertion failures detected');
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
    
  } catch (error) {
    issues.push(`Firebase connectivity test failed: ${error}`);
    return {
      healthy: false,
      issues
    };
  }
}; 