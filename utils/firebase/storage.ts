import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

// Media uploads
export const uploadMedia = async (
  uri: string,
  conversationId: string,
  messageId: string
): Promise<string> => {
  try {
    // Create a blob from the file URI
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, `chat/${conversationId}/${messageId}`);
    await uploadBytes(storageRef, blob);
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw error;
  }
}; 