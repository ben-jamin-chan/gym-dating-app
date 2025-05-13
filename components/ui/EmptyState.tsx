import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Heart, MessageCircle, Search, RefreshCcw, MapPin } from 'lucide-react-native';
import Button from '@/components/ui/Button';

type EmptyStateProps = {
  title: string;
  message: string;
  iconName?: 'heart' | 'message-circle' | 'search' | 'map-pin';
  buttonText?: string;
  onButtonPress?: () => void;
};

export default function EmptyState({
  title,
  message,
  iconName,
  buttonText,
  onButtonPress,
}: EmptyStateProps) {
  const renderIcon = () => {
    switch (iconName) {
      case 'heart':
        return <Heart size={60} color="#E5E7EB" />;
      case 'message-circle':
        return <MessageCircle size={60} color="#E5E7EB" />;
      case 'map-pin':
        return <MapPin size={60} color="#E5E7EB" />;
      case 'search':
      default:
        return <Search size={60} color="#E5E7EB" />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {iconName ? renderIcon() : <RefreshCcw size={60} color="#E5E7EB" />}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      
      {buttonText && onButtonPress && (
        <Button
          title={buttonText}
          onPress={onButtonPress}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    maxWidth: 300,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  button: {
    minWidth: 120,
  },
});