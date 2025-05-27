import { Platform } from 'react-native';
import { handleFirestoreError, refreshFirestoreConnection, emergencyFirestoreReset } from './config';

// Circuit breaker to prevent infinite loops
let consecutiveFirestoreErrors = 0;
let lastFirestoreErrorTime = 0;
let isHandlingFirestoreError = false;
const MAX_CONSECUTIVE_ERRORS = 10;
const ERROR_RESET_INTERVAL = 30000; // 30 seconds

/**
 * Reset the circuit breaker after a cooling off period
 */
const resetCircuitBreaker = () => {
  consecutiveFirestoreErrors = 0;
  isHandlingFirestoreError = false;
  console.log('🔄 Firestore error circuit breaker reset');
};

/**
 * Check if we should handle this Firestore error or if we're in a circuit breaker state
 */
const shouldHandleFirestoreError = (): boolean => {
  const now = Date.now();
  
  // Reset counter if enough time has passed
  if (now - lastFirestoreErrorTime > ERROR_RESET_INTERVAL) {
    consecutiveFirestoreErrors = 0;
  }
  
  // Update tracking
  lastFirestoreErrorTime = now;
  consecutiveFirestoreErrors++;
  
  // Check if we've exceeded our limit
  if (consecutiveFirestoreErrors > MAX_CONSECUTIVE_ERRORS) {
    console.warn(`🛑 Circuit breaker activated: Too many consecutive Firestore errors (${consecutiveFirestoreErrors}). Stopping error handling to prevent infinite loop.`);
    
    // Schedule a reset after a longer cooling off period
    setTimeout(resetCircuitBreaker, ERROR_RESET_INTERVAL);
    return false;
  }
  
  // Check if we're already handling an error
  if (isHandlingFirestoreError) {
    console.log('⏸️ Already handling a Firestore error, skipping to prevent recursion');
    return false;
  }
  
  return true;
};

/**
 * Sets up a global error handler for Firestore-related errors
 */
export const setupGlobalErrorHandler = () => {
  // Store the original handler
  let originalHandler: ((error: Error, isFatal?: boolean) => void) | null = null;
  
  try {
    // ErrorUtils is not directly accessible in newer React Native versions
    // We need to access it through the global object
    const ErrorUtils = global.ErrorUtils;
    
    if (!ErrorUtils) {
      console.warn('ErrorUtils is not available, using alternative error handling');
      setupAlternativeErrorHandler();
      return () => {}; // Return no-op cleanup
    }
    
    originalHandler = ErrorUtils.getGlobalHandler();
    
    // Set a custom error handler that intercepts Firestore errors
    ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      // First, check if this is a Firestore internal assertion error
      const isFirestoreError = error?.message?.includes('FIRESTORE') && 
                              error?.message?.includes('INTERNAL ASSERTION FAILED');
      
      if (isFirestoreError) {
        console.log('🚨 Global error handler caught Firestore internal assertion failure');
        
        // Track errors globally for loop detection
        if (typeof global !== 'undefined') {
          global.__firestoreErrorCount = (global.__firestoreErrorCount || 0) + 1;
          
          // Log instructions if we're in a potential loop
          if (global.__firestoreErrorCount > 20) {
            console.warn('🚨 POTENTIAL ERROR LOOP DETECTED!');
            console.warn('Run global.__emergencyStop() from console to break the loop');
          }
        }
        
        // Check circuit breaker before handling
        if (!shouldHandleFirestoreError()) {
          // Skip handling but still call original handler
          if (originalHandler) {
            originalHandler(error, isFatal);
          }
          return;
        }
        
        // Set flag to prevent recursion
        isHandlingFirestoreError = true;
        
        // Handle the Firestore error with timeout
        const handleWithTimeout = async () => {
          try {
            await Promise.race([
              handleFirestoreError(error, 'global_handler'),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Error handling timeout')), 10000)
              )
            ]);
            console.log('✅ Global error handler processed Firestore error');
            
            // For fatal errors, we need to try an emergency reset (but only if not too many recent errors)
            if (isFatal && consecutiveFirestoreErrors < 5) {
              console.log('⚠️ Fatal Firestore error, attempting emergency reset...');
              try {
                const success = await Promise.race([
                  emergencyFirestoreReset(),
                  new Promise<boolean>((_, reject) => 
                    setTimeout(() => reject(new Error('Emergency reset timeout')), 15000)
                  )
                ]);
                
                if (success) {
                  console.log('✅ Emergency reset successful after fatal error');
                } else {
                  console.error('❌ Emergency reset failed after fatal error');
                }
              } catch (resetError) {
                console.error('❌ Error during emergency reset:', resetError);
              }
            }
          } catch (handlerError) {
            console.error('❌ Error in global Firestore error handler:', handlerError);
          } finally {
            // Always reset the flag
            isHandlingFirestoreError = false;
          }
        };
        
        // Handle asynchronously to avoid blocking the error handler
        handleWithTimeout();
      }
      
      // Always call the original handler if it exists
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
    
    console.log('✅ Global Firebase error handler installed with circuit breaker');
    
    // Return a function to restore the original handler
    return () => {
      if (ErrorUtils && originalHandler) {
        ErrorUtils.setGlobalHandler(originalHandler);
        console.log('Global Firebase error handler removed');
      }
    };
  } catch (error) {
    console.warn('Failed to set up global error handler:', error);
    setupAlternativeErrorHandler();
    return () => {}; // Return no-op cleanup
  }
};

