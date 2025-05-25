import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react-native';
import OnboardingStep from '@/components/auth/OnboardingStep';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/utils/authStore';
import { saveUserProfile, storage, ref, uploadBytes, getDownloadURL } from '@/utils/firebase';
import { createDefaultPreferences } from '@/services/preferencesService';
import { calculateAge } from '@/utils/dateUtils';
import { refreshFirestoreConnection, emergencyFirestoreReset, handleFirestoreError } from '@/utils/firebase/config';

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, string | string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const { user, pendingRegistration, completePendingRegistration, clearPendingRegistration } = useAuthStore();

  // Check if user should be on this screen
  React.useEffect(() => {
    // If there's no pending registration and no user, redirect to signup
    if (!pendingRegistration && !user) {
      console.log('No pending registration or user found, redirecting to signup');
      router.replace('/(auth)/signup');
    }
  }, [pendingRegistration, user, router]);

  const steps = [
    {
      title: 'Basic Information',
      description: 'Tell us a bit about yourself',
      fields: ['dateOfBirth', 'height', 'weight', 'gender']
    },
    {
      title: 'Fitness Goals',
      description: 'What are you looking to achieve?',
      fields: ['goal1', 'goal2', 'goal3']
    },
    {
      title: 'Workout Preferences',
      description: 'Tell us about your exercise habits',
      fields: ['workoutFrequency', 'intensity', 'preferred_time']
    },
    {
      title: 'Gym Information',
      description: 'Where do you usually work out?',
      fields: ['gym_name', 'location']
    },
    {
      title: 'Bio',
      description: 'Tell others about yourself',
      fields: ['bio', 'interests']
    },
    {
      title: 'Add Photos',
      description: 'Show your best self',
      fields: ['photos']
    }
  ];

  const handleValueChange = (field: string, value: string | string[]) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveUserData = async () => {
    // Check if we have a pending registration to complete first
    if (pendingRegistration && !user) {
      try {
        console.log('Completing pending registration...');
        const newUser = await completePendingRegistration();
        console.log('Registration completed for user:', newUser.uid);
        
        // Continue with saving profile data for the newly created user
        return await saveProfileData(newUser.uid);
      } catch (error) {
        console.error('Error completing registration:', error);
        Alert.alert('Error', 'Failed to create your account. Please try again.');
        return false;
      }
    } else if (user?.uid) {
      // User is already registered, just save profile data
      return await saveProfileData(user.uid);
    } else {
      Alert.alert('Error', 'Unable to save profile. Please try logging in again.');
      router.replace('/(auth)/login');
      return false;
    }
  };

  const saveProfileData = async (userId: string): Promise<boolean> => {
    const maxRetryAttempts = 3;
    
    try {
      setIsSubmitting(true);
      setLastError(null);
      
      console.log(`🚀 Starting profile save process for ${userId}...`);
      
      // Format interests as an array if provided
      let interests: string[] = [];
      if (formValues.interests && typeof formValues.interests === 'string') {
        interests = formValues.interests.split(',').map(interest => interest.trim());
      }
      
      // Handle photos array and upload local URIs to Firebase Storage
      const localPhotos = Array.isArray(formValues.photos) ? formValues.photos : [];
      let uploadedPhotos: string[] = [];
      
      // Upload local photo URIs to Firebase Storage
      if (localPhotos.length > 0) {
        console.log('📤 Uploading photos to Firebase Storage...');
        for (let i = 0; i < localPhotos.length; i++) {
          const photoUri = localPhotos[i];
          
          // If it's already a Firebase URL, keep it as is
          if (photoUri.startsWith('https://firebasestorage.googleapis.com')) {
            uploadedPhotos.push(photoUri);
            continue;
          }
          
          try {
            // Upload local URI to Firebase Storage
            const filename = `${userId}_${Date.now()}_${i}.jpg`;
            const storageRef = ref(storage, `profilePhotos/${userId}/${filename}`);
            
            // Fetch the image and convert to blob
            const response = await fetch(photoUri);
            const blob = await response.blob();
            
            // Upload and get URL
            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);
            uploadedPhotos.push(downloadURL);
            
            console.log(`✅ Photo ${i + 1} uploaded successfully`);
          } catch (error) {
            console.error(`❌ Failed to upload photo ${i + 1}:`, error);
            // Continue with other photos even if one fails
          }
        }
      }
      
      const photos = uploadedPhotos;
      
      // Calculate age from date of birth
      let age: number | null = null;
      if (formValues.dateOfBirth && typeof formValues.dateOfBirth === 'string') {
        age = calculateAge(formValues.dateOfBirth);
      }
      
      // Prepare profile data
      const profileData = {
        ...formValues,
        interests,
        photos, // Add photos array
        // Convert numeric values
        age: age,
        dateOfBirth: (typeof formValues.dateOfBirth === 'string' ? formValues.dateOfBirth : null) || null,
        height: formValues.height && typeof formValues.height === 'string' ? parseInt(formValues.height, 10) : null,
        weight: formValues.weight && typeof formValues.weight === 'string' ? parseInt(formValues.weight, 10) : null,
        // Make sure gym info and workout preferences are properly saved
        workoutFrequency: (typeof formValues.workoutFrequency === 'string' ? formValues.workoutFrequency : '') || '',
        intensity: (typeof formValues.intensity === 'string' ? formValues.intensity : '') || '',
        preferred_time: (typeof formValues.preferred_time === 'string' ? formValues.preferred_time : '') || '',
        gym_name: (typeof formValues.gym_name === 'string' ? formValues.gym_name : '') || '',
        bio: (typeof formValues.bio === 'string' ? formValues.bio : '') || '',
        // Additional user data
        displayName: pendingRegistration?.name || user?.displayName,
        photoURL: photos.length > 0 ? photos[0] : user?.photoURL, // Use first photo as main profile photo
        email: pendingRegistration?.email || user?.email,
        gymCheckIns: 0,
      };
      
      // Sequential operations to prevent Firestore concurrency issues
      console.log('💾 Step 1: Saving user profile...');
      await saveUserProfile(userId, profileData);
      
      // Add a delay between operations to prevent concurrency issues
      console.log('⏳ Waiting between operations to prevent concurrency issues...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('⚙️ Step 2: Creating default preferences...');
      await createDefaultPreferences(userId);
      
      // Add another delay before navigation
      console.log('⏳ Final wait before completing onboarding...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('✅ Profile setup completed successfully!');
      return true;
    } catch (error: any) {
      console.error('❌ Error saving profile data:', error);
      
      // Handle the error using our enhanced error handler
      await handleFirestoreError(error, 'onboarding_saveProfileData');
      
      // Check if it's a Firestore internal error
      const isFirestoreInternalError = error?.message?.includes('INTERNAL ASSERTION FAILED') || 
                                     error?.message?.includes('Unexpected state') ||
                                     error?.code === 'unavailable' ||
                                     error?.message?.includes('Target ID already exists');
      
      if (isFirestoreInternalError && retryAttempts < maxRetryAttempts) {
        const nextAttempt = retryAttempts + 1;
        setRetryAttempts(nextAttempt);
        setLastError(`Connection issue detected (attempt ${nextAttempt}/${maxRetryAttempts})`);
        
        console.log(`🔄 Attempting automatic retry ${nextAttempt}/${maxRetryAttempts}...`);
        
        // Show user that we're retrying
        Alert.alert(
          'Connection Issue', 
          `We encountered a temporary connection issue. Automatically retrying (${nextAttempt}/${maxRetryAttempts})...`,
          [{ text: 'OK' }]
        );
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try refreshing the connection
        try {
          console.log('🔧 Refreshing Firestore connection before retry...');
          await refreshFirestoreConnection();
        } catch (refreshError) {
          console.warn('⚠️ Connection refresh failed, continuing with retry anyway:', refreshError);
        }
        
        // Recursive retry
        return await saveProfileData(userId);
      } else if (isFirestoreInternalError) {
        // Max retries exceeded, offer manual retry options
        setLastError('Multiple connection issues detected');
        
        return new Promise((resolve) => {
          Alert.alert(
            'Connection Issues', 
            'We\'re experiencing connection issues. This is temporary and your data is safe.',
            [
              {
                text: 'Try Again',
                onPress: async () => {
                  try {
                    console.log('🔧 User requested manual retry, refreshing connection...');
                    await refreshFirestoreConnection();
                    setRetryAttempts(0); // Reset retry counter
                    const result = await saveProfileData(userId);
                    resolve(result);
                  } catch (retryError) {
                    console.error('Manual retry failed:', retryError);
                    resolve(false);
                  }
                }
              },
              {
                text: 'Emergency Reset',
                onPress: async () => {
                  try {
                    console.log('🚨 User requested emergency reset...');
                    await emergencyFirestoreReset();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    setRetryAttempts(0); // Reset retry counter
                    const result = await saveProfileData(userId);
                    resolve(result);
                  } catch (resetError) {
                    console.error('Emergency reset failed:', resetError);
                    resolve(false);
                  }
                }
              },
              {
                text: 'Skip for Now',
                style: 'cancel',
                onPress: () => {
                  console.log('User chose to skip profile setup');
                  // Allow them to continue to the app
                  resolve(true);
                }
              }
            ]
          );
        });
      } else {
        // Other types of errors
        setLastError(error.message || 'Unknown error occurred');
        Alert.alert(
          'Error', 
          'Failed to save your profile. Please check your internet connection and try again.',
          [
            {
              text: 'Retry',
              onPress: async () => {
                setRetryAttempts(0);
                const result = await saveProfileData(userId);
                return result;
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      }
      
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step (photos step) - validate photos before completing onboarding
      const photos = Array.isArray(formValues.photos) ? formValues.photos : [];
      if (photos.length < 1) {
        Alert.alert(
          'Photo Required',
          'Please add at least 1 photo to continue. Great photos help you connect with other fitness enthusiasts!',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Save data and complete onboarding
      const success = await saveUserData();
      if (success) {
        // Clear any pending registration data
        clearPendingRegistration();
        
        // Add a small delay before navigation to ensure all operations are complete
        setTimeout(() => {
          console.log('🎉 Onboarding completed, navigating to main app...');
          router.replace('/(tabs)');
        }, 500);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    // Skip is allowed on gym location step (index 3) and bio step (index 4)
    if (currentStep === 3 || currentStep === 4) {
      setCurrentStep(currentStep + 1);
    } else {
      // For other steps, save whatever data was entered and finish onboarding
      const success = await saveUserData();
      if (success) {
        // Clear any pending registration data
        clearPendingRegistration();
        router.replace('/(tabs)');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Your Profile</Text>
        {(currentStep === 3 || currentStep === 4) && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          {steps.map((_, index) => (
            <View key={index} style={styles.progressStepWrapper}>
              <View 
                style={[
                  styles.progressStep,
                  index <= currentStep ? styles.progressStepActive : {}
                ]} 
              />
            </View>
          ))}
        </View>
        <Text style={styles.progressText}>
          Step {currentStep + 1} of {steps.length}
        </Text>
      </View>
      
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.contentScroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
        >
          <OnboardingStep
            title={steps[currentStep].title}
            description={steps[currentStep].description}
            stepNumber={currentStep + 1}
            fields={steps[currentStep].fields}
            values={formValues}
            onChangeValue={handleValueChange}
          />
          
          {/* Add extra padding at bottom to ensure fields are above keyboard */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
        
        <View style={styles.footer}>
          {currentStep > 0 && (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              disabled={isSubmitting}
            >
              <ChevronLeft size={24} color="#FF5864" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.nextButton, isSubmitting && styles.disabledButton]}
            onPress={handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
                </Text>
                <ChevronRight size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    color: '#111827',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#FF5864',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  progressBar: {
    flexDirection: 'row',
    height: 4,
    marginBottom: 12,
  },
  progressStepWrapper: {
    flex: 1,
    paddingHorizontal: 2,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: '#FF5864',
  },
  progressText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  keyboardContainer: {
    flex: 1,
  },
  contentScroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    flexGrow: 1,
  },
  bottomSpacer: {
    height: 80, // Increased height to ensure enough space above footer
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#FF5864',
    marginLeft: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5864',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  nextButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 4,
  },
  disabledButton: {
    opacity: 0.7,
  }
});