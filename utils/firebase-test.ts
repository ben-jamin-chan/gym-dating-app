/**
 * This file tests whether the Firebase exports are working correctly.
 * Run with: npx ts-node utils/firebase-test.ts
 */

import * as firebase from './firebase';

console.log('\n--- Testing Firebase Exports ---\n');

// Check core exports
console.log('app:', typeof firebase.app);
console.log('db:', typeof firebase.db);
console.log('auth:', typeof firebase.auth);

// Check utility functions
console.log('refreshFirebaseConnection:', typeof firebase.refreshFirebaseConnection);
console.log('getCurrentUser:', typeof firebase.getCurrentUser);

// Check auth functions
console.log('loginUser:', typeof firebase.loginUser);
console.log('registerUser:', typeof firebase.registerUser);

// Check messaging functions
console.log('sendMessage:', typeof firebase.sendMessage);
console.log('getMessages:', typeof firebase.getMessages);

console.log('\nIf any of the above show "undefined", there is an export issue.'); 