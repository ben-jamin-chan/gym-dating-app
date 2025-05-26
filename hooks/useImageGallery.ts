import { useState } from 'react';

// Default profile image URL as a fallback
const DEFAULT_PROFILE_IMAGE = 'https://randomuser.me/api/portraits/lego/1.jpg';

interface ImageGalleryHook {
  activeImageIndex: number;
  handleNextImage: () => void;
  handlePreviousImage: () => void;
  getSafeImageUrl: (index?: number) => string;
  setActiveImageIndex: (index: number) => void;
}

export function useImageGallery(photos: string[] = []): ImageGalleryHook {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const handleNextImage = () => {
    if (photos.length > 0) {
      setActiveImageIndex((prev) => (prev + 1) % photos.length);
    }
  };

  const handlePreviousImage = () => {
    if (photos.length > 0) {
      setActiveImageIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  // Function to get a safe image URL with fallback
  const getSafeImageUrl = (index = activeImageIndex) => {
    if (photos.length > 0 && photos[index] && typeof photos[index] === 'string') {
      if (photos[index].startsWith('http')) {
        console.log(`Using image at index ${index}:`, photos[index]);
        return photos[index];
      } else {
        console.log(`Invalid image URL at index ${index}:`, photos[index]);
      }
    } else {
      console.log('No valid photos array found or index out of bounds:', {
        photosLength: photos.length,
        requestedIndex: index
      });
    }

    // Fallback to default if no valid image
    console.log('Using default profile image');
    return DEFAULT_PROFILE_IMAGE;
  };

  return {
    activeImageIndex,
    handleNextImage,
    handlePreviousImage,
    getSafeImageUrl,
    setActiveImageIndex,
  };
} 