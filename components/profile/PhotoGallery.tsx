import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';

interface PhotoGalleryProps {
  photos: string[];
  onAddPhoto: () => Promise<boolean>;
  onRemovePhoto: (url: string) => Promise<boolean>;
  maxPhotos?: number;
}

export default function PhotoGallery({ 
  photos, 
  onAddPhoto, 
  onRemovePhoto, 
  maxPhotos = 6 
}: PhotoGalleryProps) {
  const emptySlots = Math.max(0, maxPhotos - photos.length);
  
  const handleAddPhoto = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Maximum Photos', `You can only have ${maxPhotos} photos in your profile`);
      return;
    }
    
    await onAddPhoto();
  };
  
  const handleRemovePhoto = async (url: string) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => onRemovePhoto(url)
        }
      ]
    );
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Photos</Text>
      <Text style={styles.subtitle}>Add up to {maxPhotos} photos to your profile</Text>
      
      <View style={styles.gallery}>
        {/* Existing photos */}
        {photos.map((photo, index) => (
          <View key={`photo-${index}`} style={styles.photoContainer}>
            <Image source={{ uri: photo }} style={styles.photo} />
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => handleRemovePhoto(photo)}
            >
              <Ionicons name="close-circle" size={24} color="#FF3B30" />
            </TouchableOpacity>
            {index === 0 && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryText}>Primary</Text>
              </View>
            )}
          </View>
        ))}
        
        {/* Empty slots */}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <TouchableOpacity 
            key={`empty-${index}`}
            style={[styles.photoContainer, styles.emptySlot]}
            onPress={handleAddPhoto}
          >
            <Ionicons name="add" size={40} color="#007AFF" />
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={styles.tipText}>
        Tip: Your first photo will be shown as your primary photo in matches
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoContainer: {
    width: '31%',
    aspectRatio: 3/4,
    marginBottom: 10,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  emptySlot: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  removeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    zIndex: 10,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 4,
  },
  primaryText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  tipText: {
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
}); 