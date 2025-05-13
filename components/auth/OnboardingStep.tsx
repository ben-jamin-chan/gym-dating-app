import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Dumbbell as DumbbellIcon } from 'lucide-react-native';
import GenderDropdown from './GenderDropdown';

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
  
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <DumbbellIcon size={32} color="#3B82F6" />
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
    backgroundColor: '#EBF5FF',
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
});