export type UserProfile = {
  id: string;
  displayName?: string;
  name?: string;
  email?: string;
  photoURL?: string;
  age: number;
  bio: string;
  images?: string[];
  photos?: string[];
  verified?: boolean;
  interests: string[];
  location?: {
    latitude: number;
    longitude: number;
  } | string;
  gender?: string;
  distance?: number;
  workoutFrequency?: string;
  gymCheckIns?: number;
  preferredWorkouts?: string[];
  height?: number;
  weight?: number;
  goal1?: string;
  goal2?: string;
  goal3?: string;
  intensity?: string;
  preferred_time?: string;
  gym_name?: string;
};

export type UserPreferences = {
  userId: string;
  ageRange: {
    min: number;
    max: number;
  };
  maxDistance: number;
  genderPreference: string[] | 'all';
  workoutFrequencyPreference?: string[];
  interestWeights?: Record<string, number>;
  globalMode?: boolean;
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
    distance?: number; // Distance in kilometers
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