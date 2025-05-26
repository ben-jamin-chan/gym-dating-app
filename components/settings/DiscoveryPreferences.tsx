import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MapPin, User } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { UserPreferences } from '@/types';

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'All'];
const FREQUENCY_OPTIONS = ['Daily', '3-5x/week', '1-2x/week', 'Occasionally', 'All'];
const INTENSITY_OPTIONS = ['Light', 'Moderate', 'Intense', 'Very Intense', 'All'];
const TIME_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Late Night', 'Flexible', 'All'];

interface DiscoveryPreferencesProps {
  userId: string;
  onPreferencesSaved?: () => void;
}

export function DiscoveryPreferences({ userId, onPreferencesSaved }: DiscoveryPreferencesProps) {
  const [ageRange, setAgeRange] = useState({ min: 18, max: 45 });
  const [maxDistance, setMaxDistance] = useState(25);
  const [selectedGenders, setSelectedGenders] = useState<string[]>(['All']);
  const [selectedFrequencies, setSelectedFrequencies] = useState<string[]>(['All']);
  const [selectedIntensities, setSelectedIntensities] = useState<string[]>(['All']);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(['All']);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    if (!userId) return;
    
    try {
      const prefsDocRef = doc(db, 'userPreferences', userId);
      const prefsDoc = await getDoc(prefsDocRef);
      
      if (prefsDoc.exists()) {
        const prefsData = prefsDoc.data() as UserPreferences;
        
        setAgeRange(prefsData.ageRange || { min: 18, max: 45 });
        setMaxDistance(prefsData.maxDistance || 25);
        
        if (prefsData.genderPreference === 'all') {
          setSelectedGenders(['All']);
        } else if (Array.isArray(prefsData.genderPreference)) {
          setSelectedGenders(prefsData.genderPreference);
        }
        
        if (prefsData.workoutFrequencyPreference) {
          setSelectedFrequencies(prefsData.workoutFrequencyPreference);
        }
        
        if (prefsData.intensityPreference) {
          setSelectedIntensities(prefsData.intensityPreference);
        }
        
        if (prefsData.preferredTimePreference) {
          setSelectedTimes(prefsData.preferredTimePreference);
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const toggleSelection = (
    item: string, 
    selectedItems: string[], 
    setSelectedItems: (items: string[]) => void
  ) => {
    if (item === 'All') {
      setSelectedItems(['All']);
    } else {
      if (selectedItems.includes('All')) {
        setSelectedItems([item]);
      } else {
        if (selectedItems.includes(item)) {
          if (selectedItems.length > 1) {
            setSelectedItems(selectedItems.filter(i => i !== item));
          }
        } else {
          setSelectedItems([...selectedItems, item]);
        }
      }
    }
  };

  const savePreferences = async () => {
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to save preferences');
      return;
    }

    setIsLoading(true);
    try {
      const genderPreference = selectedGenders.includes('All') ? 'all' : selectedGenders;
      
      const preferencesData = {
        ageRange,
        maxDistance,
        genderPreference,
        workoutFrequencyPreference: selectedFrequencies,
        intensityPreference: selectedIntensities,
        preferredTimePreference: selectedTimes,
        updatedAt: new Date()
      };

      const prefsDocRef = doc(db, 'userPreferences', userId);
      await setDoc(prefsDocRef, preferencesData, { merge: true });
      
      Alert.alert('Success', 'Your discovery preferences have been saved!');
      onPreferencesSaved?.();
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderOptionsContainer = (
    options: string[], 
    selectedItems: string[], 
    onToggle: (item: string) => void
  ) => (
    <View style={styles.optionsContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.optionButton,
            selectedItems.includes(option) && styles.optionButtonSelected
          ]}
          onPress={() => onToggle(option)}
        >
          <Text 
            style={[
              styles.optionText,
              selectedItems.includes(option) && styles.optionTextSelected
            ]}
          >
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Age Range Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Age Range</Text>
        <Text style={styles.rangeText}>{ageRange.min} - {ageRange.max} years</Text>
        
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Min:</Text>
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
          <Text style={styles.sliderLabel}>Max:</Text>
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
        
        {renderOptionsContainer(
          GENDER_OPTIONS, 
          selectedGenders, 
          (gender) => toggleSelection(gender, selectedGenders, setSelectedGenders)
        )}
      </View>
      
      {/* Workout Frequency */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workout Frequency</Text>
        {renderOptionsContainer(
          FREQUENCY_OPTIONS, 
          selectedFrequencies, 
          (freq) => toggleSelection(freq, selectedFrequencies, setSelectedFrequencies)
        )}
      </View>
      
      {/* Workout Intensity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workout Intensity</Text>
        {renderOptionsContainer(
          INTENSITY_OPTIONS, 
          selectedIntensities, 
          (intensity) => toggleSelection(intensity, selectedIntensities, setSelectedIntensities)
        )}
      </View>
      
      {/* Preferred Time */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferred Time</Text>
        {renderOptionsContainer(
          TIME_OPTIONS, 
          selectedTimes, 
          (time) => toggleSelection(time, selectedTimes, setSelectedTimes)
        )}
      </View>

      {/* Save Button */}
      <TouchableOpacity 
        style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
        onPress={savePreferences}
        disabled={isLoading}
      >
        <Text style={styles.saveButtonText}>
          {isLoading ? 'Saving...' : 'Save Preferences'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rangeText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FE3C72',
    marginBottom: 12,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderLabel: {
    width: 40,
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
    width: 35,
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
  saveButton: {
    backgroundColor: '#FE3C72',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
}); 