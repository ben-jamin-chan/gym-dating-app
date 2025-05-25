import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Dumbbell as DumbbellIcon } from 'lucide-react-native';
import GenderDropdown from './GenderDropdown';
import FrequencySelector from '@/components/auth/FrequencySelector';
import DateOfBirthPicker from './DateOfBirthPicker';
import PhotoUploader from './PhotoUploader';

type OnboardingStepProps = {
  title: string;
  description: string;
  stepNumber: number;
  fields: string[];
  values: Record<string, string | string[]>;
  onChangeValue: (field: string, value: string | string[]) => void;
};

export default function OnboardingStep({ 
  title, 
  description, 
  stepNumber, 
  fields, 
  values, 
  onChangeValue 
}: OnboardingStepProps) {
  // This is a simplified version - in a real app, you'd have specific form fields
  // for each step, validation, and proper state management
  
  // Define the frequency options for workout
  const frequencyOptions = ['Daily', '3-5x/week', '1-2x/week', 'Occasionally'];
  const intensityOptions = ['Light', 'Moderate', 'Intense', 'Very Intense'];
  const timeOptions = ['Morning', 'Afternoon', 'Evening', 'Late Night', 'Flexible'];
  
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <DumbbellIcon size={32} color="#FF5864" />
      </View>
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      
      <View style={styles.fieldsContainer}>
        {fields.map((field, index) => {
          // Handle photo upload field
          if (field === 'photos') {
            const photos = Array.isArray(values[field]) ? values[field] as string[] : [];
            return (
              <PhotoUploader
                key={index}
                photos={photos}
                onPhotosChange={(newPhotos) => onChangeValue(field, newPhotos)}
                maxPhotos={6}
                minPhotos={1}
              />
            );
          }
          
          // Use DateOfBirthPicker for date of birth field
          if (field === 'dateOfBirth') {
            return (
              <DateOfBirthPicker
                key={index}
                label="Date of Birth"
                value={typeof values[field] === 'string' ? values[field] as string : ''}
                onChange={(date) => onChangeValue(field, date)}
              />
            );
          }
          
          // Use the Gender dropdown component for gender field
          if (field === 'gender') {
            return (
              <GenderDropdown
                key={index}
                label={formatFieldLabel(field)}
                value={typeof values[field] === 'string' ? values[field] as string : ''}
                onChange={(text) => onChangeValue(field, text)}
              />
            );
          }
          
          // Use FrequencySelector for specific fields
          if (field === 'workoutFrequency') {
            return (
              <FrequencySelector
                key={index}
                title={formatFieldLabel(field)}
                options={frequencyOptions}
                value={typeof values[field] === 'string' ? values[field] as string : ''}
                onChange={(value) => onChangeValue(field, value)}
              />
            );
          }
          
          if (field === 'intensity') {
            return (
              <FrequencySelector
                key={index}
                title={formatFieldLabel(field)}
                options={intensityOptions}
                value={typeof values[field] === 'string' ? values[field] as string : ''}
                onChange={(value) => onChangeValue(field, value)}
              />
            );
          }
          
          if (field === 'preferred_time') {
            return (
              <FrequencySelector
                key={index}
                title={formatFieldLabel(field)}
                options={timeOptions}
                value={typeof values[field] === 'string' ? values[field] as string : ''}
                onChange={(value) => onChangeValue(field, value)}
              />
            );
          }
          
          // Special handling for height field with cm unit
          if (field === 'height') {
            return (
              <View key={index} style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Enter your height in centimeters"
                  placeholderTextColor="#9CA3AF"
                  value={typeof values[field] === 'string' ? values[field] as string : ''}
                  onChangeText={(text) => onChangeValue(field, text)}
                  keyboardType="numeric"
                  returnKeyType={index === fields.length - 1 ? 'done' : 'next'}
                  blurOnSubmit={false}
                />
                <Text style={styles.fieldHint}>e.g., 175 for 175 cm</Text>
              </View>
            );
          }
          
          // Special handling for weight field with kg unit
          if (field === 'weight') {
            return (
              <View key={index} style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Enter your weight in kilograms"
                  placeholderTextColor="#9CA3AF"
                  value={typeof values[field] === 'string' ? values[field] as string : ''}
                  onChangeText={(text) => onChangeValue(field, text)}
                  keyboardType="numeric"
                  returnKeyType={index === fields.length - 1 ? 'done' : 'next'}
                  blurOnSubmit={false}
                />
                <Text style={styles.fieldHint}>e.g., 70 for 70 kg</Text>
              </View>
            );
          }
          
          // Special handling for location field to match the gym_name format
          if (field === 'location') {
            return (
              <View key={index} style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Location</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Enter your gym's location"
                  placeholderTextColor="#9CA3AF"
                  value={typeof values[field] === 'string' ? values[field] as string : ''}
                  onChangeText={(text) => onChangeValue(field, text)}
                  autoCapitalize="words"
                  autoCorrect={true}
                  returnKeyType={index === fields.length - 1 ? 'done' : 'next'}
                  blurOnSubmit={false}
                />
                <Text style={styles.fieldHint}>City, neighborhood, or address</Text>
              </View>
            );
          }
          
          // Use regular TextInput for other fields
          return (
            <View key={index} style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>{formatFieldLabel(field)}</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder={`Enter your ${formatFieldLabel(field).toLowerCase()}`}
                placeholderTextColor="#9CA3AF"
                value={typeof values[field] === 'string' ? values[field] as string : ''}
                onChangeText={(text) => onChangeValue(field, text)}
                autoCapitalize={field === 'bio' || field === 'interests' || field === 'gym_name' ? 'sentences' : 'none'}
                autoCorrect={field === 'bio' || field === 'interests' || field === 'gym_name'}
                returnKeyType={index === fields.length - 1 ? 'done' : 'next'}
                blurOnSubmit={false}
                multiline={field === 'bio' || field === 'interests'}
                numberOfLines={field === 'bio' ? 4 : field === 'interests' ? 2 : 1}
                textAlignVertical={field === 'bio' || field === 'interests' ? 'top' : 'center'}
                keyboardType={
                  field === 'age' || field === 'height' || field === 'weight' 
                    ? 'numeric' 
                    : 'default'
                }
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Helper function to format field labels
function formatFieldLabel(field: string): string {
  return field
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  fieldsContainer: {
    gap: 16,
  },
  fieldContainer: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#374151',
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
    minHeight: 48,
  },
  fieldHint: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
});