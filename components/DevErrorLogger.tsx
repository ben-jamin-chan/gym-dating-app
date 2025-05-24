import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Development-only component for testing error logging
export const DevErrorLogger: React.FC = () => {
  const triggerConsoleError = () => {
    console.error('Manual console.error test - should show in terminal with 🔴');
  };

  const triggerConsoleWarn = () => {
    console.warn('Manual console.warn test - should show in terminal with 🟡');
  };

  const triggerThrownError = () => {
    throw new Error('Manual thrown error test - should be caught by error boundary');
  };

  const triggerAsyncError = () => {
    setTimeout(() => {
      throw new Error('Manual async error test - should be caught by global handler');
    }, 1000);
  };

  const triggerPromiseRejection = () => {
    Promise.reject(new Error('Manual promise rejection test - should be caught by rejection handler'));
  };

  // Only show in development
  if (__DEV__) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🛠️ Dev Error Testing</Text>
        <TouchableOpacity style={styles.button} onPress={triggerConsoleError}>
          <Text style={styles.buttonText}>Test console.error</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={triggerConsoleWarn}>
          <Text style={styles.buttonText}>Test console.warn</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={triggerThrownError}>
          <Text style={styles.buttonText}>Test thrown error</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={triggerAsyncError}>
          <Text style={styles.buttonText}>Test async error</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={triggerPromiseRejection}>
          <Text style={styles.buttonText}>Test promise rejection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 8,
    zIndex: 1000,
  },
  title: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 4,
    marginVertical: 2,
  },
  buttonText: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
  },
}); 