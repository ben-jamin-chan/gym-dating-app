import { Redirect } from 'expo-router';
import { useAuthStore } from '@/utils/authStore';

export default function Index() {
  const { user, isLoading } = useAuthStore();

  // If the auth state is still loading, don't redirect yet
  if (isLoading) {
    return null;
  }

  // If user is authenticated, redirect to main app
  if (user) {
    return <Redirect href="/(tabs)" />;
  }
  
  // If user is not authenticated, redirect to login
  return <Redirect href="/(auth)/login" />;
} 