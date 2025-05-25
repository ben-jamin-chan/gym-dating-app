import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Custom components
import FormInput from '@/components/profile/FormInput';
import PhotoGallery from '@/components/profile/PhotoGallery';
import InterestTags from '@/components/profile/InterestTags';
import FrequencySelector from '@/components/profile/FrequencySelector';
import GenderSelector from '@/components/profile/GenderSelector';

// Hooks
import useProfile from '@/hooks/useProfile';

// Types
import { UserProfile } from '@/types';

type Gender = 'Male' | 'Female' | 'Other';

export default function EditProfileScreen() {
  // Profile hook
  const { 
    profile, 
    loading, 
    error: profileError, 
    isSaving,
    updateProfile,
    addPhoto,
    removePhoto
  } = useProfile();
  
  // Form state
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<Gender>('Male');
  const [workoutFrequency, setWorkoutFrequency] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal1, setGoal1] = useState('');
  const [goal2, setGoal2] = useState('');
  const [goal3, setGoal3] = useState('');
  const [intensity, setIntensity] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [gymName, setGymName] = useState('');
  const [location, setLocation] = useState('');
  const [formError, setFormError] = useState<Record<string, string>>({});
  
  // Constants
  const frequencyOptions = ['Daily', '3-5x/week', '1-2x/week', 'Occasionally'];
  const intensityOptions = ['Light', 'Moderate', 'Intense', 'Very Intense'];
  const timeOptions = ['Morning', 'Afternoon', 'Evening', 'Late Night', 'Flexible'];
  const fitnessInterestOptions = [
    'CrossFit', 
    'HIIT', 
    'Olympic Lifting', 
    'Hiking', 
    'Bodybuilding', 
    'Powerlifting',
    'Running',
    'Yoga',
    'Cycling',
    'Swimming',
    'Martial Arts',
    'Calisthenics'
  ];
  
  // Load profile data into form
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAge(profile.age ? String(profile.age) : '');
      setBio(profile.bio || '');
      setGender((profile.gender as Gender) || 'Male');
      setWorkoutFrequency(profile.workoutFrequency || '');
      setInterests(profile.interests || []);
      setHeight(profile.height ? String(profile.height) : '');
      setWeight(profile.weight ? String(profile.weight) : '');
      setGoal1(profile.goal1 || '');
      setGoal2(profile.goal2 || '');
      setGoal3(profile.goal3 || '');
      setIntensity(profile.intensity || '');
      setPreferredTime(profile.preferred_time || '');
      setGymName(profile.gym_name || '');
      setLocation(typeof profile.location === 'string' ? profile.location : '');
    }
  }, [profile]);
  
  // Handle interest selection
  const handleInterestToggle = (interest: string) => {
    setInterests(prevInterests => {
      if (prevInterests.includes(interest)) {
        return prevInterests.filter(i => i !== interest);
      } else {
        return [...prevInterests, interest];
      }
    });
  };
  
  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!age.trim()) {
      errors.age = 'Age is required';
    } else if (isNaN(Number(age)) || Number(age) < 18 || Number(age) > 100) {
      errors.age = 'Please enter a valid age between 18 and 100';
    }
    
    if (!bio.trim()) {
      errors.bio = 'Bio is required';
    } else if (bio.length < 10) {
      errors.bio = 'Bio should be at least 10 characters';
    }
    
    if (height && (isNaN(Number(height)) || Number(height) <= 0)) {
      errors.height = 'Please enter a valid height';
    }
    
    if (weight && (isNaN(Number(weight)) || Number(weight) <= 0)) {
      errors.weight = 'Please enter a valid weight';
    }
    
    if (!workoutFrequency) {
      errors.frequency = 'Please select your workout frequency';
    }
    
    if (interests.length === 0) {
      errors.interests = 'Please select at least one interest';
    }
    
    setFormError(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Save profile
  const handleSaveProfile = async () => {
    if (!validateForm()) {
      Alert.alert('Form Error', 'Please correct the errors in the form');
      return;
    }
    
    const profileData: Partial<UserProfile> = {
      name,
      age: Number(age),
      bio,
      gender: gender as string,
      workoutFrequency,
      interests,
      height: height ? Number(height) : undefined,
      weight: weight ? Number(weight) : undefined,
      goal1,
      goal2,
      goal3,
      intensity,
      preferred_time: preferredTime,
      gym_name: gymName,
      location,
    };
    
    const success = await updateProfile(profileData);
    
    if (success) {
      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } else {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }
  
  // Error state
  if (profileError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>Error loading profile</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.errorButton}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity 
          onPress={handleSaveProfile} 
          style={styles.saveButton}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollContainer}>
        {/* Photo Gallery */}
        <PhotoGallery
          photos={profile?.photos || []}
          onAddPhoto={addPhoto}
          onRemovePhoto={removePhoto}
        />
        
        {/* Basic Info Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <FormInput
            label="Display Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCorrect={false}
            error={formError.name}
          />
          
          <FormInput
            label="Age"
            value={age}
            onChangeText={setAge}
            placeholder="Your age"
            keyboardType="numeric"
            maxLength={3}
            error={formError.age}
          />
          
          <GenderSelector
            title="Gender"
            value={gender}
            onChange={setGender}
          />
          
          <FormInput
            label="Height (cm)"
            value={height}
            onChangeText={setHeight}
            placeholder="Your height in cm"
            keyboardType="numeric"
            error={formError.height}
          />
          
          <FormInput
            label="Weight (kg)"
            value={weight}
            onChangeText={setWeight}
            placeholder="Your weight in kg"
            keyboardType="numeric"
            error={formError.weight}
          />
          
          <FormInput
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself..."
            multiline
            numberOfLines={4}
            error={formError.bio}
          />
        </View>
        
        {/* Fitness Goals */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Fitness Goals</Text>
          
          <FormInput
            label="Primary Goal"
            value={goal1}
            onChangeText={setGoal1}
            placeholder="e.g., Lose weight, Build muscle, etc."
          />
          
          <FormInput
            label="Secondary Goal"
            value={goal2}
            onChangeText={setGoal2}
            placeholder="Your second fitness goal"
          />
          
          <FormInput
            label="Additional Goal"
            value={goal3}
            onChangeText={setGoal3}
            placeholder="Another fitness goal"
          />
        </View>
        
        {/* Fitness Info */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Workout Preferences</Text>
          
          <FrequencySelector
            title="Gym Frequency"
            description="How often do you go to the gym?"
            value={workoutFrequency}
            options={frequencyOptions}
            onChange={setWorkoutFrequency}
          />
          
          <FrequencySelector
            title="Workout Intensity"
            description="How intense are your workouts?"
            value={intensity}
            options={intensityOptions}
            onChange={setIntensity}
          />
          
          <FrequencySelector
            title="Preferred Time"
            description="When do you prefer to work out?"
            value={preferredTime}
            options={timeOptions}
            onChange={setPreferredTime}
          />
          
          <InterestTags
            title="Fitness Interests"
            description="Select your fitness interests (up to 5)"
            selectedInterests={interests}
            allInterests={fitnessInterestOptions}
            onSelectInterest={handleInterestToggle}
            maxSelections={5}
          />
        </View>
        
        {/* Gym Information */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Gym Information</Text>
          
          <FormInput
            label="Gym Name"
            value={gymName}
            onChangeText={setGymName}
            placeholder="Where do you usually work out?"
          />
        </View>
        
        {/* Location Information */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <FormInput
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="Enter your location"
          />
        </View>
        
        {/* Footer Space */}
        <View style={styles.footer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollContainer: {
    flex: 1,
  },
  formSection: {
    marginTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#F5F5F5',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  footer: {
    height: 100,
  },
}); 