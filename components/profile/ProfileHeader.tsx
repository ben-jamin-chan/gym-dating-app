import React from 'react';
<<<<<<< Updated upstream
import { View, StyleSheet, Image, Text, TouchableOpacity, ScrollView } from 'react-native';
import { UserProfile } from '@/types';
import { CreditCard as Edit2, CircleCheck as CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
=======
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calculateAge } from '@/utils/dateUtils';
>>>>>>> Stashed changes

interface ProfileHeaderProps {
  name: string;
  displayName?: string;
  age?: string | number;
  dateOfBirth?: string;
  verified?: boolean;
  workoutFrequency?: string;
  distance?: number;
}

export function ProfileHeader({
  name,
  displayName,
  age,
  dateOfBirth,
  verified,
  workoutFrequency,
  distance
}: ProfileHeaderProps) {
  const getDisplayAge = () => {
    if (dateOfBirth) {
      return calculateAge(dateOfBirth);
    }
    return age || 'N/A';
  };
  
  return (
<<<<<<< Updated upstream
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <Image 
          source={{ uri: user.photos[0] }}
          style={styles.avatar}
        />
        <TouchableOpacity 
          style={styles.editButton}
          onPress={handleEditProfile}
        >
          <Edit2 size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{user.name}</Text>
          {user.verified && (
            <CheckCircle size={20} color="#3B82F6" />
          )}
        </View>
        
        <Text style={styles.ageGender}>
          {user.age}{user.gender ? `, ${user.gender}` : ''}
        </Text>
        
        <Text style={styles.bio}>{user.bio}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.workoutFrequency}</Text>
            <Text style={styles.statLabel}>Workout</Text>
=======
    <>
      {/* Header Info */}
      <View style={styles.headerInfo}>
        <View style={styles.nameAgeContainer}>
          <Text style={styles.name}>{name || displayName}</Text>
          <Text style={styles.age}>{getDisplayAge()}</Text>
        </View>
        {verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="white" />
            <Text style={styles.verifiedText}>Verified</Text>
>>>>>>> Stashed changes
          </View>
        )}
      </View>
      
      {/* Location and activity */}
      <View style={styles.locationContainer}>
        <View style={styles.infoItem}>
          <Ionicons name="barbell-outline" size={18} color="#9CA3AF" />
          <Text style={styles.infoText}>{workoutFrequency || 'Not specified'}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={18} color="#9CA3AF" />
          <Text style={styles.infoText}>
            {distance ? `${distance} miles away` : 'Location not available'}
        </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nameAgeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 8,
  },
  age: {
    fontSize: 22,
    color: '#4B5563',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
});