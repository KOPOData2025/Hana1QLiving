import { Colors } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface GradientViewProps {
  children: React.ReactNode;
  colors?: string[];
  style?: any;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export const GradientView: React.FC<GradientViewProps> = ({
  children,
  colors = [Colors.light.primary, Colors.light.primaryLight],
  style,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
}) => {
  return (
    <View style={[styles.gradient, { backgroundColor: colors[0] }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});
