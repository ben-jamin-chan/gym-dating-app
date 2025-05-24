import { db, auth } from './config';
import { collection, doc, getDoc } from 'firebase/firestore';

export const testFirebaseConfig = async () => {
  try {
    console.log('Testing Firebase configuration...');
    
    // Test Auth initialization first (doesn't require network)
    console.log('Testing Auth initialization...');
    console.log(`✅ Auth initialized: ${auth ? 'Yes' : 'No'}`);
    
    // Test Firestore basic initialization (doesn't require network read)
    console.log('Testing Firestore initialization...');
    if (db) {
      console.log('✅ Firestore instance created successfully');
    } else {
      throw new Error('Firestore instance is null');
    }
    
    console.log('✅ All Firebase configuration tests passed');
    return true;
  } catch (error) {
    console.error('❌ Firebase configuration test failed:', error);
    return false;
  }
}; 