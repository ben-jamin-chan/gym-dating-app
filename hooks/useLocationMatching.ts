import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Match, UserProfile } from '@/types';

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

// Mock API call to get nearby users - in a real app, this would call a backend API
const fetchNearbyUsers = async (latitude: number, longitude: number): Promise<Match[]> => {
  // Simulating API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // In a real app, you would send the coordinates to your backend API
  // and receive a list of nearby users matching your criteria
  
  // For this example, we'll return mock data
  // We're simulating that this data came from a backend that calculated proximity
  return [
    {
      id: 'match1',
      userId: 'user1',
      name: 'Emma Wilson',
      photo: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg',
      matchedOn: new Date().toISOString(),
      newMatch: true
    },
    {
      id: 'match2',
      userId: 'user2',
      name: 'Mike Johnson',
      photo: 'https://images.pexels.com/photos/1431282/pexels-photo-1431282.jpeg',
      matchedOn: new Date().toISOString(),
      newMatch: true
    },
    {
      id: 'match3',
      userId: 'user3',
      name: 'Sophia Chen',
      photo: 'https://images.pexels.com/photos/3756165/pexels-photo-3756165.jpeg',
      matchedOn: new Date().toISOString(),
      newMatch: false
    }
  ];
};

export default function useLocationMatching(): LocationMatchState {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LocationError | null>(null);

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
        setError({
          type: 'api',
          message: 'Failed to fetch nearby matches'
        });
      }
    } catch (locationError) {
      setError({
        type: 'location',
        message: 'Error getting location'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getLocationAndMatches();
  }, []);

  const refreshMatches = async () => {
    await getLocationAndMatches();
  };

  return { loading, matches, error, refreshMatches };
} 