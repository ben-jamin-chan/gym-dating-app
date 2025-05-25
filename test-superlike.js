// Test script for Super Like system
// Run this in the browser console or as a Node.js script

// Test Super Like Status
async function testSuperLikeSystem() {
  try {
    console.log('🧪 Testing Super Like System...');
    
    // Import the service (adjust path as needed)
    const { getSuperLikeStatus, useSuperLike, resetSuperLikes } = require('./services/superLikeService');
    const { getCurrentUser } = require('./utils/firebase');
    
    const user = getCurrentUser();
    if (!user) {
      console.error('❌ No authenticated user found');
      return;
    }
    
    console.log(`👤 Testing for user: ${user.uid}`);
    
    // Test 1: Get initial status
    console.log('\n📊 Test 1: Getting Super Like status...');
    const status = await getSuperLikeStatus(user.uid);
    console.log('Status:', status);
    
    // Test 2: Use a Super Like (if available)
    if (status.canUse) {
      console.log('\n⭐ Test 2: Using a Super Like...');
      const testTargetUserId = 'test-user-id'; // Replace with actual user ID
      
      try {
        await useSuperLike(user.uid, testTargetUserId);
        console.log('✅ Super Like used successfully');
        
        // Check status again
        const newStatus = await getSuperLikeStatus(user.uid);
        console.log('New status:', newStatus);
      } catch (error) {
        console.log('⚠️ Super Like failed (expected if test user doesn\'t exist):', error.message);
      }
    } else {
      console.log('⚠️ No Super Likes available to test');
    }
    
    // Test 3: Reset Super Likes (admin function)
    console.log('\n🔄 Test 3: Resetting Super Likes...');
    try {
      await resetSuperLikes(user.uid);
      console.log('✅ Super Likes reset successfully');
      
      // Check status after reset
      const resetStatus = await getSuperLikeStatus(user.uid);
      console.log('Status after reset:', resetStatus);
    } catch (error) {
      console.error('❌ Reset failed:', error.message);
    }
    
    console.log('\n🎉 Super Like system test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Manual test functions for browser console
window.testSuperLikeSystem = testSuperLikeSystem;

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testSuperLikeSystem };
}

console.log('🧪 Super Like test script loaded. Run testSuperLikeSystem() to test.'); 