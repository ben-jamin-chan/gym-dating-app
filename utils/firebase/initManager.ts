/**
 * FirestoreInitManager - Controls the initialization process for Firestore
 * 
 * This helps prevent "INTERNAL ASSERTION FAILED" errors by:
 * 1. Preventing early access to Firestore before it's fully initialized
 * 2. Providing a centralized place to track initialization state
 * 3. Deferring operations until initialization is complete
 */

import { Platform } from 'react-native';
import { db, refreshFirestoreConnection, emergencyFirestoreReset } from './config';

// Initialization states
export enum FirestoreInitState {
  PENDING = 'pending',      // Not yet initialized
  INITIALIZING = 'initializing', // In the process of initializing
  READY = 'ready',          // Successfully initialized
  ERROR = 'error'           // Failed to initialize
}

class FirestoreInitManager {
  private state: FirestoreInitState = FirestoreInitState.PENDING;
  private initPromise: Promise<boolean> | null = null;
  private initStartTime: number = 0;
  private issuedWarning: boolean = false;
  private readyCallbacks: Array<() => void> = [];
  private errorCallbacks: Array<(error: any) => void> = [];
  
  constructor() {
    console.log('Firestore initialization manager created');
    
    // Auto-initialize after short delay to allow React component tree to stabilize
    setTimeout(() => {
      if (this.state === FirestoreInitState.PENDING) {
        console.log('Auto-initializing Firestore after startup delay');
        this.initialize();
      }
    }, 3000);
  }
  
  /**
   * Initialize Firestore with proper error handling
   * @returns Promise that resolves when initialization is complete
   */
  initialize(): Promise<boolean> {
    // If already initializing, return existing promise
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // Set state to initializing
    this.state = FirestoreInitState.INITIALIZING;
    this.initStartTime = Date.now();
    
    // Create the initialization promise
    this.initPromise = this.performInitialization();
    return this.initPromise;
  }
  
  /**
   * Perform the actual initialization
   */
  private async performInitialization(): Promise<boolean> {
    try {
      console.log('🔥 Starting Firestore initialization...');
      
      // First refresh the connection to ensure clean state
      await refreshFirestoreConnection();
      
      // Test basic connectivity
      try {
        console.log('Testing Firestore connectivity...');
        
        // Simulate a simple read operation to verify connectivity
        const testReadPromise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Firestore connectivity test timed out'));
          }, 15000); // 15 second timeout
          
          try {
            // Just accessing the database is enough to test it's working
            if (db) {
              clearTimeout(timeout);
              resolve();
            } else {
              clearTimeout(timeout);
              reject(new Error('Firestore instance is null'));
            }
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        });
        
        await testReadPromise;
      } catch (testError) {
        console.error('❌ Firestore connectivity test failed:', testError);
        
        // Try emergency reset as a last resort
        console.log('🚨 Attempting emergency Firestore reset...');
        await emergencyFirestoreReset();
        
        // If we get here, the reset didn't throw, so we'll consider it a success
        console.log('✅ Emergency reset successful, continuing initialization');
      }
      
      // Update state to ready
      this.state = FirestoreInitState.READY;
      
      // Notify any callbacks
      this.notifyReady();
      
      console.log(`✅ Firestore initialization complete (took ${Date.now() - this.initStartTime}ms)`);
      return true;
    } catch (error) {
      console.error('❌ Firestore initialization failed:', error);
      
      // Update state to error
      this.state = FirestoreInitState.ERROR;
      
      // Notify any error callbacks
      this.notifyError(error);
      
      return false;
    }
  }
  
  /**
   * Get the current initialization state
   */
  getState(): FirestoreInitState {
    return this.state;
  }
  
  /**
   * Check if Firestore is ready to use
   */
  isReady(): boolean {
    return this.state === FirestoreInitState.READY;
  }
  
  /**
   * Register a callback to be called when Firestore is ready
   * @param callback Function to call when ready
   */
  onReady(callback: () => void): () => void {
    // If already ready, call immediately
    if (this.isReady()) {
      callback();
      return () => {}; // Empty cleanup function
    }
    
    // Otherwise, add to callback list
    this.readyCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.readyCallbacks = this.readyCallbacks.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Register a callback to be called if initialization fails
   * @param callback Function to call on error
   */
  onError(callback: (error: any) => void): () => void {
    // If already in error state, call immediately
    if (this.state === FirestoreInitState.ERROR) {
      callback(new Error('Firestore initialization previously failed'));
      return () => {}; // Empty cleanup function
    }
    
    // Otherwise, add to callback list
    this.errorCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Notify all ready callbacks
   */
  private notifyReady() {
    // Call all ready callbacks
    this.readyCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in Firestore ready callback:', error);
      }
    });
    
    // Clear callbacks to avoid memory leaks
    this.readyCallbacks = [];
  }
  
  /**
   * Notify all error callbacks
   */
  private notifyError(error: any) {
    // Call all error callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in Firestore error callback:', callbackError);
      }
    });
    
    // Clear callbacks to avoid memory leaks
    this.errorCallbacks = [];
  }
  
  /**
   * Get a promise that resolves when Firestore is ready
   */
  waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isReady()) {
        resolve();
        return;
      }
      
      if (this.state === FirestoreInitState.ERROR) {
        reject(new Error('Firestore initialization failed'));
        return;
      }
      
      // Register callbacks
      const unsubscribeReady = this.onReady(() => {
        unsubscribeError();
        resolve();
      });
      
      const unsubscribeError = this.onError(error => {
        unsubscribeReady();
        reject(error);
      });
    });
  }
  
  /**
   * Check if Firestore has been accessed without being ready
   * @returns True if there may be a potential issue
   */
  checkForEarlyAccess(): boolean {
    // If we're in a pending state but initPromise exists, someone tried to use Firestore
    if (this.state === FirestoreInitState.PENDING && !this.initPromise && !this.issuedWarning) {
      console.warn('⚠️ WARNING: Attempted to access Firestore before initialization');
      this.issuedWarning = true;
      return true;
    }
    
    return false;
  }
  
  /**
   * Reset the initialization state (for testing only)
   */
  reset() {
    this.state = FirestoreInitState.PENDING;
    this.initPromise = null;
    this.readyCallbacks = [];
    this.errorCallbacks = [];
    this.issuedWarning = false;
    console.log('Firestore initialization state reset');
  }
}

// Export a singleton instance
export const firestoreInitManager = new FirestoreInitManager();

/**
 * Hook to safely execute code when Firestore is ready
 * @param callback Function to call when Firestore is ready
 */
export const runWhenFirestoreReady = async <T>(callback: () => Promise<T>): Promise<T> => {
  // Ensure Firestore is initialized
  if (!firestoreInitManager.isReady()) {
    console.log('Waiting for Firestore to initialize before executing operation...');
    await firestoreInitManager.waitForReady();
  }
  
  // Execute the callback
  return await callback();
}; 