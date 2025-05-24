import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, MapPin, User, Globe } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { useAuthStore } from '@/utils/authStore';
import { UserPreferences } from '@/types';

// List of genders for selection
const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'All'];

// List of workout frequency options
const FREQUENCY_OPTIONS = ['Daily', '3-5x/week', '1-2x/week', 'Occasionally', 'All'];

// List of intensity options
const INTENSITY_OPTIONS = ['Light', 'Moderate', 'Intense', 'Very Intense', 'All'];

// List of preferred time options
const TIME_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Late Night', 'Flexible', 'All'];

export default function DiscoveryPreferencesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Preference states
  const [ageRange, setAgeRange] = useState({ min: 18, max: 45 });
  const [maxDistance, setMaxDistance] = useState(25);
  const [selectedGenders, setSelectedGenders] = useState<string[]>(['All']);
  const [selectedFrequencies, setSelectedFrequencies] = useState<string[]>(['All']);
  const [selectedIntensities, setSelectedIntensities] = useState<string[]>(['All']);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(['All']);
  const [globalMode, setGlobalMode] = useState(false);
  
  // Load user preferences from Firestore
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.uid) return;
      
      try {
        setLoading(true);
        const prefsDocRef = doc(db, 'userPreferences', user.uid);
        const prefsDoc = await getDoc(prefsDocRef);
        
        if (prefsDoc.exists()) {
          const prefsData = prefsDoc.data() as UserPreferences;
          
          // Set local state with loaded preferences
          setAgeRange(prefsData.ageRange || { min: 18, max: 45 });
          setMaxDistance(prefsData.maxDistance || 25);
          setGlobalMode(prefsData.globalMode || false);
          
          // Handle gender preferences
          if (prefsData.genderPreference === 'all') {
            setSelectedGenders(['All']);
          } else if (Array.isArray(prefsData.genderPreference)) {
            setSelectedGenders(prefsData.genderPreference);
          }
          
          // Handle workout frequency preferences
          if (prefsData.workoutFrequencyPreference) {
            setSelectedFrequencies(prefsData.workoutFrequencyPreference);
          }
          
          // Handle intensity preferences
          if (prefsData.intensityPreference) {
            setSelectedIntensities(prefsData.intensityPreference);
          }
          
          // Handle preferred time preferences
          if (prefsData.preferredTimePreference) {
            setSelectedTimes(prefsData.preferredTimePreference);
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
        Alert.alert('Error', 'Failed to load your preferences');
      } finally {
        setLoading(false);
      }
    };
    
    loadPreferences();
  }, [user?.uid]);
  
  // Save preferences to Firestore
  const savePreferences = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to save preferences');
      return;
    }
    
    try {
      setSaving(true);
      
      // Process gender preference
      let genderPreference: string[] | 'all' = selectedGenders;
      if (selectedGenders.includes('All')) {
        genderPreference = 'all';
      }
      
      // Create preferences object
      const preferences: UserPreferences = {
        userId: user.uid,
        ageRange,
        maxDistance,
        genderPreference,
        workoutFrequencyPreference: selectedFrequencies.includes('All') 
          ? ['All'] 
          : selectedFrequencies,
        intensityPreference: selectedIntensities.includes('All')
          ? ['All']
          : selectedIntensities,
        preferredTimePreference: selectedTimes.includes('All')
          ? ['All']
          : selectedTimes,
        globalMode
      };
      
      // Check if document exists
      const prefsDocRef = doc(db, 'userPreferences', user.uid);
      const prefsDoc = await getDoc(prefsDocRef);
      
      if (prefsDoc.exists()) {
        await updateDoc(prefsDocRef, preferences);
      } else {
        await setDoc(prefsDocRef, preferences);
      }
      
      Alert.alert('Success', 'Your discovery preferences have been saved!');
      router.back();
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save your preferences');
    } finally {
      setSaving(false);
    }
  };
  
  // Toggle gender selection
  const toggleGender = (gender: string) => {
    if (gender === 'All') {
      setSelectedGenders(['All']);
    } else {
      // If 'All' is currently selected and user selects a specific gender
      if (selectedGenders.includes('All')) {
        setSelectedGenders([gender]);
      } else {
        // Toggle the selected gender
        if (selectedGenders.includes(gender)) {
          // Don't allow removing the last selected gender
          if (selectedGenders.length > 1) {
            setSelectedGenders(selectedGenders.filter(g => g !== gender));
          }
        } else {
          setSelectedGenders([...selectedGenders, gender]);
        }
      }
    }
  };
  
  // Toggle workout frequency selection
  const toggleFrequency = (frequency: string) => {
    if (frequency === 'All') {
      setSelectedFrequencies(['All']);
    } else {
      // If 'All' is currently selected and user selects a specific frequency
      if (selectedFrequencies.includes('All')) {
        setSelectedFrequencies([frequency]);
      } else {
        // Toggle the selected frequency
        if (selectedFrequencies.includes(frequency)) {
          // Don't allow removing the last selected frequency
          if (selectedFrequencies.length > 1) {
            setSelectedFrequencies(selectedFrequencies.filter(f => f !== frequency));
          }
        } else {
          setSelectedFrequencies([...selectedFrequencies, frequency]);
        }
      }
    }
  };
  
  // Toggle intensity selection
  const toggleIntensity = (intensity: string) => {
    if (intensity === 'All') {
      setSelectedIntensities(['All']);
    } else {
      // If 'All' is currently selected and user selects a specific intensity
      if (selectedIntensities.includes('All')) {
        setSelectedIntensities([intensity]);
      } else {
        // Toggle the selected intensity
        if (selectedIntensities.includes(intensity)) {
          // Don't allow removing the last selected intensity
          if (selectedIntensities.length > 1) {
            setSelectedIntensities(selectedIntensities.filter(i => i !== intensity));
          }
        } else {
          setSelectedIntensities([...selectedIntensities, intensity]);
        }
      }
    }
  };
  
  // Toggle preferred time selection
  const toggleTime = (time: string) => {
    if (time === 'All') {
      setSelectedTimes(['All']);
    } else {
      // If 'All' is currently selected and user selects a specific time
      if (selectedTimes.includes('All')) {
        setSelectedTimes([time]);
      } else {
        // Toggle the selected time
        if (selectedTimes.includes(time)) {
          // Don't allow removing the last selected time
          if (selectedTimes.length > 1) {
            setSelectedTimes(selectedTimes.filter(t => t !== time));
          }
        } else {
          setSelectedTimes([...selectedTimes, time]);
        }
      }
    }
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FE3C72" />
          <Text style={styles.loadingText}>Loading your preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Discovery Preferences</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.content}>
        {/* Age Range Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Age Range</Text>
          <Text style={styles.rangeText}>
            {ageRange.min} - {ageRange.max} years
          </Text>
          
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>Min Age:</Text>
            <Slider
              style={styles.slider}
              minimumValue={18}
              maximumValue={ageRange.max}
              step={1}
              value={ageRange.min}
              onValueChange={(value) => setAgeRange({ ...ageRange, min: value })}
              minimumTrackTintColor="#FE3C72"
              maximumTrackTintColor="#D1D5DB"
              thumbTintColor="#FE3C72"
            />
            <Text style={styles.sliderValue}>{ageRange.min}</Text>
          </View>
          
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>Max Age:</Text>
            <Slider
              style={styles.slider}
              minimumValue={ageRange.min}
              maximumValue={99}
              step={1}
              value={ageRange.max}
              onValueChange={(value) => setAgeRange({ ...ageRange, max: value })}
              minimumTrackTintColor="#FE3C72"
              maximumTrackTintColor="#D1D5DB"
              thumbTintColor="#FE3C72"
            />
            <Text style={styles.sliderValue}>{ageRange.max}</Text>
          </View>
        </View>
        
        {/* Distance Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Maximum Distance</Text>
            <MapPin size={20} color="#6B7280" />
          </View>
          
          <Text style={styles.rangeText}>{maxDistance} km</Text>
          
          <View style={styles.sliderContainer}>
            <Slider
              style={[styles.slider, { marginLeft: 0 }]}
              minimumValue={1}
              maximumValue={160}
              step={1}
              value={maxDistance}
              onValueChange={setMaxDistance}
              minimumTrackTintColor="#FE3C72"
              maximumTrackTintColor="#D1D5DB"
              thumbTintColor="#FE3C72"
            />
            <Text style={styles.sliderValue}>{maxDistance}</Text>
          </View>
        </View>
        
        {/* Gender Preferences */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Show Me</Text>
            <User size={20} color="#6B7280" />
          </View>
          
          <View style={styles.optionsContainer}>
            {GENDER_OPTIONS.map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.optionButton,
                  selectedGenders.includes(gender) && styles.optionButtonSelected
                ]}
                onPress={() => toggleGender(gender)}
              >
                <Text 
                  style={[
                    styles.optionText,
                    selectedGenders.includes(gender) && styles.optionTextSelected
                  ]}
                >
                  {gender}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Workout Frequency Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Frequency</Text>
          
          <View style={styles.optionsContainer}>
            {FREQUENCY_OPTIONS.map((frequency) => (
              <TouchableOpacity
                key={frequency}
                style={[
                  styles.optionButton,
                  selectedFrequencies.includes(frequency) && styles.optionButtonSelected
                ]}
                onPress={() => toggleFrequency(frequency)}
              >
                <Text 
                  style={[
                    styles.optionText,
                    selectedFrequencies.includes(frequency) && styles.optionTextSelected
                  ]}
                >
                  {frequency}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Intensity Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Intensity</Text>
          
          <View style={styles.optionsContainer}>
            {INTENSITY_OPTIONS.map((intensity) => (
              <TouchableOpacity
                key={intensity}
                style={[
                  styles.optionButton,
                  selectedIntensities.includes(intensity) && styles.optionButtonSelected
                ]}
                onPress={() => toggleIntensity(intensity)}
              >
                <Text 
                  style={[
                    styles.optionText,
                    selectedIntensities.includes(intensity) && styles.optionTextSelected
                  ]}
                >
                  {intensity}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Preferred Time Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Time</Text>
          
          <View style={styles.optionsContainer}>
            {TIME_OPTIONS.map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.optionButton,
                  selectedTimes.includes(time) && styles.optionButtonSelected
                ]}
                onPress={() => toggleTime(time)}
              >
                <Text 
                  style={[
                    styles.optionText,
                    selectedTimes.includes(time) && styles.optionTextSelected
                  ]}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Global Mode */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Global Mode</Text>
            <Globe size={20} color="#6B7280" />
          </View>
          
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleDescription}>
              Match with gym-goers around the world. Ignore distance settings.
            </Text>
            <Switch
              value={globalMode}
              onValueChange={setGlobalMode}
              trackColor={{ false: '#D1D5DB', true: '#FE3C72' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
        
        {/* Save Button */}
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={savePreferences}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Preferences</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 14,
  },
  rangeText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FE3C72',
    marginBottom: 16,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sliderLabel: {
    width: 80,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  slider: {
    flex: 1,
    height: 40,
    marginLeft: 8,
  },
  sliderValue: {
    width: 40,
    textAlign: 'right',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    marginBottom: 10,
  },
  optionButtonSelected: {
    backgroundColor: '#FE3C72',
    borderColor: '#FE3C72',
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleDescription: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginRight: 16,
  },
  saveButton: {
    backgroundColor: '#FE3C72',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
}); 