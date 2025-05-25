import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { getAuth } from 'firebase/auth';
import { UserProfile } from '@/types';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getUserProfile, saveUserProfile } from '@/utils/firebase';

type ProfileUpdateData = Partial<Omit<UserProfile, 'id'>>;

export default function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const storage = getStorage();
  
  // Fetch profile on mount
  useEffect(() => {
    async function fetchProfile() {
      if (!currentUser) {
        setError('No authenticated user found');
        setLoading(false);
        return;
      }
      
      try {
        const userProfile = await getUserProfile(currentUser.uid);
        if (userProfile) {
          setProfile(userProfile);
        } else {
          // Create a default profile if none exists
          const defaultProfile: UserProfile = {
            id: currentUser.uid,
            name: currentUser.displayName || '',
            age: 0,
            bio: '',
            photos: [],
            verified: false,
            distance: 0,
            workoutFrequency: '',
            gymCheckIns: 0,
            interests: [],
          };
          setProfile(defaultProfile);
        }
      } catch (err) {
        setError('Failed to load profile');
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProfile();
  }, [currentUser]);
  
  // Function to update profile data
  const updateProfile = async (data: ProfileUpdateData): Promise<boolean> => {
    if (!currentUser || !profile) {
      Alert.alert('Error', 'No user is currently logged in');
      return false;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const updatedProfile = {
        ...profile,
        ...data,
      };
      
      await saveUserProfile(currentUser.uid, updatedProfile);
      setProfile(updatedProfile);
      setIsSaving(false);
      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
      setIsSaving(false);
      return false;
    }
  };
  
  // Function to pick and upload a photo
  const pickAndUploadPhoto = async (): Promise<string | null> => {
    if (!currentUser) {
      Alert.alert('Error', 'No user is currently logged in');
      return null;
    }
    
    try {
      // Ask for permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your photos');
        return null;
      }
      
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
        
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const uri = result.assets[0].uri;
          
          // Create a unique filename
          const filename = `${currentUser.uid}_${Date.now()}.jpg`;
          const storageRef = ref(storage, `profilePhotos/${currentUser.uid}/${filename}`);
          
          // Fetch the image and convert to blob
          const response = await fetch(uri);
          const blob = await response.blob();
          
          // Upload and get URL
          await uploadBytes(storageRef, blob);
          const downloadURL = await getDownloadURL(storageRef);
          
          return downloadURL;
        }
        return null;
      } catch (err: any) {
        Alert.alert('Upload Failed', `Error selecting or processing image: ${err?.message || 'Unknown error'}`);
        return null;
      }
    } catch (err: any) {
      Alert.alert('Upload Failed', `Failed to upload the photo: ${err?.message || 'Unknown error'}`);
      return null;
    }
  };
  
  // Function to add a new photo to the profile
  const addPhoto = async (): Promise<boolean> => {
    if (!profile) return false;
    
    const photoUrl = await pickAndUploadPhoto();
    if (!photoUrl) return false;
    
    const updatedPhotos = [...(profile.photos || []), photoUrl];
    return updateProfile({ photos: updatedPhotos });
  };
  
  // Function to remove a photo
  const removePhoto = async (photoUrl: string): Promise<boolean> => {
    if (!profile) return false;
    
    const updatedPhotos = (profile.photos || []).filter(url => url !== photoUrl);
    return updateProfile({ photos: updatedPhotos });
  };
  
  // Function to reorder photos
  const reorderPhotos = async (newPhotoOrder: string[]): Promise<boolean> => {
    if (!profile) return false;
    return updateProfile({ photos: newPhotoOrder });
  };
  
  return {
    profile,
    loading,
    error,
    isSaving,
    updateProfile,
    addPhoto,
    removePhoto,
    reorderPhotos,
  };
} 