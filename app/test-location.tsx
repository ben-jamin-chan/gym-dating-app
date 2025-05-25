import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { runGeoTests } from '@/utils/testGeoUtils';
import { calculateDistance, getCurrentUserLocation } from '@/utils/geoUtils';
import { getCurrentUser } from '@/utils/firebase';
import { getPotentialMatchesWithPreferences } from '@/services/matchService';

export default function TestLocationScreen() {
  const router = useRouter();
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [locationPermission, setLocationPermission] = useState<string>('unknown');
  const [testResults, setTestResults] = useState<string>('');
  const [matchTestResults, setMatchTestResults] = useState<string>('');

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status);
      
      if (status === 'granted') {
        getCurrentLocation();
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCurrentLocation(location.coords);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const runDistanceTests = () => {
    try {
      // Capture console.log output
      const originalLog = console.log;
      let testOutput = '';
      
      console.log = (...args) => {
        testOutput += args.join(' ') + '\n';
        originalLog(...args);
      };
      
      runGeoTests();
      
      // Restore original console.log
      console.log = originalLog;
      
      setTestResults(testOutput);
    } catch (error: any) {
      setTestResults(`Error running tests: ${error?.message || 'Unknown error'}`);
    }
  };

  const testLocationBasedMatching = async () => {
    try {
      const user = getCurrentUser();
      if (!user) {
        setMatchTestResults('Error: No authenticated user found');
        return;
      }

      setMatchTestResults('Testing location-based matching...\n');
      
      const matches = await getPotentialMatchesWithPreferences(user.uid);
      
      let output = `Found ${matches.length} potential matches:\n\n`;
      
      matches.forEach((match, index) => {
        output += `${index + 1}. ${match.displayName || match.name} (${match.age})\n`;
        if (match.distance !== undefined) {
          output += `   Distance: ${match.distance} km\n`;
        } else {
          output += `   Distance: Not available\n`;
        }
        output += `   Location: ${match.location ? 'Available' : 'Not available'}\n\n`;
      });
      
      setMatchTestResults(output);
    } catch (error: any) {
      setMatchTestResults(`Error testing matches: ${error?.message || 'Unknown error'}`);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      
      if (status === 'granted') {
        getCurrentLocation();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request location permission');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Location Debug Screen</Text>
        
        {/* Location Permission Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Permission</Text>
          <Text style={styles.statusText}>Status: {locationPermission}</Text>
          {locationPermission !== 'granted' && (
            <TouchableOpacity style={styles.button} onPress={requestLocationPermission}>
              <Text style={styles.buttonText}>Request Permission</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Current Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Location</Text>
          {currentLocation ? (
            <View>
              <Text style={styles.infoText}>Latitude: {currentLocation.latitude}</Text>
              <Text style={styles.infoText}>Longitude: {currentLocation.longitude}</Text>
              <Text style={styles.infoText}>Accuracy: {currentLocation.accuracy}m</Text>
            </View>
          ) : (
            <Text style={styles.infoText}>Location not available</Text>
          )}
          <TouchableOpacity style={styles.button} onPress={getCurrentLocation}>
            <Text style={styles.buttonText}>Refresh Location</Text>
          </TouchableOpacity>
        </View>

        {/* Distance Calculation Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distance Calculation Tests</Text>
          <TouchableOpacity style={styles.button} onPress={runDistanceTests}>
            <Text style={styles.buttonText}>Run Tests</Text>
          </TouchableOpacity>
          {testResults ? (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsText}>{testResults}</Text>
            </View>
          ) : null}
        </View>

        {/* Location-Based Matching Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location-Based Matching Test</Text>
          <TouchableOpacity style={styles.button} onPress={testLocationBasedMatching}>
            <Text style={styles.buttonText}>Test Matching</Text>
          </TouchableOpacity>
          {matchTestResults ? (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsText}>{matchTestResults}</Text>
            </View>
          ) : null}
        </View>

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back to App</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  button: {
    backgroundColor: '#FF5864',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#6B7280',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 40,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resultsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF5864',
  },
  resultsText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
}); 