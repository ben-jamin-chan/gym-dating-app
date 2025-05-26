// Profile-related TypeScript interfaces for improved type safety

export interface UserProfile {
  id: string;
  name?: string;
  displayName?: string;
  age?: string | number;
  dateOfBirth?: string;
  verified?: boolean;
  
  // Photos and media
  photos?: string[];
  images?: string[];
  photoURL?: string;
  video?: string;
  introVideo?: string;
  
  // Basic info
  bio?: string;
  location?: string | object;
  distance?: number;
  
  // Fitness information
  workoutFrequency?: string;
  intensity?: string;
  gymCheckIns?: number;
  gym_name?: string;
  preferred_time?: string;
  
  // Goals and interests
  goal1?: string;
  goal2?: string;
  goal3?: string;
  interests?: string[];
  
  // Body stats
  height?: string;
  weight?: string;
}

export interface ProfileImageGalleryProps {
  photos: string[];
  onBackPress: () => void;
}

export interface ProfileHeaderProps {
  name: string;
  displayName?: string;
  age?: string | number;
  dateOfBirth?: string;
  verified?: boolean;
  workoutFrequency?: string;
  distance?: number;
}

export interface ProfileDetailsProps {
  profile: UserProfile;
}

export interface ProfileActionsProps {
  currentUserId: string;
  targetUserId: string;
  isCurrentUser: boolean;
}

export interface ImageGalleryHook {
  activeImageIndex: number;
  handleNextImage: () => void;
  handlePreviousImage: () => void;
  getSafeImageUrl: (index?: number) => string;
  setActiveImageIndex: (index: number) => void;
}

export interface ProfileActionsHook {
  handleLike: (currentUserId: string, targetUserId: string) => Promise<void>;
  handleSuperLike: (currentUserId: string, targetUserId: string) => Promise<void>;
  handleDislike: (currentUserId: string, targetUserId: string) => Promise<void>;
  handleMessage: (targetUserId: string) => void;
}

export type SwipeAction = 'like' | 'superlike' | 'pass';

export interface MatchResult {
  id: string;
  users: string[];
  createdAt: Date;
} 