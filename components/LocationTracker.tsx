import React, { useEffect, useState, useRef } from 'react';
import * as Location from 'expo-location';
import { View, Text } from 'react-native';
import { useAuthStore } from '@/utils/authStore';
import { updateUserLocation } from '@/utils/firebase';
import NetInfo from '@react-native-community/netinfo';

// This component doesn't render anything visible, it just tracks location
export default function LocationTracker() {
  const { user } = useAuthStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const locationUpdateFailures = useRef(0);
  
  // Setup network state monitoring
  useEffect(() => {
    // Setup network state listener
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected && state.isInternetReachable !== false);
    });
    
    // Initial network check
    NetInfo.fetch().then(state => {
      setIsOnline(!!state.isConnected && state.isInternetReachable !== false);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
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
        try {
          const success = await updateUserLocation(
            user.uid,
            initialLocation.coords.latitude,
            initialLocation.coords.longitude
          );
          
          if (!success) {
            console.log('Initial location update was queued for later (offline)');
            locationUpdateFailures.current++;
          } else {
            // Reset failure counter on success
            locationUpdateFailures.current = 0;
          }
        } catch (error) {
          console.log('Error updating initial location, will retry later:', error);
          locationUpdateFailures.current++;
        }
        
        // Subscribe to location updates with reduced frequency if offline
        const updateInterval = isOnline ? 5 * 60 * 1000 : 15 * 60 * 1000; // 5 minutes if online, 15 if offline
        
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 100, // Update if user moves more than 100 meters
            timeInterval: updateInterval,
          },
          async (location) => {
            // Update user's location in Firestore, but don't throw if it fails
            try {
              const success = await updateUserLocation(
                user.uid,
                location.coords.latitude,
                location.coords.longitude
              );
              
              if (!success) {
                console.log('Location update was queued for later (offline)');
                locationUpdateFailures.current++;
                
                // If we have too many failures, slow down the updates even more
                if (locationUpdateFailures.current >= 3 && locationSubscription) {
                  // Remove the current subscription
                  locationSubscription.remove();
                  
                  // Start a new subscription with reduced frequency
                  locationSubscription = await Location.watchPositionAsync(
                    {
                      accuracy: Location.Accuracy.Balanced,
                      distanceInterval: 500, // Increase distance threshold to 500 meters
                      timeInterval: 30 * 60 * 1000, // 30 minutes
                    },
                    async (newLocation) => {
                      // Same handler, but now will run less frequently
                      try {
                        await updateUserLocation(
                          user.uid,
                          newLocation.coords.latitude,
                          newLocation.coords.longitude
                        );
                      } catch (error) {
                        // Just log, don't increment failures counter again
                        console.log('Error updating location with reduced frequency:', error);
                      }
                    }
                  );
                }
              } else {
                // Reset failure counter on success
                locationUpdateFailures.current = 0;
              }
            } catch (error) {
              console.log('Error updating location, will retry later:', error);
            }
          }
        );
      } catch (error) {
        console.log('Error tracking location:', error);
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
  }, [user?.uid, isOnline]); // Re-initialize when network state changes
  
  // This component doesn't render anything visible
  return null;
} 