import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

interface SettingItemProps {
  title: string;
  onPress: () => void;
  showChevron?: boolean;
  icon?: React.ReactNode;
  isDestructive?: boolean;
}

export function SettingItem({
  title,
  onPress,
  showChevron = true,
  icon,
  isDestructive = false
}: SettingItemProps) {
  return (
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
}

interface ToggleSettingProps {
  title: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export function ToggleSetting({
  title,
  value,
  onValueChange,
  icon,
  disabled = false
}: ToggleSettingProps) {
  return (
    <View style={[styles.settingItem, disabled && styles.settingItemDisabled]}>
      <View style={styles.settingLeftContent}>
        {icon && <View style={styles.settingIcon}>{icon}</View>}
        <Text style={[
          styles.settingTitle,
          disabled && styles.settingTitleDisabled
        ]}>
          {title}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#D1D5DB', true: '#FE3C72' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeaderContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

interface SettingsSectionProps {
  children: React.ReactNode;
}

export function SettingsSection({ children }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      {children}
    </View>
  );
}

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  sectionHeaderContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
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
  settingItemDisabled: {
    opacity: 0.5,
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
  settingTitleDestructive: {
    color: '#EF4444',
  },
  settingTitleDisabled: {
    color: '#9CA3AF',
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
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
}); 