import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface InterestTagsProps {
  title: string;
  description?: string;
  selectedInterests: string[];
  allInterests: string[];
  onSelectInterest: (interest: string) => void;
  maxSelections?: number;
}

export default function InterestTags({
  title,
  description,
  selectedInterests,
  allInterests,
  onSelectInterest,
  maxSelections = 5,
}: InterestTagsProps) {
  const handleToggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      // If it's already selected, we can remove it
      onSelectInterest(interest);
    } else if (selectedInterests.length < maxSelections) {
      // If it's not selected and we haven't reached the max, add it
      onSelectInterest(interest);
    } else {
      // Maximum reached, could show an alert or toast here
      // Alert.alert('Maximum Selections', `You can only select up to ${maxSelections} interests`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsScrollContainer}>
        <View style={styles.tagsContainer}>
          {allInterests.map((interest) => (
            <TouchableOpacity
              key={interest}
              style={[
                styles.tag,
                selectedInterests.includes(interest) && styles.selectedTag,
              ]}
              onPress={() => handleToggleInterest(interest)}
            >
              <Text
                style={[
                  styles.tagText,
                  selectedInterests.includes(interest) && styles.selectedTagText,
                ]}
              >
                {interest}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      
      <Text style={styles.helpText}>
        {selectedInterests.length} of {maxSelections} selected
      </Text>
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
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  tagsScrollContainer: {
    paddingVertical: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedTag: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tagText: {
    fontSize: 14,
    color: '#333',
  },
  selectedTagText: {
    color: 'white',
    fontWeight: '500',
  },
  helpText: {
    fontSize: 12,
    color: '#777',
    marginTop: 8,
  },
}); 