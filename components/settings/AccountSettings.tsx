import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, LogOut, Trash, Smile, Phone } from 'lucide-react-native';
import { useAuthStore } from '@/utils/authStore';

interface AccountSettingsProps {
  email: string;
}

export function AccountSettings({ email }: AccountSettingsProps) {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/sign-in');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Delete Account', 'Account deletion is not yet implemented.');
          }
        }
      ]
    );
  };

  const renderSettingItem = (
    title: string, 
    onPress: () => void, 
    showChevron = true, 
    icon?: React.ReactNode,
    isDestructive = false
  ) => (
    <TouchableOpacity
      style={[
        styles.settingItem,
        isDestructive && styles.settingItemDestructive
      ]}
      onPress={onPress}
    >
      <View style={styles.settingLeftContent}>
        {icon && <View style={styles.settingIcon}>{icon}</View>}
        <Text style={[
          styles.settingTitle,
          isDestructive && styles.settingTitleDestructive
        ]}>
          {title}
        </Text>
      </View>
      {showChevron && <ChevronRight size={18} color="#6B7280" />}
    </TouchableOpacity>
  );

  const renderSectionHeader = (title: string) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  return (
    <View style={styles.container}>
      {renderSectionHeader('Account Settings')}
      
      {renderSettingItem(
        'Edit Profile', 
        () => router.push('/edit-profile'), 
        true, 
        <Smile size={20} color="#6B7280" />
      )}
      
      {renderSettingItem(
        'Phone Number', 
        () => Alert.alert('Phone Number', 'This feature is not yet implemented.'), 
        true, 
        <Phone size={20} color="#6B7280" />
      )}
      
      {renderSettingItem(
        'Email', 
        () => Alert.alert('Email', `Your current email is: ${email}`), 
        true, 
        <ChevronRight size={20} color="#6B7280" />
      )}
      
      {renderSettingItem(
        'Delete Account', 
        handleDeleteAccount, 
        true, 
        <Trash size={20} color="#EF4444" />,
        true
      )}
      
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <LogOut size={20} color="#FFFFFF" />
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  settingItemDestructive: {
    // Add any specific styling for destructive actions
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
  settingTitleDestructive: {
    color: '#EF4444',
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
}); 