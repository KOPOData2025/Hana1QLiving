import { Colors } from '@/constants/Colors';
import React from 'react';
import { StatusBar, StyleSheet, View, Image } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HanaHeaderProps {
  title: string;
  subtitle?: string;
  leftIcon?: string;
  rightIcon?: string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
  variant?: 'default' | 'gradient' | 'transparent' | 'compact' | 'gray';
  showLogo?: boolean;
}

export const HanaHeader: React.FC<HanaHeaderProps> = ({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  showBackButton = false,
  onBackPress,
  variant = 'default',
  showLogo = false,
}) => {
  const insets = useSafeAreaInsets();

  const headerStyle = [
    styles.header,
    variant === 'gradient' && styles.headerGradient,
    variant === 'transparent' && styles.headerTransparent,
    variant === 'compact' && styles.headerCompact,
    variant === 'gray' && styles.headerGray,
    { paddingTop: showLogo ? Math.max(insets.top - 30, 0) : (variant === 'compact' ? insets.top - 10 : insets.top + 8) },
  ];

  return (
    <>
      <StatusBar
        barStyle={variant === 'transparent' ? 'light-content' : 'dark-content'}
        backgroundColor={variant === 'transparent' ? 'transparent' : Colors.light.surface}
        translucent
      />
      <View style={headerStyle}>
        <View style={[
          styles.headerContent,
          variant === 'compact' && styles.headerContentCompact,
          showLogo && styles.headerContentWithLogo
        ]}>
          <View style={styles.leftSection}>
            {showBackButton && (
              <IconButton
                icon="arrow-left"
                size={24}
                iconColor={variant === 'transparent' ? Colors.light.textInverse : Colors.light.text}
                onPress={onBackPress}
                style={styles.iconButton}
              />
            )}
            {leftIcon && (
              <IconButton
                icon={leftIcon}
                size={24}
                iconColor={variant === 'transparent' ? Colors.light.textInverse : Colors.light.text}
                onPress={onLeftPress}
                style={styles.iconButton}
              />
            )}
          </View>

          <View style={[
            styles.titleSection,
            (showBackButton || leftIcon) && styles.titleSectionWithBack,
            showLogo && styles.titleSectionWithLogo
          ]}>
            <View style={styles.titleRow}>
              {showLogo && (
                <Image
                  source={require('@/assets/images/1qliving-small.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              )}
              <Text style={[
                styles.title,
                variant === 'transparent' && styles.titleLight,
                showLogo && styles.titleWithLogo
              ]}>
                {title}
              </Text>
            </View>
            {subtitle && (
              <Text style={[
                styles.subtitle,
                variant === 'transparent' && styles.subtitleLight
              ]}>
                {subtitle}
              </Text>
            )}
          </View>

          <View style={styles.rightSection}>
            {rightIcon && (
              <IconButton
                icon={rightIcon}
                size={24}
                iconColor={variant === 'transparent' ? Colors.light.textInverse : Colors.light.text}
                onPress={onRightPress}
                style={styles.iconButton}
              />
            )}
          </View>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 0,
    zIndex: 1000,
  },
  headerGradient: {
    backgroundColor: Colors.light.primary,
    borderBottomWidth: 0,
  },
  headerTransparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 7,
    minHeight: 48,
  },
  headerCompact: {
    backgroundColor: '#c8e6c9',
    borderBottomWidth: 0,
  },
  headerGray: {
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 0,
  },
  headerContentCompact: {
    paddingVertical: 0,
    paddingBottom: 0,
    paddingTop: 0,
    minHeight: 0,
    height: 25,
  },
  headerContentWithLogo: {
    height: 'auto',
    minHeight: 20,
    paddingVertical: 0,
    paddingBottom: 0,
    paddingTop: 0,
    marginBottom: -9,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 48,
  },
  titleSection: {
    flex: 1,
    alignItems: 'center',
    marginLeft: 0,
  },
  titleSectionWithBack: {
    marginLeft: 0,
    alignItems: 'center',
  },
  titleSectionWithLogo: {
    alignItems: 'flex-start',
    marginLeft: -48,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 110,
    height: 110,
    marginRight: 8,
    marginLeft: 8,
    marginTop: 8,
    marginBottom: -13,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 48,
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
  },
  titleLight: {
    color: Colors.light.textInverse,
  },
  titleWithLogo: {
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'left',
    marginTop: 2,
  },
  subtitleLight: {
    color: Colors.light.textInverse + 'CC',
  },
  iconButton: {
    margin: 0,
  },
});
