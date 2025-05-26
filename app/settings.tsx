import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import { useAuthStore } from '@/utils/authStore';
<<<<<<< Updated upstream
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { UserPreferences } from '@/types';

// List of genders for selection
const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'All'];

// List of workout frequency options
const FREQUENCY_OPTIONS = ['Daily', '3-5x/week', '1-2x/week', 'Occasionally', 'All'];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateProfile, logout, isLoading, error } = useAuthStore();
=======
import { 
  SettingsSection, 
  SectionHeader, 
  ToggleSetting, 
  ErrorMessage 
} from '@/components/ui/SettingsComponents';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { DiscoveryPreferences } from '@/components/settings/DiscoveryPreferences';
import { HeaderWithBackButton } from '@/components/ui/HeaderWithBackButton';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, error } = useAuthStore();
>>>>>>> Stashed changes
  
  // App Settings states
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
<<<<<<< Updated upstream
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [showOnTinder, setShowOnTinder] = useState(true);
  const [smartPhotos, setSmartPhotos] = useState(true);
  const [showOrientation, setShowOrientation] = useState(false);
  
  // Discovery Preferences
  const [ageRange, setAgeRange] = useState({ min: 18, max: 45 });
  const [maxDistance, setMaxDistance] = useState(25);
  const [selectedGenders, setSelectedGenders] = useState<string[]>(['All']);
  const [selectedFrequencies, setSelectedFrequencies] = useState<string[]>(['All']);
  const [showDiscoveryOptions, setShowDiscoveryOptions] = useState(false);
  
  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.uid) return;
      
      try {
        const prefsDocRef = doc(db, 'userPreferences', user.uid);
        const prefsDoc = await getDoc(prefsDocRef);
        
        if (prefsDoc.exists()) {
          const prefsData = prefsDoc.data() as UserPreferences;
          
          // Set local state with loaded preferences
          setAgeRange(prefsData.ageRange || { min: 18, max: 45 });
          setMaxDistance(prefsData.maxDistance || 25);
          
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
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };
    
    loadPreferences();
  }, [user?.uid]);
  
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
  
  // Save discovery preferences
  const saveDiscoveryPreferences = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to save preferences');
      return;
    }
    
    try {
      setSavingPreferences(true);
      
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
        globalMode: false // Default to false since we're removing this option
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
      setShowDiscoveryOptions(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save your preferences');
    } finally {
      setSavingPreferences(false);
    }
  };
  
  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }
    
    setIsUpdating(true);
    
    try {
      await updateProfile(displayName);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      // Redirect to login page after successful logout
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };
=======
  const [showDiscoveryOptions, setShowDiscoveryOptions] = useState(false);
  
  if (!user) {
    return <ErrorMessage message="You must be logged in to access settings" />;
  }
>>>>>>> Stashed changes

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <HeaderWithBackButton 
        title="Settings" 
        onBackPress={() => router.back()} 
      />
      
      <ScrollView style={styles.content}>
        {error && <ErrorMessage message={error} />}

        {/* Account Settings */}
        <SettingsSection>
          <AccountSettings email={user.email || ''} />
        </SettingsSection>
        
        {/* Discovery Preferences */}
        <SettingsSection>
          <SectionHeader title="Discovery Preferences" />
          
          {!showDiscoveryOptions ? (
            <>
<<<<<<< Updated upstream
              {renderSettingItem('Distance', () => {
                setShowDiscoveryOptions(true);
              }, true, <MapPin size={20} color="#6B7280" />)}
              
              {renderSettingItem('Age Range', () => {
                setShowDiscoveryOptions(true);
              }, true)}
              
              {renderSettingItem('Gender Preferences', () => {
                setShowDiscoveryOptions(true);
              }, true)}
              
              {renderSettingItem('Workout Frequency', () => {
                setShowDiscoveryOptions(true);
              }, true)}
            </>
          ) : (
            <>
              {/* Age Range Section */}
              <View style={styles.preferencesSection}>
                <Text style={styles.preferencesTitle}>Age Range</Text>
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
              <View style={styles.preferencesSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.preferencesTitle}>Maximum Distance</Text>
                  <MapPin size={20} color="#6B7280" />
                </View>
                
                <Text style={styles.rangeText}>{maxDistance} miles</Text>
                
                <View style={styles.sliderContainer}>
                  <Slider
                    style={[styles.slider, { marginLeft: 0 }]}
                    minimumValue={1}
                    maximumValue={100}
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
              <View style={styles.preferencesSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.preferencesTitle}>Show Me</Text>
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
              <View style={styles.preferencesSection}>
                <Text style={styles.preferencesTitle}>Workout Frequency</Text>
                
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
              
              {/* Save/Cancel Buttons */}
              <View style={styles.buttonsRow}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowDiscoveryOptions(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={saveDiscoveryPreferences}
                  disabled={savingPreferences}
                >
                  {savingPreferences ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
=======
              <ToggleSetting
                title="Show Discovery Options"
                value={showDiscoveryOptions}
                onValueChange={setShowDiscoveryOptions}
                icon={<MapPin size={20} color="#6B7280" />}
              />
            </>
          ) : (
            <DiscoveryPreferences 
              userId={user.uid}
              onPreferencesSaved={() => setShowDiscoveryOptions(false)}
            />
>>>>>>> Stashed changes
          )}
        </SettingsSection>
        
        {/* Notifications */}
<<<<<<< Updated upstream
        <View style={styles.section}>
          {renderSectionHeader('Notifications')}
          
          {renderToggleSetting('Push Notifications', pushNotifications, setPushNotifications, <Bell size={20} color="#6B7280" />)}
          
          {renderToggleSetting('Email Notifications', emailNotifications, setEmailNotifications)}
        </View>
=======
        <SettingsSection>
          <NotificationSettings
            pushNotifications={pushNotifications}
            setPushNotifications={setPushNotifications}
            emailNotifications={emailNotifications}
            setEmailNotifications={setEmailNotifications}
          />
        </SettingsSection>
>>>>>>> Stashed changes
        
        {/* App Settings */}
        <SettingsSection>
          <SectionHeader title="App Settings" />
          <ToggleSetting
            title="Location Services"
            value={locationEnabled}
            onValueChange={setLocationEnabled}
            icon={<MapPin size={20} color="#6B7280" />}
          />
        </SettingsSection>
        
        <View style={styles.versionContainer}>
          <SettingsSection>
            <SectionHeader title="Version 1.0.0" />
          </SettingsSection>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
<<<<<<< Updated upstream
  versionText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  preferencesSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  preferencesTitle: {
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
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#FE3C72',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
=======
>>>>>>> Stashed changes
}); 