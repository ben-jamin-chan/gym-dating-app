// Re-export all Firebase functionality
// This ensures existing code doesn't break after refactoring

// Config exports
export {
  app,
  db,
  auth,
  storage,
  geoFirestore,
  conversationsRef,
  messagesRef,
  typingIndicatorsRef,
  usersRef,
  disableFirestoreNetwork,
  enableFirestoreNetwork,
  refreshFirestoreConnection
} from './config';

// Auth exports
export {
  registerUser,
  registerUserWithoutProfile,
  loginUser,
  logoutUser,
  resetPassword,
  updateUserProfile,
  getCurrentUser,
  subscribeToAuthChanges,
  updateUserLocation
} from './auth';

// Database exports
export {
  saveUserProfile,
  getUserProfile
} from './database';

// Messaging exports
export {
  getConversations,
  subscribeToConversations,
  getMessages,
  subscribeToMessages,
  sendMessage,
  markMessagesAsRead,
  updateTypingStatus,
  subscribeToTypingIndicator
} from './messaging';

// Storage exports
export {
  uploadMedia
} from './storage';

// Firebase Storage direct exports for components
export { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Offline functionality exports
export {
  queueMessageForSending,
  processPendingMessages
} from './offline';

// Utility exports
export {
  logFirebaseError,
  checkNetworkBeforeOperation,
  refreshFirebaseConnection,
  storeUserCredentials,
  clearUserCredentials,
  checkAndAutoSignIn,
  cleanupFirestoreListeners
} from './utils'; 