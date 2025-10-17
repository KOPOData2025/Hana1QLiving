import { Colors } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface ButtonProps {
  onPress: () => void;
  title: string;
  disabled?: boolean;
}

export const PrimaryButton: React.FC<ButtonProps> = ({ onPress, title, disabled = false }) => (
  <TouchableOpacity 
    style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]} 
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={styles.primaryButtonText}>{title}</Text>
  </TouchableOpacity>
);

export const SecondaryButton: React.FC<ButtonProps> = ({ onPress, title, disabled = false }) => (
  <TouchableOpacity 
    style={[styles.secondaryButton, disabled && styles.secondaryButtonDisabled]} 
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={styles.secondaryButtonText}>{title}</Text>
  </TouchableOpacity>
);

export const LinkButton: React.FC<ButtonProps> = ({ onPress, title }) => (
  <TouchableOpacity onPress={onPress} style={styles.linkButton}>
    <Text style={styles.linkButtonText}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryButtonDisabled: {
    backgroundColor: Colors.light.border,
    opacity: 0.6,
  },
  primaryButtonText: {
    color: Colors.light.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: Colors.light.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginTop: 8,
  },
  secondaryButtonDisabled: {
    backgroundColor: Colors.light.border,
    opacity: 0.6,
  },
  secondaryButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '500',
  },
  linkButton: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  linkButtonText: {
    color: Colors.light.primary,
    fontSize: 14,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});
