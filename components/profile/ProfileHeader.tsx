import React from 'react';
import { View, StyleSheet, Image, Text, TouchableOpacity, ScrollView } from 'react-native';
import { UserProfile } from '@/types';
import { CreditCard as Edit2, CircleCheck as CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { calculateAge } from '@/utils/dateUtils';

type ProfileHeaderProps = {
  user: UserProfile;
};

export default function ProfileHeader({ user }: ProfileHeaderProps) {
  const router = useRouter();
  
  const handleEditProfile = () => {
    router.push('/edit-profile');
  };
  
  // Calculate age from date of birth if available, otherwise use stored age
  const displayAge = user.dateOfBirth ? calculateAge(user.dateOfBirth) : user.age;
  
  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <Image 
          source={{ uri: user.photos?.[0] || 'https://via.placeholder.com/150' }}
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
          {displayAge}{user.gender ? `, ${user.gender}` : ''}
        </Text>
        
        <Text style={styles.bio}>{user.bio}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.workoutFrequency}</Text>
            <Text style={styles.statLabel}>Workout</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.gymCheckIns}</Text>
            <Text style={styles.statLabel}>Check-ins</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.interests.length}</Text>
            <Text style={styles.statLabel}>Interests</Text>
          </View>
        </View>
        
        {/* User interests tags */}
        {user.interests && user.interests.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.interestsContainer}
          >
            {user.interests.map((interest, index) => (
              <View key={`interest-${index}`} style={styles.interestTag}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3B82F6',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoContainer: {
    alignItems: 'center',
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: '#111827',
    marginRight: 8,
  },
  ageGender: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 8,
  },
  bio: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#111827',
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  interestsContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  interestTag: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  interestText: {
    color: '#3B82F6',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});