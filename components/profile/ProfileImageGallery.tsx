import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Text, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useImageGallery } from '@/hooks/useImageGallery';

const DEFAULT_PROFILE_IMAGE = 'https://randomuser.me/api/portraits/lego/1.jpg';
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface ProfileImageGalleryProps {
  photos: string[];
  onBackPress: () => void;
}

export function ProfileImageGallery({ photos, onBackPress }: ProfileImageGalleryProps) {
  const { activeImageIndex, handleNextImage, handlePreviousImage, getSafeImageUrl } = useImageGallery(photos);

  const hasPhotos = photos && photos.length > 0;
  const hasMultiplePhotos = photos && photos.length > 1;

  return (
    <View style={styles.imageContainer}>
      {hasPhotos ? (
        <>
          <Image 
            source={{ uri: getSafeImageUrl(activeImageIndex) }}
            style={styles.profileImage}
            resizeMode="cover"
            defaultSource={require('../../assets/images/icon.png')}
          />
          
          {/* Image indicators */}
          <View style={styles.imageIndicators}>
            {photos.map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.photoIndicator,
                  index === activeImageIndex && styles.activePhotoIndicator
                ]} 
              />
            ))}
          </View>
          
          {/* Navigation arrows for images */}
          {hasMultiplePhotos && (
            <>
              <TouchableOpacity 
                style={[styles.imageNavButton, styles.leftNavButton]} 
                onPress={handlePreviousImage}
              >
                <Ionicons name="chevron-back" size={24} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.imageNavButton, styles.rightNavButton]} 
                onPress={handleNextImage}
              >
                <Ionicons name="chevron-forward" size={24} color="white" />
              </TouchableOpacity>
            </>
          )}
        </>
      ) : (
        <View style={styles.noPhotoContainer}>
          <Image 
            source={{ uri: DEFAULT_PROFILE_IMAGE }}
            style={styles.defaultProfileImage}
            resizeMode="cover"
          />
          <Text style={styles.noPhotoText}>No profile photos</Text>
        </View>
      )}
      
      {/* Overlay gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.overlay}
      />
      
      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
        <Ionicons name="chevron-down" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    height: SCREEN_HEIGHT * 0.55,
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#d1d5db',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageIndicators: {
    position: 'absolute',
    top: 50,
    left: 70,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  photoIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  activePhotoIndicator: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  imageNavButton: {
    position: 'absolute',
    top: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -20 }],
  },
  leftNavButton: {
    left: 10,
  },
  rightNavButton: {
    right: 10,
  },
  noPhotoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  noPhotoText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  defaultProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
  },
}); 