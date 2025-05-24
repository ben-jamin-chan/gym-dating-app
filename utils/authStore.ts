import { create } from 'zustand';
import { User } from 'firebase/auth';
import { 
  registerUser as firebaseRegisterUser, 
  registerUserWithoutProfile as firebaseRegisterUserWithoutProfile,
  loginUser as firebaseLoginUser, 
  logoutUser as firebaseLogoutUser,
  resetPassword as firebaseResetPassword,
  updateUserProfile as firebaseUpdateUserProfile,
  getCurrentUser,
  subscribeToAuthChanges
} from './firebase';
import { createDefaultPreferences } from '@/services/preferencesService';

interface PendingRegistration {
  email: string;
  password: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  pendingRegistration: PendingRegistration | null;
  
  initialize: () => Promise<void>;
  register: (email: string, password: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (displayName: string, photoURL?: string) => Promise<User | null>;
  clearError: () => void;
  setPendingRegistration: (data: PendingRegistration) => Promise<void>;
  completePendingRegistration: () => Promise<User>;
  clearPendingRegistration: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  pendingRegistration: null,

  initialize: async () => {
    console.log('Initializing auth store...');
    set({ isLoading: true });
    
    try {
      // Check for current user first
      const currentUser = getCurrentUser();
      console.log('Current user from auth:', currentUser ? `ID: ${currentUser.uid}` : 'No user');
      
      // Initial state update with current user
      set({ 
        user: currentUser,
        isLoading: false,
        isInitialized: true 
      });
      
      // Set up auth state listener for future changes
      subscribeToAuthChanges((user) => {
        console.log('Auth state changed:', user ? `ID: ${user.uid}` : 'No user');
        set({ user, isLoading: false });
      });
    } catch (error: any) {
      console.error('Error initializing auth store:', error);
      set({ 
        error: error.message || 'Failed to initialize authentication',
        isLoading: false,
        isInitialized: true
      });
    }
  },
  
  register: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      console.log(`Registering user with email: ${email}`);
      const user = await firebaseRegisterUser(email, password);
      console.log(`User registered successfully with ID: ${user.uid}`);
      set({ user, isLoading: false });
      await createDefaultPreferences(user.uid);
      return user;
    } catch (error: any) {
      console.error('Registration error:', error.message || error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      console.log(`Logging in user with email: ${email}`);
      const user = await firebaseLoginUser(email, password);
      console.log(`User logged in successfully with ID: ${user.uid}`);
      set({ user, isLoading: false, pendingRegistration: null });
      return user;
    } catch (error: any) {
      console.error('Login error:', error.message || error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  logout: async () => {
    set({ isLoading: true, error: null });
    
    try {
      console.log('Logging out user...');
      await firebaseLogoutUser();
      console.log('User logged out successfully');
      set({ user: null, isLoading: false, pendingRegistration: null });
    } catch (error: any) {
      console.error('Logout error:', error.message || error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  resetPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    
    try {
      await firebaseResetPassword(email);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  updateProfile: async (displayName: string, photoURL?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      console.log(`Updating profile for user with name: ${displayName}`);
      const user = await firebaseUpdateUserProfile(displayName, photoURL);
      console.log('Profile updated successfully');
      set({ user, isLoading: false });
      return user;
    } catch (error: any) {
      console.error('Profile update error:', error.message || error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  clearError: () => set({ error: null }),

  setPendingRegistration: async (data: PendingRegistration) => {
    set({ pendingRegistration: data });
  },

  completePendingRegistration: async () => {
    const { pendingRegistration } = get();
    if (!pendingRegistration) {
      throw new Error('No pending registration found');
    }

    set({ isLoading: true, error: null });
    
    try {
      console.log(`Completing registration for: ${pendingRegistration.email}`);
      const user = await firebaseRegisterUserWithoutProfile(pendingRegistration.email, pendingRegistration.password);
      console.log(`User registered successfully with ID: ${user.uid}`);
      
      // Update profile with display name
      await firebaseUpdateUserProfile(pendingRegistration.name, null);
      console.log('User profile updated with name:', pendingRegistration.name);
      
      set({ user, isLoading: false, pendingRegistration: null });
      await createDefaultPreferences(user.uid);
      return user;
    } catch (error: any) {
      console.error('Registration completion error:', error.message || error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearPendingRegistration: () => {
    set({ pendingRegistration: null });
  }
})); 