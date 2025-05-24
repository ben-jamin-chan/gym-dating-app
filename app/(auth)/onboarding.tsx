import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react-native';
import OnboardingStep from '@/components/auth/OnboardingStep';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/utils/authStore';
import { saveUserProfile } from '@/utils/firebase';
import { createDefaultPreferences } from '@/services/preferencesService';
import { calculateAge } from '@/utils/dateUtils';

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuthStore();

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
    }
  ];

  const handleValueChange = (field: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveUserData = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to complete onboarding');
      return false;
    }

    try {
      setIsSubmitting(true);
      
      // Format interests as an array if provided
      let interests: string[] = [];
      if (formValues.interests) {
        interests = formValues.interests.split(',').map(interest => interest.trim());
      }
      
      // Calculate age from date of birth
      let age: number | null = null;
      if (formValues.dateOfBirth) {
        age = calculateAge(formValues.dateOfBirth);
      }
      
      // Prepare profile data
      const profileData = {
        ...formValues,
        interests,
        // Convert numeric values
        age: age,
        dateOfBirth: formValues.dateOfBirth || null,
        height: formValues.height ? parseInt(formValues.height, 10) : null,
        weight: formValues.weight ? parseInt(formValues.weight, 10) : null,
        // Make sure gym info and workout preferences are properly saved
        workoutFrequency: formValues.workoutFrequency || '',
        intensity: formValues.intensity || '',
        preferred_time: formValues.preferred_time || '',
        gym_name: formValues.gym_name || '',
        // Additional user data
        displayName: user.displayName,
        photoURL: user.photoURL,
        email: user.email,
        gymCheckIns: 0,
      };
      
      // Sequential operations to prevent Firestore concurrency issues
      console.log('Saving user profile...');
      await saveUserProfile(user.uid, profileData);
      
      // Add a small delay between operations to prevent concurrency issues
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Creating default preferences...');
      await createDefaultPreferences(user.uid);
      
      // Add another small delay before navigation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return true;
    } catch (error) {
      console.error('Error saving profile data:', error);
      
      // Check if it's a Firestore internal error and suggest retry
      if (error instanceof Error && error.message.includes('INTERNAL ASSERTION FAILED')) {
        Alert.alert(
          'Connection Issue', 
          'There was a temporary connection issue. Please try again.',
          [
            {
              text: 'Retry',
              onPress: () => {
                // Retry after a delay
                setTimeout(() => {
                  saveUserData();
                }, 1000);
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to save your profile. Please try again.');
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
      // Final step - save data and complete onboarding
      if (!user?.uid) {
        Alert.alert('Error', 'User session expired. Please log in again.');
        router.replace('/(auth)/login');
        return;
      }
      
      const success = await saveUserData();
      if (success) {
        // Add a small delay before navigation to ensure all operations are complete
        setTimeout(() => {
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
    // Skip is only allowed on gym location step (index 3)
    if (currentStep === 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // For other steps, save whatever data was entered and finish onboarding
      const success = await saveUserData();
      if (success) {
        router.replace('/(tabs)');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Your Profile</Text>
        {currentStep === 3 && (
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