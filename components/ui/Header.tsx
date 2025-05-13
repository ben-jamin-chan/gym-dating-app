import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';

type HeaderProps = {
  title?: string;
  showLogo?: boolean;
  showBackButton?: boolean;
  showSettingsButton?: boolean;
  onSettingsPress?: () => void;
};

export default function Header({
  title,
  showLogo = false,
  showBackButton = false,
  showSettingsButton = false,
  onSettingsPress,
}: HeaderProps) {
  const router = useRouter();
  
  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        {showBackButton && (
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            {/* Back icon would go here */}
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.centerContainer}>
        {showLogo ? (
          <Text style={styles.logoText}>SwoleMates</Text>
        ) : (
          <Text style={styles.title}>{title}</Text>
        )}
      </View>
      
      <View style={styles.rightContainer}>
        {showSettingsButton && (
          <TouchableOpacity 
            onPress={onSettingsPress}
            style={styles.settingsButton}
          >
            <Settings size={22} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
    }),
  },
  leftContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerContainer: {
    flex: 2,
    alignItems: 'center',
  },
  rightContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  backButton: {
    padding: 8,
  },
  settingsButton: {
    padding: 8,
  },
  logoText: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: '#FF5864',
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#111827',
  },
});