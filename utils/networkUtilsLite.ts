import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

/**
 * Simplified network utilities that focus on basic connectivity checks
 * without requiring Firebase-specific functionality
 */

// Function to check if device is online
export const checkNetworkStatus = async () => {
  // For web, use navigator.onLine
  if (Platform.OS === 'web') {
    console.log(`Network status (navigator.onLine): ${navigator.onLine}`);
    return navigator.onLine;
  } 
  
  // For native platforms, use NetInfo
  const netInfo = await NetInfo.fetch();
  console.log(`Network status: ${JSON.stringify({
    isConnected: netInfo.isConnected,
    type: netInfo.type,
    details: netInfo.details,
  })}`);
  
  return netInfo.isConnected;
};

// Function to test general internet connectivity (without depending on Firebase)
export const testInternetConnectivity = async () => {
  // Define multiple endpoints to try in order
  const endpoints = [
    'https://httpbin.org/get',
    'https://www.cloudflare.com/cdn-cgi/trace',
    'https://www.apple.com',
    'https://www.google.com'
  ];
  
  // Try each endpoint
  for (const endpoint of endpoints) {
    try {
      // Use a timeout to avoid hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(endpoint, { 
        method: 'GET',
        signal: controller.signal,
        // Add cache control to prevent caching issues
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      clearTimeout(timeoutId);
      
      const status = response.status;
      console.log(`Internet connectivity test (${endpoint}): ${status >= 200 && status < 300 ? 'SUCCESS' : 'FAILED'} (status: ${status})`);
      
      if (status >= 200 && status < 300) {
        return true;
      }
    } catch (error) {
      console.log(`Internet connectivity test failed for ${endpoint}:`, error);
      // Continue to the next endpoint
    }
  }
  
  // If all endpoints failed
  console.error('Internet connectivity test failed for all endpoints');
  return false;
};

// Get detailed network information
export const getDetailedNetworkInfo = async () => {
  if (Platform.OS === 'web') {
    return {
      isConnected: navigator.onLine,
      connectionType: 'unknown',
      details: {
        isConnectionExpensive: false,
        cellularGeneration: null
      }
    };
  }
  
  const netInfo = await NetInfo.fetch();
  return {
    isConnected: netInfo.isConnected,
    connectionType: netInfo.type,
    details: {
      isConnectionExpensive: netInfo.details?.isConnectionExpensive || false,
      cellularGeneration: netInfo.details?.cellularGeneration || null,
      strength: Platform.OS === 'android' ? netInfo.details?.strength : undefined,
      ssid: netInfo.details?.ssid,
      ipAddress: netInfo.details?.ipAddress
    }
  };
}; 