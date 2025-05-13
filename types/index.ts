export type UserProfile = {
  id: string;
  displayName: string;
  age: number;
  bio: string;
  images: string[];
  verified?: boolean;
  interests: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
  gender?: string;
  distance?: number;
  workoutFrequency?: string;
  gymCheckIns?: number;
  preferredWorkouts?: string[];
  gymLocation?: string;
};

export type Match = {
  id: string;
  userId: string;
  name: string;
  photo: string;
  matchedOn: string;
  newMatch: boolean;
};

export type MessageType = 'text' | 'image' | 'gif' | 'sticker';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export type Message = {
  id: string;
  conversationId: string;
  sender: string;
  text: string;
  timestamp: string;
  read: boolean;
  status: MessageStatus;
  type: MessageType;
  mediaUrl?: string;
  localUri?: string; // For locally stored images being uploaded
  isOfflineQueued?: boolean;
  retryCount?: number;
};

export type Conversation = {
  id: string;
  userId: string;
  user: {
    id?: string;
    name: string;
    photo: string;
    online: boolean;
    distance?: number; // Distance in miles
  };
  lastMessage: {
    text: string;
    timestamp: string;
    read: boolean;
  };
  typingStatus?: {
    isTyping: boolean;
    lastTyped: string;
  };
  unreadCount?: number;
};

export type TypingIndicator = {
  userId: string;
  conversationId: string;
  timestamp: string;
  isTyping: boolean;
};

export type NetworkStatus = {
  isConnected: boolean;
  lastConnected: string;
};