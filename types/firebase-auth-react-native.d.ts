declare module '@firebase/auth' {
  import type { FirebaseApp } from 'firebase/app';
  import type { Auth, Persistence } from 'firebase/auth';

  /**
   * Initializes Firebase Auth for React Native with specified persistence.
   * Provided by React Native adapter.
   */
  export function initializeAuth(
    app: FirebaseApp,
    deps?: { persistence?: Persistence | Persistence[] }
  ): Auth;

  /**
   * Returns a React Native persistence implementation using AsyncStorage.
   */
  export function getReactNativePersistence(storage: any): Persistence;
} 