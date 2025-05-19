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
  enableFirestoreNetwork
} from './config';

// Auth exports
export {
  registerUser,
  loginUser,
  logoutUser,
  resetPassword,
  updateUserProfile,
  getCurrentUser,
  subscribeToAuthChanges
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
  checkAndAutoSignIn
} from './utils'; 