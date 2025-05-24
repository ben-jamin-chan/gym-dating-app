/**
 * Test script for geo utilities
 * This can be run to verify distance calculations are working correctly
 */

import { calculateDistance, isWithinDistance, Coordinates } from './geoUtils';

// Test coordinates for verification
const testLocations = {
  // San Francisco, CA
  sanFrancisco: { latitude: 37.7749, longitude: -122.4194 },
  // Los Angeles, CA (about 383 km from SF)
  losAngeles: { latitude: 34.0522, longitude: -118.2437 },
  // Oakland, CA (about 13 km from SF)
  oakland: { latitude: 37.8044, longitude: -122.2712 },
  // New York, NY (about 4,135 km from SF)
  newYork: { latitude: 40.7128, longitude: -74.0060 },
};

/**
 * Run distance calculation tests
 */
export const runGeoTests = () => {
  console.log('=== Geo Utils Test Results ===');
  
  // Test 1: SF to LA (should be ~383 km)
  const sfToLa = calculateDistance(testLocations.sanFrancisco, testLocations.losAngeles);
  console.log(`SF to LA: ${sfToLa} km (expected ~383 km)`);
  
  // Test 2: SF to Oakland (should be ~13 km)
  const sfToOakland = calculateDistance(testLocations.sanFrancisco, testLocations.oakland);
  console.log(`SF to Oakland: ${sfToOakland} km (expected ~13 km)`);
  
  // Test 3: SF to NYC (should be ~4,135 km)
  const sfToNyc = calculateDistance(testLocations.sanFrancisco, testLocations.newYork);
  console.log(`SF to NYC: ${sfToNyc} km (expected ~4,135 km)`);
  
  // Test 4: Within distance checks
  console.log('\n=== Distance Range Tests ===');
  console.log(`Oakland within 25km of SF: ${isWithinDistance(testLocations.sanFrancisco, testLocations.oakland, 25)}`);
  console.log(`LA within 25km of SF: ${isWithinDistance(testLocations.sanFrancisco, testLocations.losAngeles, 25)}`);
  console.log(`LA within 500km of SF: ${isWithinDistance(testLocations.sanFrancisco, testLocations.losAngeles, 500)}`);
  
  console.log('=== Tests Complete ===');
};

// Export test locations for use in other tests
export { testLocations }; 