import { useCallback } from 'react';
import { processPendingMessages } from './firebase';

export const usePendingMessages = () => {
  const processMessages = useCallback(async () => {
    try {
      await processPendingMessages();
    } catch (error) {
      console.error('Error processing pending messages:', error);
    }
  }, []);

  return processMessages;
}; 