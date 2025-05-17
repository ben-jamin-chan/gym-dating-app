declare module 'firebase/auth/react-native' {
  import type { Auth } from 'firebase/auth';
  import type { FirebaseApp } from 'firebase/app';

  /**
   * Initializes Firebase Auth for React Native with specified persistence.
   */
  export function initializeAuth(
    app: FirebaseApp,
    options: { persistence: any }
  ): Auth;

  /**
   * Returns a React Native persistence implementation using AsyncStorage.
   */
  export function getReactNativePersistence(storage: any): any;
} 