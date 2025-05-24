import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { getMinDateOfBirth, getMaxDateOfBirth, formatDateForPicker } from '@/utils/dateUtils';

type DateOfBirthPickerProps = {
  label: string;
  value: string;
  onChange: (date: string) => void;
};

export default function DateOfBirthPicker({ label, value, onChange }: DateOfBirthPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (value) {
      return new Date(value);
    }
    // Default to 25 years ago
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() - 25);
    return defaultDate;
  });

  const minDate = getMaxDateOfBirth(); // 100 years ago
  const maxDate = getMinDateOfBirth(); // 18 years ago

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (date) {
      setSelectedDate(date);
      onChange(formatDateForPicker(date));
    }
  };

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowPicker(true)}
      >
        <Calendar size={20} color="#6B7280" />
        <Text style={styles.dateText}>
          {value ? formatDisplayDate(selectedDate) : 'Select your date of birth'}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.hint}>
        You must be 18 years or older to use this app
      </Text>

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={minDate}
          maximumDate={maxDate}
          style={Platform.OS === 'ios' ? styles.iosPicker : undefined}
        />
      )}
      
      {showPicker && Platform.OS === 'ios' && (
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => setShowPicker(false)}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#374151',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  dateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  hint: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#9CA3AF',
  },
  iosPicker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: 8,
  },
  doneButton: {
    backgroundColor: '#FF5864',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  doneButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
}); 