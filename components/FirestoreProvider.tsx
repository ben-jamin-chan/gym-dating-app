import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { firestoreInitManager } from '@/utils/firebase/initManager';
import { useFirestoreReady } from '@/hooks/useFirestoreReady';

type FirestoreProviderProps = {
  children: React.ReactNode;
  
  // Optional custom loading component
  loadingComponent?: React.ReactNode;
  
  // Optional custom error component
  errorComponent?: React.ReactNode;
  
  // Whether to show anything during loading (defaults to true)
  showLoading?: boolean;
  
  // Whether to wait for Firestore to be ready (defaults to true)
  waitForReady?: boolean;
  
  // Timeout in ms after which to show a loading indicator (defaults to 1000ms)
  loadingDelay?: number;
};

/**
 * Provider component that manages Firestore initialization
 * Prevents rendering children until Firestore is properly initialized
 */
export function FirestoreProvider({
  children,
  loadingComponent,
  errorComponent,
  showLoading = true,
  waitForReady = true,
  loadingDelay = 1000
}: FirestoreProviderProps) {
  const { isReady, isError, error } = useFirestoreReady();
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  
  // Start initialization as soon as the component mounts, but only once
  useEffect(() => {
    let initTimeout: NodeJS.Timeout;
    let loadingTimeout: NodeJS.Timeout;
    
    const startInitialization = async () => {
      try {
        if (!isReady && !isError && firestoreInitManager.getState() === 'pending') {
          console.log('FirestoreProvider: Initializing Firestore');
          await firestoreInitManager.initialize();
        }
      } catch (err) {
        console.error('FirestoreProvider: Error initializing Firestore:', err);
      }
    };
    
    // Defer initialization by a tiny amount to let the component tree settle
    initTimeout = setTimeout(startInitialization, 100);
    
    // Only show loading indicator after a delay to avoid flashing
    if (!isReady && !isError && showLoading) {
      loadingTimeout = setTimeout(() => {
        setShowLoadingIndicator(true);
      }, loadingDelay);
    }
    
    return () => {
      clearTimeout(initTimeout);
      clearTimeout(loadingTimeout);
    };
  }, [isReady, isError, showLoading, loadingDelay]);
  
  // If we don't need to wait for Firestore to be ready, render children immediately
  if (!waitForReady) {
    return <>{children}</>;
  }
  
  // If there was an error initializing Firestore
  if (isError) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }
    
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorMessage}>
          {error?.message || 'Failed to connect to the database. Please try again later.'}
        </Text>
      </View>
    );
  }
  
  // If Firestore is still initializing
  if (!isReady) {
    // Don't show anything if loading indicators are disabled
    if (!showLoading) {
      return null;
    }
    
    // Use custom loading component if provided
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    
    // Only show the loading indicator after the delay has passed
    if (!showLoadingIndicator) {
      return null;
    }
    
    // Default loading indicator
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Connecting to database...</Text>
      </View>
    );
  }
  
  // Firestore is ready, render children
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'red',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
}); 