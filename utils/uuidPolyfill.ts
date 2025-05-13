import 'react-native-get-random-values';

// This file is imported early in the app startup process to ensure 
// that the crypto.getRandomValues() polyfill is available before 
// any UUID generation is attempted.
// 
// This solves the error: "crypto.getRandomValues() not supported"
// which happens when using uuid in React Native. 