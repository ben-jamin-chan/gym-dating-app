import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  suppressedErrors: string[];
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      // List of error messages to suppress from showing the error UI
      suppressedErrors: [
        'Failed to get document because the client is offline',
        'Firestore service is currently unavailable',
        'Error setting up system status document'
      ]
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to the console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Check if this is a suppressed error
    const shouldSuppress = this.state.suppressedErrors.some(
      suppressed => error.message.includes(suppressed)
    );
    
    if (shouldSuppress) {
      console.log('Suppressing error UI for non-critical error:', error.message);
      // Reset the error state after a short delay to allow the component to recover
      setTimeout(() => {
        this.setState({ hasError: false, error: null, errorInfo: null });
      }, 1000);
    }
  }
  
  handleDismiss = () => {
    // Reset the error state
    this.setState({ hasError: false, error: null, errorInfo: null });
  }
  
  handleMinimize = () => {
    // We'll just dismiss for now
    this.handleDismiss();
  }

  render() {
    // If there's an error and it's not suppressed, show the error UI
    if (this.state.hasError && this.state.error) {
      // Check if this is a suppressed error
      const shouldSuppress = this.state.suppressedErrors.some(
        suppressed => this.state.error?.message?.includes(suppressed)
      );
      
      if (shouldSuppress) {
        // Render the children if the error is suppressed
        return this.props.children;
      }
      
      // Otherwise show the error UI
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Log 1 of 1</Text>
          </View>
          
          <View style={styles.content}>
            <Text style={styles.errorTitle}>Console Error</Text>
            <Text style={styles.errorMessage}>
              {this.state.error.toString()}
            </Text>
            
            <Text style={styles.sectionTitle}>Source</Text>
            <ScrollView style={styles.codeContainer}>
              <Text style={styles.codeText}>
                {this.state.errorInfo?.componentStack || 'No stack trace available'}
              </Text>
            </ScrollView>
            
            <Text style={styles.sectionTitle}>Call Stack</Text>
            <ScrollView style={styles.stackContainer}>
              <Text style={styles.stackText}>
                {this.state.error.stack || 'No stack trace available'}
              </Text>
            </ScrollView>
          </View>
          
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={this.handleDismiss}
            >
              <Text style={styles.buttonText}>Dismiss</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button}
              onPress={this.handleMinimize}
            >
              <Text style={styles.buttonText}>Minimize</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    // Otherwise, render children normally
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B1B1D',
  },
  header: {
    backgroundColor: '#E14057',
    padding: 16,
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorTitle: {
    color: '#E14057',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorMessage: {
    color: 'white',
    fontSize: 14,
    marginBottom: 24,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  codeContainer: {
    backgroundColor: '#2A2A2C',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    maxHeight: 150,
  },
  codeText: {
    color: '#BCC3CD',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  stackContainer: {
    backgroundColor: '#2A2A2C',
    borderRadius: 8,
    padding: 12,
    maxHeight: 150,
  },
  stackText: {
    color: '#BCC3CD',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#2A2A2C',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default ErrorBoundary; 