import React from 'react';
import { View, StyleSheet, Image, Text, Platform, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Dumbbell, Calendar } from 'lucide-react-native';
import { UserProfile } from '@/types';
import { useRouter } from 'expo-router';

type ProfileCardProps = {
  profile: UserProfile;
  overlay?: 'like' | 'nope' | 'superlike' | null;
};

export default function ProfileCard({ profile, overlay }: ProfileCardProps) {
  const router = useRouter();

  const handleProfilePress = () => {
    // Add logging to debug profile navigation
    console.log(`Navigating to profile: ${profile.id}`);
    router.push(`/user-profile?userId=${profile.id}`);
  };

  // Get appropriate image source with fallback
  const getImageSource = () => {
    if (profile.images && profile.images.length > 0) {
      return { uri: profile.images[0] };
    } else if (profile.photos && profile.photos.length > 0) {
      return { uri: profile.photos[0] };
    } else if (profile.photoURL) {
      return { uri: profile.photoURL };
    }
    return { uri: 'https://via.placeholder.com/400x600' };
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handleProfilePress}
      activeOpacity={0.95}
    >
      <Image 
        source={getImageSource()}
        style={styles.image}
        resizeMode="cover"
      />
      
      {/* Overlay for swipe feedback */}
      {overlay === 'like' && (
        <View style={[styles.overlay, { borderColor: '#22c55e', borderWidth: 4 }]}> 
          <Text style={[styles.overlayText, { color: '#22c55e' }]}>LIKE</Text>
        </View>
      )}
      {overlay === 'nope' && (
        <View style={[styles.overlay, { borderColor: '#ef4444', borderWidth: 4 }]}> 
          <Text style={[styles.overlayText, { color: '#ef4444' }]}>NOPE</Text>
        </View>
      )}
      {overlay === 'superlike' && (
        <View style={[styles.overlay, { borderColor: '#3b82f6', borderWidth: 4 }]}> 
          <Text style={[styles.overlayText, { color: '#3b82f6' }]}>SUPER</Text>
        </View>
      )}
      
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.gradient}
      />
      
      <View style={styles.infoContainer}>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>
            {profile.displayName || profile.name}, {profile.age}
          </Text>
          {profile.verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
        
        {profile.bio && (
          <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>
        )}
        
        <View style={styles.detailsContainer}>
          {profile.location && (
            <View style={styles.detailItem}>
              <MapPin size={16} color="#E5E7EB" />
              <Text style={styles.detailText}>3 miles away</Text>
            </View>
          )}
          
          <View style={styles.detailItem}>
            <Dumbbell size={16} color="#E5E7EB" />
            <Text style={styles.detailText}>
              {profile.workoutFrequency || '5-6 times/week'}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Calendar size={16} color="#E5E7EB" />
            <Text style={styles.detailText}>
              {profile.gymCheckIns || 12} check-ins this week
            </Text>
          </View>
        </View>
        
        <View style={styles.tagsContainer}>
          {profile.interests && profile.interests.slice(0, 4).map((interest, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{interest}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    width: '100%',
    height: '100%',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      default: {
        elevation: 5,
      }
    }),
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  name: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#FFFFFF',
    marginRight: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  verifiedBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#FFFFFF',
  },
  bio: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#E5E7EB',
    marginBottom: 12,
  },
  detailsContainer: {
    marginBottom: 12,
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#E5E7EB',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#FFFFFF',
  },
  overlay: {
    position: 'absolute',
    top: 32,
    left: 32,
    zIndex: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignSelf: 'flex-start',
    transform: [{ rotate: '-10deg' }],
  },
  overlayText: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    letterSpacing: 2,
    fontWeight: 'bold',
  },
});