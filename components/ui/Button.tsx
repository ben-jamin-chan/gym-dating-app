import React, { ReactNode } from 'react';
import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle, ActivityIndicator } from 'react-native';

type ButtonProps = {
  title: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export default function Button({
  title,
  onPress,
  style,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
}: ButtonProps) {
  let buttonStyle;
  let textStyle;
  
  // Button variant styles
  switch (variant) {
    case 'secondary':
      buttonStyle = styles.secondaryButton;
      textStyle = styles.secondaryButtonText;
      break;
    case 'outline':
      buttonStyle = styles.outlineButton;
      textStyle = styles.outlineButtonText;
      break;
    case 'primary':
    default:
      buttonStyle = styles.primaryButton;
      textStyle = styles.primaryButtonText;
  }
  
  // Button size styles
  let sizeStyle;
  let textSizeStyle;
  
  switch (size) {
    case 'small':
      sizeStyle = styles.smallButton;
      textSizeStyle = styles.smallButtonText;
      break;
    case 'large':
      sizeStyle = styles.largeButton;
      textSizeStyle = styles.largeButtonText;
      break;
    case 'medium':
    default:
      sizeStyle = styles.mediumButton;
      textSizeStyle = styles.mediumButtonText;
  }
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        buttonStyle,
        sizeStyle,
        disabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#3B82F6' : '#FFFFFF'} />
      ) : (
        <>
          {leftIcon && <Text style={styles.iconContainer}>{leftIcon}</Text>}
          <Text style={[styles.buttonText, textStyle, textSizeStyle, disabled && styles.disabledText]}>
            {title}
          </Text>
          {rightIcon && <Text style={styles.iconContainer}>{rightIcon}</Text>}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  buttonText: {
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  // Variants
  primaryButton: {
    backgroundColor: '#FF5864',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#3B82F6',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  outlineButtonText: {
    color: '#3B82F6',
  },
  // Sizes
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  smallButtonText: {
    fontSize: 14,
  },
  mediumButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  mediumButtonText: {
    fontSize: 16,
  },
  largeButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  largeButtonText: {
    fontSize: 18,
  },
  // States
  disabledButton: {
    backgroundColor: '#E5E7EB',
    borderColor: '#E5E7EB',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  // Icon
  iconContainer: {
    marginHorizontal: 6,
  },
});