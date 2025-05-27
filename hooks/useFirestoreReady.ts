import { useState, useEffect } from 'react';
import { firestoreInitManager, FirestoreInitState } from '@/utils/firebase/initManager';

/**
 * Hook to track Firestore initialization state in React components
 * @returns Object with isReady, isError, and error state
 */
export function useFirestoreReady() {
  const [isReady, setIsReady] = useState<boolean>(firestoreInitManager.isReady());
  const [isError, setIsError] = useState<boolean>(firestoreInitManager.getState() === FirestoreInitState.ERROR);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Register ready callback
    const unsubscribeReady = firestoreInitManager.onReady(() => {
      setIsReady(true);
      setIsError(false);
      setError(null);
    });

    // Register error callback
    const unsubscribeError = firestoreInitManager.onError((err) => {
      setIsReady(false);
      setIsError(true);
      setError(err instanceof Error ? err : new Error(String(err)));
    });

    // Trigger initialization if not already done
    if (firestoreInitManager.getState() === FirestoreInitState.PENDING) {
      firestoreInitManager.initialize().catch(err => {
        console.error('Error initializing Firestore:', err);
      });
    }

    // Cleanup on unmount
    return () => {
      unsubscribeReady();
      unsubscribeError();
    };
  }, []);

  return { isReady, isError, error };
}

/**
 * Hook that ensures a component doesn't render its children until Firestore is ready
 * @param renderLoading Optional function to render while loading
 * @param renderError Optional function to render on error
 * @returns Object with render function and isReady state
 */
export function useFirestoreReadyRenderer(
  renderLoading?: () => React.ReactNode,
  renderError?: (error: Error | null) => React.ReactNode
) {
  const { isReady, isError, error } = useFirestoreReady();

  const render = (children: React.ReactNode): React.ReactNode => {
    if (isReady) {
      return children;
    }

    if (isError && renderError) {
      return renderError(error);
    }

    if (renderLoading) {
      return renderLoading();
    }

    // Default loading state
    return null;
  };

  return { render, isReady, isError, error };
}

/**
 * Hook that ensures a function is only called when Firestore is ready
 * @param fn Function to be called when Firestore is ready
 * @returns Wrapped function that only executes when Firestore is ready
 */
export function useFirestoreReadyCallback<T extends (...args: any[]) => any>(
  fn: T
): [(...args: Parameters<T>) => ReturnType<T> | Promise<ReturnType<T>>, boolean] {
  const { isReady } = useFirestoreReady();

  const wrappedFn = (...args: Parameters<T>): ReturnType<T> | Promise<ReturnType<T>> => {
    if (!isReady) {
      console.warn('Attempted to call Firestore function before initialization is complete');
      return firestoreInitManager.waitForReady().then(() => fn(...args));
    }

    return fn(...args);
  };

  return [wrappedFn, isReady];
} 