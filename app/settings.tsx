import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, ChevronRight, LogOut, Trash, Bell, Lock, Shield, MapPin, Search, Smile, Phone, User } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { useAuthStore } from '@/utils/authStore';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { UserPreferences } from '@/types';

// List of genders for selection
const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'All'];

// List of workout frequency options
const FREQUENCY_OPTIONS = ['Daily', '3-5x/week', '1-2x/week', 'Occasionally', 'All'];

// List of intensity options
const INTENSITY_OPTIONS = ['Light', 'Moderate', 'Intense', 'Very Intense', 'All'];

// List of preferred time options
const TIME_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Late Night', 'Flexible', 'All'];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateProfile, logout, isLoading, error } = useAuthStore();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  
  // Settings states
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [showOnTinder, setShowOnTinder] = useState(true);
  const [smartPhotos, setSmartPhotos] = useState(true);
  const [showOrientation, setShowOrientation] = useState(false);
  
  // Discovery Preferences
  const [ageRange, setAgeRange] = useState({ min: 18, max: 45 });
  const [maxDistance, setMaxDistance] = useState(25);
  const [selectedGenders, setSelectedGenders] = useState<string[]>(['All']);
  const [selectedFrequencies, setSelectedFrequencies] = useState<string[]>(['All']);
  const [selectedIntensities, setSelectedIntensities] = useState<string[]>(['All']);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(['All']);
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
        intensityPreference: selectedIntensities.includes('All')
          ? ['All']
          : selectedIntensities,
        preferredTimePreference: selectedTimes.includes('All')
          ? ['All']
          : selectedTimes,
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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            // Implement account deletion logic here
            Alert.alert('Account Deletion', 'This feature is not yet implemented.');
          }
        }
      ]
    );
  };
  
  const renderSettingItem = (title: string, onPress: () => void, showChevron = true, icon?: React.ReactNode) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
    >
      <View style={styles.settingLeftContent}>
        {icon && <View style={styles.settingIcon}>{icon}</View>}
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      {showChevron && <ChevronRight size={18} color="#6B7280" />}
    </TouchableOpacity>
  );

  const renderToggleSetting = (title: string, value: boolean, onValueChange: (value: boolean) => void, icon?: React.ReactNode) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeftContent}>
        {icon && <View style={styles.settingIcon}>{icon}</View>}
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#D1D5DB', true: '#FE3C72' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  const renderSectionHeader = (title: string) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );
  
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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Account Settings */}
        <View style={styles.section}>
          {renderSectionHeader('Account Settings')}
          
          {renderSettingItem('Edit Profile', () => {
            router.push('/edit-profile');
          }, true, <Smile size={20} color="#6B7280" />)}
          
          {renderSettingItem('Phone Number', () => {
            Alert.alert('Phone Number', 'This feature is not yet implemented.');
          }, true, <Phone size={20} color="#6B7280" />)}
          
          {renderSettingItem('Email', () => {
            Alert.alert('Email', `Your current email is: ${email}`);
          }, true, <ChevronRight size={20} color="#6B7280" />)}
          
          {renderSettingItem('Delete Account', handleDeleteAccount, true, <Trash size={20} color="#EF4444" />)}
          
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <LogOut size={20} color="#FFFFFF" />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
        
        {/* Discovery Preferences */}
        <View style={styles.section}>
          {renderSectionHeader('Discovery Preferences')}
          
          {!showDiscoveryOptions ? (
            <>
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
              
              {renderSettingItem('Workout Intensity', () => {
                setShowDiscoveryOptions(true);
              }, true)}
              
              {renderSettingItem('Preferred Time', () => {
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
              
              {/* Intensity Preferences */}
              <View style={styles.preferencesSection}>
                <Text style={styles.preferencesTitle}>Workout Intensity</Text>
                
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
              <View style={styles.preferencesSection}>
                <Text style={styles.preferencesTitle}>Preferred Time</Text>
                
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
          )}
        </View>
        
        {/* Privacy & Safety */}
        <View style={styles.section}>
          {renderSectionHeader('Privacy & Safety')}
          
          {/* {renderToggleSetting('Show Me on Tinder', showOnTinder, setShowOnTinder, <Shield size={20} color="#6B7280" />)} */}
          
          {renderSettingItem('Control Your Profile', () => {
            Alert.alert('Profile Visibility', 'Adjust visibility settings.');
          }, true)}
          
          {renderSettingItem('Block Contacts', () => {
            Alert.alert('Block Contacts', 'Prevent specific contacts from seeing you.');
          }, true, <Lock size={20} color="#6B7280" />)}
          
          {renderSettingItem('Photo Verification', () => {
            Alert.alert('Photo Verification', 'Verify your profile pictures.');
          }, true)}
          
          {renderSettingItem('Two-Factor Authentication', () => {
            Alert.alert('2FA', 'Add extra security to your account.');
          }, true, <Shield size={20} color="#6B7280" />)}
          
          {renderSettingItem('Report a Safety Issue', () => {
            Alert.alert('Report', 'Report harassment, scams, or inappropriate behavior.');
          }, true)}
        </View>
        
        {/* Swipe Preferences */}
        <View style={styles.section}>
          {renderSectionHeader('Swipe Preferences')}
          
          {renderToggleSetting('Smart Photos', smartPhotos, setSmartPhotos)}
          
          {renderToggleSetting('Show My Sexual Orientation', showOrientation, setShowOrientation, <Smile size={20} color="#6B7280" />)}
          
          {renderSettingItem('Incognito Mode', () => {
            Alert.alert('Incognito Mode', "Only appear to people you've liked (Premium feature).");
          }, true)}
        </View>
        
        {/* Notifications */}
        <View style={styles.section}>
          {renderSectionHeader('Notifications')}
          
          {renderToggleSetting('Push Notifications', pushNotifications, setPushNotifications, <Bell size={20} color="#6B7280" />)}
          
          {renderToggleSetting('Email Notifications', emailNotifications, setEmailNotifications)}
        </View>
        
        {/* App Settings */}
        <View style={styles.section}>
          {renderSectionHeader('App Settings')}
          
          {renderToggleSetting('Location', locationEnabled, setLocationEnabled, <MapPin size={20} color="#6B7280" />)}
        </View>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
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
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  logoutButton: {
    backgroundColor: '#FE3C72',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
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
}); 