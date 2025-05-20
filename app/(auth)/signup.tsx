import React from 'react';
import { View, StyleSheet, Image, Text, TouchableOpacity, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import SignupForm from '@/components/auth/SignupForm';
import { LinearGradient } from 'expo-linear-gradient';

export default function SignupScreen() {
  const router = useRouter();

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar style="light" />
      <Image 
        source={{ uri: "https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg" }} 
        style={styles.backgroundImage} 
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.gradient}
      />
      <SafeAreaView edges={['bottom']} style={styles.content}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Create Account</Text>
            <Text style={styles.tagline}>Join the fitness community</Text>
          </View>
          
          <View style={styles.formContainer}>
            <SignupForm />
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.loginText}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.7,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: Platform.OS === 'web' ? 40 : 60,
    marginBottom: 20,
  },
  logoText: {
    fontFamily: 'Inter-Bold',
    fontSize: 36,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  tagline: {
    fontFamily: 'Inter-Regular',
    fontSize: 18,
    color: '#E5E7EB',
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    marginTop: 'auto',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: Platform.OS === 'web' ? 30 : 0,
  },
  footerText: {
    fontFamily: 'Inter-Regular',
    color: '#E5E7EB',
    fontSize: 16,
  },
  loginText: {
    fontFamily: 'Inter-SemiBold',
    color: '#3B82F6',
    fontSize: 16,
  },
});