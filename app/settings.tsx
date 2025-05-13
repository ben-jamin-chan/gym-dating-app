import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, ChevronRight, LogOut, Trash, Bell, Lock, Shield, MapPin, Search, Smile, Phone } from 'lucide-react-native';
import { useAuthStore } from '@/utils/authStore';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateProfile, logout, isLoading, error } = useAuthStore();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Settings states
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [showOnTinder, setShowOnTinder] = useState(true);
  const [smartPhotos, setSmartPhotos] = useState(true);
  const [showOrientation, setShowOrientation] = useState(false);
  
  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }
    
    setIsUpdating(true);
    
    try {
      await updateProfile(displayName);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      // Redirect to login page after successful logout
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            // Implement account deletion logic here
            Alert.alert('Account Deletion', 'This feature is not yet implemented.');
          }
        }
      ]
    );
  };
  
  const renderSettingItem = (title: string, onPress: () => void, showChevron = true, icon?: React.ReactNode) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
    >
      <View style={styles.settingLeftContent}>
        {icon && <View style={styles.settingIcon}>{icon}</View>}
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      {showChevron && <ChevronRight size={18} color="#6B7280" />}
    </TouchableOpacity>
  );

  const renderToggleSetting = (title: string, value: boolean, onValueChange: (value: boolean) => void, icon?: React.ReactNode) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeftContent}>
        {icon && <View style={styles.settingIcon}>{icon}</View>}
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#D1D5DB', true: '#FE3C72' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  const renderSectionHeader = (title: string) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Account Settings */}
        <View style={styles.section}>
          {renderSectionHeader('Account Settings')}
          
          {renderSettingItem('Edit Profile', () => {
            router.push('/edit-profile');
          }, true, <Smile size={20} color="#6B7280" />)}
          
          {renderSettingItem('Phone Number', () => {
            Alert.alert('Phone Number', 'This feature is not yet implemented.');
          }, true, <Phone size={20} color="#6B7280" />)}
          
          {renderSettingItem('Email', () => {
            Alert.alert('Email', `Your current email is: ${email}`);
          }, true, <ChevronRight size={20} color="#6B7280" />)}
          
          {renderSettingItem('Delete Account', handleDeleteAccount, true, <Trash size={20} color="#EF4444" />)}
          
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <LogOut size={20} color="#FFFFFF" />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
        
        {/* Discovery Preferences */}
        <View style={styles.section}>
          {renderSectionHeader('Discovery Preferences')}
          
          {renderSettingItem('Distance', () => {
            Alert.alert('Distance', 'Set maximum distance for potential matches.');
          }, true, <MapPin size={20} color="#6B7280" />)}
          
          {renderSettingItem('Age Range', () => {
            Alert.alert('Age Range', 'Filter matches by age.');
          }, true)}
          
          {renderSettingItem('Gender Preferences', () => {
            Alert.alert('Gender Preferences', 'Choose which genders you want to see.');
          }, true)}
          
          {renderSettingItem('Global Mode', () => {
            Alert.alert('Global Mode', 'Disable distance limits to match worldwide (Premium feature).');
          }, true, <Search size={20} color="#6B7280" />)}
        </View>
        
        {/* Privacy & Safety */}
        <View style={styles.section}>
          {renderSectionHeader('Privacy & Safety')}
          
          {renderToggleSetting('Show Me on Tinder', showOnTinder, setShowOnTinder, <Shield size={20} color="#6B7280" />)}
          
          {renderSettingItem('Control Your Profile', () => {
            Alert.alert('Profile Visibility', 'Adjust visibility settings.');
          }, true)}
          
          {renderSettingItem('Block Contacts', () => {
            Alert.alert('Block Contacts', 'Prevent specific contacts from seeing you.');
          }, true, <Lock size={20} color="#6B7280" />)}
          
          {renderSettingItem('Photo Verification', () => {
            Alert.alert('Photo Verification', 'Verify your profile pictures.');
          }, true)}
          
          {renderSettingItem('Two-Factor Authentication', () => {
            Alert.alert('2FA', 'Add extra security to your account.');
          }, true, <Shield size={20} color="#6B7280" />)}
          
          {renderSettingItem('Report a Safety Issue', () => {
            Alert.alert('Report', 'Report harassment, scams, or inappropriate behavior.');
          }, true)}
        </View>
        
        {/* Swipe Preferences */}
        <View style={styles.section}>
          {renderSectionHeader('Swipe Preferences')}
          
          {renderToggleSetting('Smart Photos', smartPhotos, setSmartPhotos)}
          
          {renderToggleSetting('Show My Sexual Orientation', showOrientation, setShowOrientation, <Smile size={20} color="#6B7280" />)}
          
          {renderSettingItem('Incognito Mode', () => {
            Alert.alert('Incognito Mode', "Only appear to people you've liked (Premium feature).");
          }, true)}
        </View>
        
        {/* Notifications */}
        <View style={styles.section}>
          {renderSectionHeader('Notifications')}
          
          {renderToggleSetting('Push Notifications', pushNotifications, setPushNotifications, <Bell size={20} color="#6B7280" />)}
          
          {renderToggleSetting('Email Notifications', emailNotifications, setEmailNotifications)}
        </View>
        
        {/* App Settings */}
        <View style={styles.section}>
          {renderSectionHeader('App Settings')}
          
          {renderToggleSetting('Location', locationEnabled, setLocationEnabled, <MapPin size={20} color="#6B7280" />)}
        </View>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  logoutButton: {
    backgroundColor: '#FE3C72',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  versionText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
}); 