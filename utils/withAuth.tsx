import React, { ReactNode, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { getCurrentUser, subscribeToAuthChanges } from './firebase';
import { User } from 'firebase/auth';

type WithAuthProps = {
  user: User | null;
  children: ReactNode;
  segment: string | null;
};

type WithAuthComponent = (props: WithAuthProps) => JSX.Element;

export function withAuth(WrappedComponent: WithAuthComponent) {
  return function WithAuthWrapper({ children, segment }: { children: ReactNode; segment: string | null }) {
    const [user, setUser] = useState<User | null>(getCurrentUser());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      // Subscribe to auth state changes
      const unsubscribe = subscribeToAuthChanges((newUser) => {
        setUser(newUser);
        setIsLoading(false);
      });

      // Cleanup subscription
      return unsubscribe;
    }, []);

    if (isLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      );
    }

    // Pass user, children, and segment to the wrapped component
    return <WrappedComponent user={user} children={children} segment={segment} />;
  };
} 