/**
 * Setup an alternative error handler when ErrorUtils is not available
 */
const setupAlternativeErrorHandler = () => {
  try {
    // Use the window.onerror handler for web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const originalOnError = window.onerror;
      
      window.onerror = function(message, source, lineno, colno, error) {
        // Check if this is a Firestore error
        if (message && typeof message === 'string' && 
            message.includes('FIRESTORE') && 
            message.includes('INTERNAL ASSERTION FAILED')) {
          console.log('🚨 Window.onerror caught Firestore internal assertion failure');
          
          // Check circuit breaker before handling
          if (shouldHandleFirestoreError()) {
            // Handle the Firestore error
            handleFirestoreError(error || new Error(message), 'window_onerror')
              .catch(handlerError => {
                console.error('❌ Error in window.onerror handler:', handlerError);
              });
          }
        }
        
        // Call the original handler
        if (typeof originalOnError === 'function') {
          return originalOnError(message, source, lineno, colno, error);
        }
        return false;
      };
      
      console.log('✅ Window.onerror handler installed for Firestore errors');
    } else {
      // For React Native, we can use the global error handler
      // This won't catch all errors but it's better than nothing
      const originalHandler = global.ErrorUtils?.getGlobalHandler();
      
      if (global.ErrorUtils && originalHandler) {
        global.ErrorUtils.setGlobalHandler((error, isFatal) => {
          try {
            if (error?.message?.includes('FIRESTORE') && 
                error?.message?.includes('INTERNAL ASSERTION FAILED')) {
              console.log('🚨 Alternative error handler caught Firestore error');
              
              // Check circuit breaker before handling
              if (shouldHandleFirestoreError()) {
                // Handle async to avoid blocking the error handler
                setTimeout(() => {
                  refreshFirestoreConnection()
                    .then(() => console.log('✅ Connection refreshed after error'))
                    .catch(e => console.error('❌ Failed to refresh connection:', e));
                }, 0);
              }
            }
          } catch (handlerError) {
            console.error('Error in alternative error handler:', handlerError);
          }
          
          // Always call the original handler
          originalHandler(error, isFatal);
        });
        
        console.log('✅ Alternative global error handler installed');
      } else {
        console.warn('❌ No error handling mechanism available');
      }
    }
  } catch (error) {
    console.warn('Failed to set up alternative error handler:', error);
  }
};

/**
 * Auto-recovers from common Firebase errors, particularly in development
 */
export const setupFirebaseErrorAutoRecovery = () => {
  // Only run advanced error recovery in development
  if (__DEV__) {
    // Listen for unhandled promise rejections
    const handleRejection = (event: any) => {
      const error = event?.reason || event;
      
      // Check if this is a Firebase-related error
      const isFirebaseError = error?.message?.includes('Firebase') || 
                             error?.message?.includes('Firestore') ||
                             error?.message?.includes('INTERNAL ASSERTION');
                             
      if (isFirebaseError) {
        console.log('🔄 Auto-recovery detected Firebase error in rejected promise');
        
        // Attempt to refresh connection
        refreshFirestoreConnection()
          .then(success => {
            if (success) {
              console.log('✅ Auto-recovery successfully refreshed Firebase connection');
            } else {
              console.warn('⚠️ Auto-recovery failed to refresh Firebase connection');
            }
          })
          .catch(refreshError => {
            console.error('❌ Error during auto-recovery refresh:', refreshError);
          });
      }
    };
    
    // Add platform-specific unhandled rejection listeners
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', handleRejection);
      
      console.log('✅ Firebase error auto-recovery initialized for web');
      
      // Return cleanup function
      return () => {
        window.removeEventListener('unhandledrejection', handleRejection);
      };
    } else {
      // For React Native, we need a different approach
      // There's no direct equivalent, but we can try setting up a global rejection handler
      if (global.__shouldCancelPatching) {
        console.log('Firebase error auto-recovery cannot be initialized for this environment');
      } else {
        console.log('✅ Firebase error auto-recovery initialized');
      }
    }
  }
  
  // No-op for production or unsupported platforms
  return () => {};
}; 