import { Colors, Shadows } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface HanaCardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  style?: ViewStyle;
}

export const HanaCard: React.FC<HanaCardProps> = ({ 
  children, 
  variant = 'elevated', 
  style 
}) => {
  const getCardStyle = () => {
    switch (variant) {
      case 'elevated':
        return [styles.card, styles.elevated, style];
      case 'outlined':
        return [styles.card, styles.outlined, style];
      case 'filled':
        return [styles.card, styles.filled, style];
      default:
        return [styles.card, styles.elevated, style];
    }
  };

  return (
    <View style={getCardStyle()}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    padding: 20,
    marginBottom: 16,
  },
  elevated: {
    ...Shadows.medium,
    backgroundColor: Colors.light.background,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  filled: {
    backgroundColor: Colors.light.surfaceVariant,
  },
});
