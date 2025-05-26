import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationSettingsProps {
  pushNotifications: boolean;
  setPushNotifications: (value: boolean) => void;
  emailNotifications: boolean;
  setEmailNotifications: (value: boolean) => void;
}

export function NotificationSettings({
  pushNotifications,
  setPushNotifications,
  emailNotifications,
  setEmailNotifications
}: NotificationSettingsProps) {
  const { 
    permissions, 
    preferences, 
    isLoading, 
    requestPermissions, 
    updatePreferences, 
    sendTestNotification,
    getCurrentToken 
  } = useNotifications();

  const renderToggleSetting = (
    title: string, 
    value: boolean, 
    onValueChange: (value: boolean) => void, 
    icon?: React.ReactNode
  ) => (
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
    <View style={styles.container}>
      {renderSectionHeader('Notifications')}
      
      {renderToggleSetting(
        'Push Notifications', 
        pushNotifications, 
        setPushNotifications,
        <Bell size={20} color="#6B7280" />
      )}

      {/* Detailed Notification Preferences */}
      {!isLoading && (
        <>
          {renderToggleSetting(
            'New Matches', 
            preferences.matches, 
            (value) => updatePreferences({ matches: value })
          )}

          {renderToggleSetting(
            'New Messages', 
            preferences.messages, 
            (value) => updatePreferences({ messages: value })
          )}

          {renderToggleSetting(
            'Like Notifications', 
            preferences.likes, 
            (value) => updatePreferences({ likes: value })
          )}

          {/* Test Notifications */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeftContent}>
              <Text style={styles.settingTitle}>Test Notifications</Text>
            </View>
            <View style={styles.testButtonsContainer}>
              <TouchableOpacity 
                onPress={() => sendTestNotification('match')}
                style={styles.testButton}
              >
                <Text style={styles.testButtonText}>Match</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => sendTestNotification('message')}
                style={styles.testButton}
              >
                <Text style={styles.testButtonText}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => sendTestNotification('superlike')}
                style={styles.testButton}
              >
                <Text style={styles.testButtonText}>Like</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
      
      {renderToggleSetting('Email Notifications', emailNotifications, setEmailNotifications)}
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
  settingLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  testButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  testButton: {
    backgroundColor: '#FE3C72',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
}); 