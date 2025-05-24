// Test utility to verify error logging is working
export const testErrorLogging = () => {
  console.log('🧪 Testing error logging...');
  
  // Test console.error
  setTimeout(() => {
    console.error('Test error message - this should appear in terminal with 🔴');
  }, 1000);
  
  // Test console.warn  
  setTimeout(() => {
    console.warn('Test warning message - this should appear in terminal with 🟡');
  }, 2000);
  
  // Test thrown error (will be caught by error boundary)
  setTimeout(() => {
    try {
      throw new Error('Test thrown error - this should be caught by error boundary');
    } catch (error) {
      console.error('Caught test error:', error);
    }
  }, 3000);
  
  console.log('✅ Error logging tests scheduled');
}; 