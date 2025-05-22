import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Match, UserProfile } from '@/types';
import { geoFirestore, db } from '@/utils/firebase';
import { collection, getDocs, query, where, GeoPoint, doc, getDoc } from 'firebase/firestore';
import { useAuthStore } from '@/utils/authStore';

type LocationError = {
  type: 'permission' | 'location' | 'api';
  message: string;
};

type LocationMatchState = {
  loading: boolean;
  matches: Match[];
  error: LocationError | null;
  refreshMatches: () => Promise<void>;
};

export default function useLocationMatching(): LocationMatchState {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LocationError | null>(null);
  const { user } = useAuthStore();
  
  const fetchNearbyUsers = async (latitude: number, longitude: number, maxDistanceKm: number = 25): Promise<Match[]> => {
    try {
      // Get the current user's preferences
      const userPrefsRef = doc(db, 'userPreferences', user?.uid || '');
      let maxDistance = maxDistanceKm;
      let globalMode = false;
      
      // If we have user preferences, use those instead
      try {
        const userPrefsDoc = await getDoc(userPrefsRef);
        if (userPrefsDoc.exists()) {
          const userPrefs = userPrefsDoc.data();
          maxDistance = userPrefs.maxDistance || maxDistance;
          globalMode = userPrefs.globalMode || false;
        }
      } catch (e) {
        console.warn('Could not load user preferences:', e);
        // Continue with defaults
      }
      
      console.log(`Searching for users within ${maxDistance} km, global mode: ${globalMode}`);
      
      // For testing purposes, return some mock data until geolocation is fully implemented
      // You should replace this with real GeoFirestore implementation
      const mockUsers = [
        {
          id: 'user1',
          displayName: 'Emma Wilson',
          photo: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg',
          distance: 2.5, 
          matchedOn: new Date().toISOString(),
          newMatch: false
        },
        {
          id: 'user2',
          displayName: 'Mike Johnson',
          photo: 'https://images.pexels.com/photos/1431282/pexels-photo-1431282.jpeg',
          distance: 4.7,
          matchedOn: new Date().toISOString(),
          newMatch: false
        },
        {
          id: 'user3',
          displayName: 'Sophia Chen',
          photo: 'https://images.pexels.com/photos/3756165/pexels-photo-3756165.jpeg',
          distance: 1.2,
          matchedOn: new Date().toISOString(),
          newMatch: false
        }
      ];
      
      const matchedUsers = mockUsers
        .filter(mockUser => mockUser.id !== user?.uid)
        .map(mockUser => ({
          id: `match_${mockUser.id}`,
          userId: mockUser.id,
          name: mockUser.displayName,
          photo: mockUser.photo,
          matchedOn: mockUser.matchedOn,
          newMatch: mockUser.newMatch,
          distance: mockUser.distance
        }));
      
      console.log(`Found ${matchedUsers.length} nearby users`);
      return matchedUsers;
    } catch (error) {
      console.error('Error fetching nearby users:', error);
      throw error;
    }
  };

  const getLocationAndMatches = async () => {
    try {
      setLoading(true);
      setError(null);

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setError({
          type: 'permission',
          message: 'Permission to access location was denied'
        });
        setLoading(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Call API to get nearby matches
      try {
        const nearbyMatches = await fetchNearbyUsers(
          location.coords.latitude,
          location.coords.longitude
        );
        setMatches(nearbyMatches);
      } catch (apiError) {
        console.error('API error:', apiError);
        setError({
          type: 'api',
          message: 'Failed to fetch nearby matches'
        });
      }
    } catch (locationError) {
      console.error('Location error:', locationError);
      setError({
        type: 'location',
        message: 'Error getting location'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      getLocationAndMatches();
    }
  }, [user?.uid]);

  const refreshMatches = async () => {
    await getLocationAndMatches();
  };

  return { loading, matches, error, refreshMatches };
} 