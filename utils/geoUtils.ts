/**
 * Utility functions for geolocation calculations
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate the distance between two geographical points using the Haversine formula
 * @param coord1 First coordinate (lat, lng)
 * @param coord2 Second coordinate (lat, lng)
 * @returns Distance in kilometers
 */
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  
  const earthRadiusKm = 6371; // Earth's radius in kilometers
  
  const lat1Rad = toRadians(coord1.latitude);
  const lat2Rad = toRadians(coord2.latitude);
  const deltaLatRad = toRadians(coord2.latitude - coord1.latitude);
  const deltaLngRad = toRadians(coord2.longitude - coord1.longitude);
  
  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  const distance = earthRadiusKm * c;
  
  // Round to 1 decimal place
  return Math.round(distance * 10) / 10;
};

/**
 * Check if a coordinate is within a specified distance from another coordinate
 * @param coord1 First coordinate (typically user's location)
 * @param coord2 Second coordinate (typically potential match's location)
 * @param maxDistanceKm Maximum distance in kilometers
 * @returns True if coord2 is within range of coord1
 */
export const isWithinDistance = (
  coord1: Coordinates, 
  coord2: Coordinates, 
  maxDistanceKm: number
): boolean => {
  const distance = calculateDistance(coord1, coord2);
  return distance <= maxDistanceKm;
};

/**
 * Sort an array of items by their distance from a reference point
 * @param items Array of items with location property
 * @param referencePoint Reference coordinate to calculate distance from
 * @returns Sorted array with distance property added
 */
export const sortByDistance = <T extends { location?: Coordinates }>(
  items: T[],
  referencePoint: Coordinates
): (T & { distance: number })[] => {
  return items
    .filter(item => item.location) // Only include items with location
    .map(item => ({
      ...item,
      distance: calculateDistance(referencePoint, item.location!)
    }))
    .sort((a, b) => a.distance - b.distance);
};

/**
 * Filter items by maximum distance from a reference point
 * @param items Array of items with location property
 * @param referencePoint Reference coordinate to calculate distance from
 * @param maxDistanceKm Maximum distance in kilometers
 * @returns Filtered array with items within distance range
 */
export const filterByDistance = <T extends { location?: Coordinates }>(
  items: T[],
  referencePoint: Coordinates,
  maxDistanceKm: number
): (T & { distance: number })[] => {
  return sortByDistance(items, referencePoint)
    .filter(item => item.distance <= maxDistanceKm);
};

/**
 * Get the current user's location using expo-location
 * @returns Promise resolving to user's coordinates or null if unavailable
 */
export const getCurrentUserLocation = async (): Promise<Coordinates | null> => {
  try {
    const Location = require('expo-location');
    
    // Check if location permissions are granted
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Location permissions not granted');
      return null;
    }
    
    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
}; 