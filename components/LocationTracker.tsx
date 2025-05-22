import React, { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { View, Text } from 'react-native';
import { useAuthStore } from '@/utils/authStore';
import { updateUserLocation } from '@/utils/firebase';

// This component doesn't render anything visible, it just tracks location
export default function LocationTracker() {
  const { user } = useAuthStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  useEffect(() => {
    // Only track location if user is logged in
    if (!user?.uid) return;
    
    let locationSubscription: Location.LocationSubscription | null = null;
    
    const startLocationTracking = async () => {
      try {
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          console.log('Location permission denied');
          return;
        }
        
        // Get initial location
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        // Update user's location in Firestore
        await updateUserLocation(
          user.uid,
          initialLocation.coords.latitude,
          initialLocation.coords.longitude
        );
        
        // Subscribe to location updates
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 100, // Update if user moves more than 100 meters
            timeInterval: 5 * 60 * 1000, // Update every 5 minutes maximum
          },
          async (location) => {
            // Update user's location in Firestore
            await updateUserLocation(
              user.uid,
              location.coords.latitude,
              location.coords.longitude
            );
          }
        );
      } catch (error) {
        console.error('Error tracking location:', error);
        setErrorMsg('Error tracking location');
      }
    };
    
    startLocationTracking();
    
    // Cleanup
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [user?.uid]);
  
  // This component doesn't render anything visible
  return null;
} 