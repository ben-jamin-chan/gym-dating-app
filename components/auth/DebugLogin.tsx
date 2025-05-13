import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import NetInfo from '@react-native-community/netinfo';

export default function DebugLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<string>('Unknown');
  const router = useRouter();

  // Check network status on mount and on demand
  const checkNetworkStatus = async () => {
    try {
      const netInfo = await NetInfo.fetch();
      const status = `Connected: ${netInfo.isConnected ? 'Yes' : 'No'}\nType: ${netInfo.type}\nDetails: ${JSON.stringify(netInfo.details)}`;
      setNetworkStatus(status);
      Alert.alert('Network Status', status);
    } catch (err) {
      setNetworkStatus('Error fetching network status');
      Alert.alert('Error', 'Failed to get network status');
    }
  };

  // Direct login with Firebase (bypassing store)
  const handleDirectLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      Alert.alert('Success', 'Logged in successfully');
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Direct login error:', error);
      Alert.alert('Login Error', error.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debug Login</Text>
      <Text style={styles.subtitle}>Use this to test direct Firebase Auth</Text>

      <TouchableOpacity
        style={styles.networkButton}
        onPress={checkNetworkStatus}
      >
        <Text style={styles.networkButtonText}>Check Network Status</Text>
      </TouchableOpacity>

      <Text style={styles.networkStatus}>{networkStatus}</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleDirectLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.loginButtonText}>Direct Firebase Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  networkButton: {
    backgroundColor: '#4B5563',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  networkButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  networkStatus: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
}); 