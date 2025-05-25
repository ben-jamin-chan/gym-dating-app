import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from './AuthProvider';

interface AuthGuardProps {
  children: React.ReactNode;
  fallbackPath?: string;
}

export function AuthGuard({ children, fallbackPath = '/' }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    // Delay the navigation check to ensure the router is ready
    const timeout = setTimeout(() => {
      // If not loading and no user, redirect to fallback path
      if (!isLoading && !user) {
        router.replace(fallbackPath as any);
      }
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [user, isLoading, router, fallbackPath]);
  
  // Show loading indicator while authenticating
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }
  
  // Always render children initially - the useEffect will handle redirection if needed
  return <>{children}</>;
} 