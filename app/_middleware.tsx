import { withAuth } from '@/utils/withAuth';
import { Redirect } from 'expo-router';
import React from 'react';

export default withAuth(({ user, children, segment }) => {
  // Publicly accessible segments
  const publicSegments = ['(auth)', 'privacy', 'terms'];
  
  // If the user is not authenticated, redirect to login screen
  // This ensures users always start with auth flow if not logged in
  if (!user) {
    // Only allow access to public segments
    if (!publicSegments.includes(segment as string)) {
      return <Redirect href="/(auth)/login" />;
    }
  }
  
  // If user is authenticated and trying to access auth segments, redirect to main app
  if (user && segment === '(auth)') {
    return <Redirect href="/(tabs)" />;
  }
  
  // Otherwise, render the children
  return <>{children}</>;
}); 