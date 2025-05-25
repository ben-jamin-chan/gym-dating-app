import { Platform } from 'react-native';

// Store original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Enhanced console error that ensures errors always show in terminal
const enhancedConsoleError = (...args: any[]) => {
  // Always call original console.error first
  originalConsoleError.apply(console, args);
  
  // For React Native, also ensure it's logged with a clear prefix
  if (Platform.OS !== 'web') {
    // Use a distinctive prefix to make errors stand out
    const errorMessage = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    // Log with timestamp and clear error indicator
    const timestamp = new Date().toISOString();
    originalConsoleLog(`🔴 [${timestamp}] ERROR:`, errorMessage);
  }
};

// Enhanced console warn
const enhancedConsoleWarn = (...args: any[]) => {
  originalConsoleWarn.apply(console, args);
  
  if (Platform.OS !== 'web') {
    const warnMessage = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    const timestamp = new Date().toISOString();
    originalConsoleLog(`🟡 [${timestamp}] WARNING:`, warnMessage);
  }
};

// Setup global error handlers
const setupGlobalErrorHandlers = () => {
  // Handle uncaught JavaScript errors
  if (typeof ErrorUtils !== 'undefined') {
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      const timestamp = new Date().toISOString();
      originalConsoleLog(`🔴 [${timestamp}] UNCAUGHT ERROR (Fatal: ${isFatal}):`, error.message);
      originalConsoleLog(`🔴 [${timestamp}] STACK:`, error.stack);
      
      // Call original error handler if it exists
      if (ErrorUtils.getGlobalHandler) {
        const originalHandler = ErrorUtils.getGlobalHandler();
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      }
    });
  }
  
  // Handle unhandled promise rejections
  if (typeof global !== 'undefined' && (global as any).HermesInternal) {
    // For Hermes engine
    global.addEventListener?.('unhandledrejection', (event) => {
      const timestamp = new Date().toISOString();
      originalConsoleLog(`🔴 [${timestamp}] UNHANDLED PROMISE REJECTION:`, event.reason);
    });
  }
};

// Initialize enhanced console
export const initializeConsoleEnhancer = () => {
  console.log('🔧 Initializing enhanced console logging...');
  
  // Replace console methods
  console.error = enhancedConsoleError;
  console.warn = enhancedConsoleWarn;
  
  // Setup global error handlers
  setupGlobalErrorHandlers();
  
  console.log('✅ Enhanced console logging initialized');
  console.log('🔍 Errors will now be clearly marked in terminal with 🔴 prefix');
  console.log('⚠️  Warnings will be marked with 🟡 prefix');
};

// Export original methods in case they're needed
export const originalConsole = {
  error: originalConsoleError,
  warn: originalConsoleWarn,
  log: originalConsoleLog
}; 