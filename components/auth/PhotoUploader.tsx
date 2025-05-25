import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { Camera, Plus, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/utils/firebase';
import { useAuthStore } from '@/utils/authStore';

type PhotoUploaderProps = {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  minPhotos?: number;
};

export default function PhotoUploader({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 6,
  minPhotos = 1 
}: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const { user, pendingRegistration } = useAuthStore();

  const pickAndUploadPhoto = async (): Promise<string | null> => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your photos');
        return null;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4], // Portrait aspect ratio like Tinder
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploading(true);
        const uri = result.assets[0].uri;
        
        // For now, during onboarding, we'll store the local URI and upload later when user is created
        // This avoids the authentication issue during onboarding
        if (!user?.uid) {
          setUploading(false);
          return uri; // Return local URI for now, will be uploaded when profile is saved
        }
        
        // Create a unique filename
        const filename = `${user.uid}_${Date.now()}.jpg`;
        const storageRef = ref(storage, `profilePhotos/${user.uid}/${filename}`);
        
        // Fetch the image and convert to blob
        const response = await fetch(uri);
        const blob = await response.blob();
        
        // Upload and get URL
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        
        setUploading(false);
        return downloadURL;
      }
      
      setUploading(false);
      return null;
    } catch (error: any) {
      setUploading(false);
      console.error('Photo upload error:', error);
      
      // More user-friendly error messages
      let errorMessage = 'Failed to upload photo. Please try again.';
      if (error.code === 'storage/unauthorized') {
        errorMessage = 'Please complete registration first before uploading photos.';
      } else if (error.code === 'storage/quota-exceeded') {
        errorMessage = 'Storage quota exceeded. Please try a smaller image.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      Alert.alert('Upload Failed', errorMessage);
      return null;
    }
  };

  const handleAddPhoto = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Maximum photos reached', `You can only upload up to ${maxPhotos} photos`);
      return;
    }

    const photoUrl = await pickAndUploadPhoto();
    if (photoUrl) {
      onPhotosChange([...photos, photoUrl]);
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    const updatedPhotos = photos.filter((_, index) => index !== indexToRemove);
    onPhotosChange(updatedPhotos);
  };

  const emptySlots = maxPhotos - photos.length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Your Photos</Text>
      <Text style={styles.subtitle}>
        Add at least {minPhotos} photo to help others get to know you better
      </Text>
      
      <View style={styles.photosGrid}>
        {/* Existing photos */}
        {photos.map((photo, index) => (
          <View key={`photo-${index}`} style={styles.photoContainer}>
            <Image source={{ uri: photo }} style={styles.photo} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemovePhoto(index)}
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
            {index === 0 && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryText}>Main</Text>
              </View>
            )}
          </View>
        ))}
        
        {/* Add photo slots */}
        {emptySlots > 0 && (
          <TouchableOpacity
            style={[styles.photoContainer, styles.addPhotoSlot]}
            onPress={handleAddPhoto}
            disabled={uploading}
          >
            {uploading ? (
              <Text style={styles.uploadingText}>Uploading...</Text>
            ) : (
              <>
                <Camera size={32} color="#FF5864" />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        
        {/* Additional empty slots for visual balance */}
        {Array.from({ length: Math.max(0, emptySlots - 1) }).map((_, index) => (
          <View key={`empty-${index}`} style={[styles.photoContainer, styles.emptySlot]} />
        ))}
      </View>
      
      <View style={styles.tips}>
        <Text style={styles.tipText}>💡 Tips for great photos:</Text>
        <Text style={styles.tipItem}>• Use recent, clear photos of yourself</Text>
        <Text style={styles.tipItem}>• Include variety: gym selfies, outdoor activities, etc.</Text>
        <Text style={styles.tipItem}>• Your first photo will be your main profile picture</Text>
        <Text style={styles.tipItem}>• Avoid group photos or photos with sunglasses</Text>
      </View>
      
      {photos.length < minPhotos && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            You need {minPhotos - photos.length} more photo{minPhotos - photos.length > 1 ? 's' : ''} to continue
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  photoContainer: {
    width: '48%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    marginBottom: 12,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  addPhotoSlot: {
    backgroundColor: '#FAFAFA',
    borderWidth: 2,
    borderColor: '#FF5864',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlot: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addPhotoText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#FF5864',
    marginTop: 8,
  },
  uploadingText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#FF5864',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  primaryText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  tips: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  tipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 8,
  },
  tipItem: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#1E40AF',
    marginBottom: 4,
  },
  warningContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  warningText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
}); 