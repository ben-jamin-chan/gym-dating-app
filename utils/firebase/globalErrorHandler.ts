import { Platform } from 'react-native';
import { handleFirestoreError, refreshFirestoreConnection, emergencyFirestoreReset } from './config';

// Circuit breaker to prevent infinite loops
let consecutiveFirestoreErrors = 0;
let lastFirestoreErrorTime = 0;
let isHandlingFirestoreError = false;
const MAX_CONSECUTIVE_ERRORS = 3; // Reduced from 5 to be more aggressive
const ERROR_RESET_INTERVAL = 60000; // Increased to 60 seconds
const SEVERE_ERROR_THRESHOLD = 10; // Reduced from 20 to be more aggressive

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
    
    // Immediate emergency stop if we're in a severe loop
    if (consecutiveFirestoreErrors > SEVERE_ERROR_THRESHOLD && typeof global.__emergencyStop === 'function') {
      console.warn('🚨 SEVERE ERROR LOOP DETECTED: Executing emergency stop automatically');
      try {
        global.__emergencyStop();
        
        // We won't reset the circuit breaker here - app should be restarted
        return false;
      } catch (e) {
        console.error('Failed to execute emergency stop:', e);
      }
    }
    
    // Schedule a reset after a longer cooling off period
    setTimeout(resetCircuitBreaker, ERROR_RESET_INTERVAL * 2); // Double the cool-off period
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
 * Check if an error is a Firestore internal assertion failure
 */
const isFirestoreInternalError = (error: any): boolean => {
  if (!error || typeof error !== 'object') return false;
  
  // Look for specific Firestore assertion error patterns
  if (error.message && typeof error.message === 'string') {
    return (
      // Standard internal assertion failure
      (error.message.includes('FIRESTORE') && error.message.includes('INTERNAL ASSERTION FAILED')) ||
      // Error about terminated client
      (error.message.includes('The client has already been terminated')) ||
      // Error about initialization with different options
      (error.message.includes('initializeFirestore() has already been called with different options'))
    );
  }
  
  return false;
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
      // Check for Firestore internal errors
      if (isFirestoreInternalError(error)) {
        console.log('🚨 Global error handler caught Firestore internal assertion failure');
        
        // Track errors globally for loop detection
        if (typeof global !== 'undefined') {
          global.__firestoreErrorCount = (global.__firestoreErrorCount || 0) + 1;
          global.__lastErrorCheck = Date.now();
          
          // Log instructions if we're in a potential loop
          if (global.__firestoreErrorCount > 10) {
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
                setTimeout(() => reject(new Error('Error handling timeout')), 5000) // Reduced timeout
              )
            ]);
            console.log('✅ Global error handler processed Firestore error');
            
            // Always perform a basic network reset for Firebase internal errors
            try {
              await refreshFirestoreConnection();
            } catch (resetError) {
              console.error('Failed to refresh Firestore connection:', resetError);
            }
            
            // For fatal errors, we need to try an emergency reset (but only if not too many recent errors)
            if (isFatal && consecutiveFirestoreErrors < MAX_CONSECUTIVE_ERRORS) {
              console.log('⚠️ Fatal Firestore error, attempting emergency reset...');
              try {
                const success = await Promise.race([
                  emergencyFirestoreReset(),
                  new Promise<boolean>((_, reject) => 
                    setTimeout(() => reject(new Error('Emergency reset timeout')), 10000) // Reduced timeout
                  )
                ]);
                
                if (success) {
                  console.log('✅ Emergency reset successful after fatal error');
                  // Reset the error count after successful reset
                  consecutiveFirestoreErrors = 0;
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
            if (isFirestoreInternalError(error)) {
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
 * Sets up automatic recovery for Firebase unhandled promise rejections
 */
export const setupFirebaseErrorAutoRecovery = () => {
  try {
    // Listen for unhandled promise rejections
    const handleRejection = (event: any) => {
      const error = event?.reason || event;
      
      // Only handle Firestore internal errors
      if (isFirestoreInternalError(error)) {
        console.log('🚨 Unhandled promise rejection caught Firestore error');
        
        // Check circuit breaker
        if (shouldHandleFirestoreError()) {
          console.log('Attempting auto-recovery for unhandled Firestore error');
          
          // Simple refresh to avoid complex logic in this path
          refreshFirestoreConnection()
            .then(() => console.log('✅ Auto-recovery completed'))
            .catch(e => console.error('❌ Auto-recovery failed:', e));
        }
      }
    };
    
    // Different APIs for different platforms
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', handleRejection);
      console.log('✅ Web unhandledrejection listener installed');
      
      return () => {
        window.removeEventListener('unhandledrejection', handleRejection);
      };
    } else {
      // For React Native, less reliable but worth trying
      const process = global.process;
      if (process && typeof process.on === 'function') {
        process.on('unhandledRejection', handleRejection);
        console.log('✅ Node-style unhandledRejection listener installed');
        
        return () => {
          process.off('unhandledRejection', handleRejection);
        };
      }
    }
    
    console.warn('⚠️ Could not set up unhandled rejection listener');
    return () => {}; // Return no-op cleanup
  } catch (error) {
    console.warn('Failed to set up Firebase error auto-recovery:', error);
    return () => {}; // Return no-op cleanup
  }
}; 