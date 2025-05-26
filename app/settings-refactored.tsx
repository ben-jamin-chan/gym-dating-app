import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import { useAuthStore } from '@/utils/authStore';
import { 
  SettingsSection, 
  SectionHeader, 
  ToggleSetting, 
  ErrorMessage 
} from '@/components/ui/SettingsComponents';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { DiscoveryPreferences } from '@/components/settings/DiscoveryPreferences';
import { HeaderWithBackButton } from '@/components/ui/HeaderWithBackButton';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, error } = useAuthStore();
  
  // App Settings states
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [showDiscoveryOptions, setShowDiscoveryOptions] = useState(false);
  
  if (!user) {
    return <ErrorMessage message="You must be logged in to access settings" />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <HeaderWithBackButton 
        title="Settings" 
        onBackPress={() => router.back()} 
      />
      
      <ScrollView style={styles.content}>
        {error && <ErrorMessage message={error} />}

        {/* Account Settings */}
        <SettingsSection>
          <AccountSettings email={user.email || ''} />
        </SettingsSection>
        
        {/* Discovery Preferences */}
        <SettingsSection>
          <SectionHeader title="Discovery Preferences" />
          
          {!showDiscoveryOptions ? (
            <>
              <ToggleSetting
                title="Show Discovery Options"
                value={showDiscoveryOptions}
                onValueChange={setShowDiscoveryOptions}
                icon={<MapPin size={20} color="#6B7280" />}
              />
            </>
          ) : (
            <DiscoveryPreferences 
              userId={user.uid}
              onPreferencesSaved={() => setShowDiscoveryOptions(false)}
            />
          )}
        </SettingsSection>
        
        {/* Notifications */}
        <SettingsSection>
          <NotificationSettings
            pushNotifications={pushNotifications}
            setPushNotifications={setPushNotifications}
            emailNotifications={emailNotifications}
            setEmailNotifications={setEmailNotifications}
          />
        </SettingsSection>
        
        {/* App Settings */}
        <SettingsSection>
          <SectionHeader title="App Settings" />
          <ToggleSetting
            title="Location Services"
            value={locationEnabled}
            onValueChange={setLocationEnabled}
            icon={<MapPin size={20} color="#6B7280" />}
          />
        </SettingsSection>
        
        <View style={styles.versionContainer}>
          <SettingsSection>
            <SectionHeader title="Version 1.0.0" />
          </SettingsSection>
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
  content: {
    flex: 1,
    padding: 16,
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
}); 