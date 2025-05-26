import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';

interface ProfileDetailsProps {
  profile: {
    bio?: string;
    goal1?: string;
    goal2?: string;
    goal3?: string;
    interests?: string[];
    gymCheckIns?: number;
    workoutFrequency?: string;
    intensity?: string;
    height?: string;
    weight?: string;
    gym_name?: string;
    location?: string;
    preferred_time?: string;
    video?: string;
    introVideo?: string;
  };
}

export function ProfileDetails({ profile }: ProfileDetailsProps) {
  const video = useRef<Video>(null);

  const InfoItem = ({ icon, text }: { icon: string; text: string }) => (
    <View style={styles.infoItem}>
      <Ionicons name={icon as any} size={18} color="#9CA3AF" />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );

  const SectionTitle = ({ title }: { title: string }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  const hasGoals = profile.goal1 || profile.goal2 || profile.goal3;
  const hasInterests = profile.interests && profile.interests.length > 0;
  const hasBodyStats = profile.height || profile.weight;
  const hasGymInfo = profile.gym_name || profile.preferred_time || profile.location;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Bio section */}
      {profile.bio && (
        <View style={styles.bioSection}>
          <SectionTitle title="About" />
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>
      )}

      {/* Fitness Goals section */}
      {hasGoals && (
        <View style={styles.goalsSection}>
          <SectionTitle title="Fitness Goals" />
          <View style={styles.goalsList}>
            {profile.goal1 && (
              <View style={styles.goalItem}>
                <Ionicons name="trophy-outline" size={18} color="#9CA3AF" />
                <Text style={styles.goalText}>{profile.goal1}</Text>
              </View>
            )}
            {profile.goal2 && (
              <View style={styles.goalItem}>
                <Ionicons name="trophy-outline" size={18} color="#9CA3AF" />
                <Text style={styles.goalText}>{profile.goal2}</Text>
              </View>
            )}
            {profile.goal3 && (
              <View style={styles.goalItem}>
                <Ionicons name="trophy-outline" size={18} color="#9CA3AF" />
                <Text style={styles.goalText}>{profile.goal3}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Interests section */}
      {hasInterests && (
        <View style={styles.interestsSection}>
          <SectionTitle title="Interests" />
          <View style={styles.interestTags}>
            {profile.interests!.map((interest: string, index: number) => (
              <View key={index} style={styles.interestTag}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Workout stats */}
      <View style={styles.statsSection}>
        <SectionTitle title="Workout Stats" />
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.gymCheckIns || 0}</Text>
            <Text style={styles.statLabel}>Gym Check-ins</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.workoutFrequency || 'N/A'}</Text>
            <Text style={styles.statLabel}>Frequency</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.intensity || 'N/A'}</Text>
            <Text style={styles.statLabel}>Intensity</Text>
          </View>
        </View>
      </View>

      {/* Body Stats */}
      {hasBodyStats && (
        <View style={styles.bodyStatsSection}>
          <SectionTitle title="Body Stats" />
          <View style={styles.statsContainer}>
            {profile.height && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.height}</Text>
                <Text style={styles.statLabel}>Height (cm)</Text>
              </View>
            )}
            {profile.weight && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.weight}</Text>
                <Text style={styles.statLabel}>Weight (kg)</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Gym Information */}
      {hasGymInfo && (
        <View style={styles.gymSection}>
          <SectionTitle title="Gym Information" />
          {profile.gym_name && (
            <InfoItem icon="fitness-outline" text={profile.gym_name} />
          )}
          {profile.location && (
            <InfoItem icon="location-outline" text={profile.location} />
          )}
          {profile.preferred_time && (
            <InfoItem icon="time-outline" text={`Preferred time: ${profile.preferred_time}`} />
          )}
        </View>
      )}

      {/* Video if available */}
      {profile.video && (
        <View style={styles.videoSection}>
          <SectionTitle title="Workout Video" />
          <Video
            ref={video}
            style={styles.video}
            source={{
              uri: profile.introVideo || profile.video,
            }}
            useNativeControls
            resizeMode={ResizeMode.COVER}
          />
        </View>
      )}

      {/* Spacer to ensure content is scrollable past the action buttons */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  bioSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  goalsSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  goalsList: {
    paddingHorizontal: 16,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  goalText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#374151',
  },
  interestsSection: {
    marginBottom: 20,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  interestText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  statsSection: {
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  bodyStatsSection: {
    marginBottom: 24,
  },
  gymSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
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
  videoSection: {
    marginBottom: 20,
  },
  video: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
}); 