import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { safeStringify } from './safeStringify';

// Function to check if device is online
export const checkNetworkStatus = async () => {
  // For web, use navigator.onLine
  if (Platform.OS === 'web') {
    console.log(`Network status (navigator.onLine): ${navigator.onLine}`);
    return navigator.onLine;
  } 
  
  // For native platforms, use NetInfo
  const netInfo = await NetInfo.fetch();
  console.log(`Network status: ${safeStringify({
    isConnected: netInfo.isConnected,
    type: netInfo.type,
    details: netInfo.details,
  })}`);
  
  return netInfo.isConnected;
};

// Function to test Firebase connectivity
export const testFirebaseConnection = async () => {
  try {
    // Try to fetch Firebase JS SDK to verify connectivity
    const response = await fetch('https://www.gstatic.com/firebasejs/live/3.1/firebase.js');
    const status = response.status;
    console.log(`Firebase connection test: ${status === 200 ? 'SUCCESS' : 'FAILED'} (status: ${status})`);
    return status === 200;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
}; 