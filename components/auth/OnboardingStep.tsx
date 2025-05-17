import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Dumbbell as DumbbellIcon } from 'lucide-react-native';
import GenderDropdown from './GenderDropdown';
import FrequencySelector from '@/components/auth/FrequencySelector';

type OnboardingStepProps = {
  title: string;
  description: string;
  stepNumber: number;
  fields: string[];
  values: Record<string, string>;
  onChangeValue: (field: string, value: string) => void;
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
          // Use the Gender dropdown component for gender field
          if (field === 'gender') {
            return (
              <GenderDropdown
                key={index}
                label={formatFieldLabel(field)}
                value={values[field] || ''}
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
                value={values[field] || ''}
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
                value={values[field] || ''}
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
                value={values[field] || ''}
                onChange={(value) => onChangeValue(field, value)}
              />
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
                  value={values[field] || ''}
                  onChangeText={(text) => onChangeValue(field, text)}
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
                value={values[field] || ''}
                onChangeText={(text) => onChangeValue(field, text)}
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
  },
  fieldHint: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
});