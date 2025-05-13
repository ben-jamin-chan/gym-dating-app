import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type Gender = 'Male' | 'Female' | 'Other';

interface GenderSelectorProps {
  title: string;
  value: Gender;
  onChange: (value: Gender) => void;
}

export default function GenderSelector({
  title,
  value,
  onChange,
}: GenderSelectorProps) {
  const options: Gender[] = ['Male', 'Female', 'Other'];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.segmentContainer}>
        {options.map((option, index) => {
          const isFirst = index === 0;
          const isLast = index === options.length - 1;
          const isActive = value === option;
          
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.segment,
                isFirst && styles.firstSegment,
                isLast && styles.lastSegment,
                isActive && styles.activeSegment,
              ]}
              onPress={() => onChange(option)}
            >
              <Text
                style={[
                  styles.segmentText,
                  isActive && styles.activeSegmentText,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  firstSegment: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  lastSegment: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  activeSegment: {
    backgroundColor: '#007AFF',
  },
  segmentText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  activeSegmentText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 