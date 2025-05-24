import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '@/components/ui/Button';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react-native';
import { useAuthStore } from '@/utils/authStore';

export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { isLoading, error, clearError, setPendingRegistration, user } = useAuthStore();

  // Redirect if user is already logged in
  React.useEffect(() => {
    if (user) {
      console.log('User already logged in, redirecting to main app');
      router.replace('/(tabs)');
    }
  }, [user, router]);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    
    try {
      console.log('Storing registration data for onboarding...');
      
      // Store the registration data temporarily instead of creating account immediately
      await setPendingRegistration({ email, password, name });
      console.log('Registration data stored, navigating to onboarding...');
      
      // Navigate to onboarding without creating the account yet
      router.push('/onboarding');
    } catch (err: any) {
      console.error('Error storing registration data:', err.message || err);
      Alert.alert('Error', 'Failed to proceed with registration. Please try again.');
    }
  };
  
  // Clear any existing errors when component mounts
  React.useEffect(() => {
    clearError();
  }, [clearError]);

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <User size={20} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          editable={!isLoading}
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading}
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          editable={!isLoading}
        />
        <TouchableOpacity 
          style={styles.passwordToggle}
          onPress={() => setShowPassword(!showPassword)}
          disabled={isLoading}
        >
          {showPassword ? 
            <EyeOff size={20} color="#9CA3AF" /> : 
            <Eye size={20} color="#9CA3AF" />
          }
        </TouchableOpacity>
      </View>
      
      <Text style={styles.termsText}>
        By signing up, you agree to our{' '}
        <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
        <Text style={styles.termsLink}>Privacy Policy</Text>
      </Text>
      
      <Button 
        title={isLoading ? "Creating Account..." : "Create Account"}
        onPress={handleSignup}
        style={styles.signupButton}
        disabled={isLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 16,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    color: '#EF4444',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    height: '100%',
  },
  passwordToggle: {
    padding: 8,
  },
  termsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#E5E7EB',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
  },
  signupButton: {
    marginTop: 8,
  },
});