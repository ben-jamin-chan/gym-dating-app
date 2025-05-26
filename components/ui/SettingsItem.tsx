import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

interface SettingsItemProps {
  title: string;
  onPress?: () => void;
  showChevron?: boolean;
  icon?: React.ReactNode;
  type?: 'button' | 'toggle';
  value?: boolean;
  onValueChange?: (value: boolean) => void;
}

export default function SettingsItem({ 
  title, 
  onPress, 
  showChevron = true, 
  icon, 
  type = 'button',
  value,
  onValueChange 
}: SettingsItemProps) {
  if (type === 'toggle') {
    return (
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
  }

  return (
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
}

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
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
    color: '#111827',
    fontWeight: '500',
  },
}); 