import React, { useEffect, createContext, useContext, useState } from 'react';
import { useAuthStore } from '@/utils/authStore';
import { User } from 'firebase/auth';
import { Text, View, ActivityIndicator } from 'react-native';

// Create the auth context
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading, error, initialize, isInitialized: storeInitialized } = useAuthStore();
  const [initError, setInitError] = useState<string | null>(null);
  
  useEffect(() => {
    // Initialize auth state and mark as initialized when done
    const initAuth = async () => {
      console.log('AuthProvider: Initializing auth...');
      
      try {
        await initialize();
        console.log('AuthProvider: Auth initialized successfully');
      } catch (err: any) {
        console.error('AuthProvider: Error initializing auth:', err);
        setInitError(err.message || 'Failed to initialize authentication');
      }
    };
    
    initAuth();
  }, [initialize]);
  
  // Log auth state on changes
  useEffect(() => {
    console.log(`AuthProvider: Auth state - User:${user ? 'Yes' : 'No'}, Loading:${isLoading}, Initialized:${storeInitialized}`);
  }, [user, isLoading, storeInitialized]);
  
  // Create a value object that won't change references unnecessarily
  const contextValue = {
    user,
    isLoading,
    error: error || initError,
    isInitialized: storeInitialized
  };
  
  // Show a loading indicator if initialization is taking a long time
  if (isLoading && !storeInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 12, fontSize: 16, color: '#6B7280' }}>
          Initializing app...
        </Text>
      </View>
    );
  }
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for using auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
} 