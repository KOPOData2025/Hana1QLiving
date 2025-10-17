import { router, Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, View, Animated } from 'react-native';

import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { TabBarProvider, useTabBar } from '@/contexts/TabBarContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

function TabLayoutContent() {
  const colorScheme = useColorScheme();
  const { user, isLoading } = useAuth();
  const { isTabBarVisible } = useTabBar();
  const tabBarTranslateY = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(tabBarTranslateY, {
      toValue: isTabBarVisible ? 0 : 100,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isTabBarVisible]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading]);

  if (isLoading || !user) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.textTertiary,
        headerShown: false,

        tabBarBackground: () => (
          <Animated.View
            style={[
              styles.tabBarBackground,
              { transform: [{ translateY: tabBarTranslateY }] }
            ]}
          />
        ),
        tabBarStyle: {
          ...Platform.select({
            ios: {
              height: 88,
              paddingBottom: 20,
              paddingTop: 10,
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
            },
            android: {
              height: 70,
              paddingBottom: 10,
              paddingTop: 10,
              elevation: 5,
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
            },
            default: {
              height: 70,
              paddingBottom: 10,
              paddingTop: 10,
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
            },
          }),
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          shadowColor: 'transparent',
          elevation: 0,
          transform: [{ translateY: tabBarTranslateY }],
        } as any,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
          color: Colors.light.textSecondary,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        // 탭 전환 애니메이션 개선
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <MaterialIcons name="home" size={24} color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="contracts"
        options={{
          title: '계약 관리',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <MaterialIcons name="description" size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: '대출',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <MaterialIcons name="account-balance-wallet" size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="investment"
        options={{
          title: '투자',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <MaterialIcons name="trending-up" size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: '마이페이지',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <MaterialIcons name="person" size={24} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <TabBarProvider>
      <TabLayoutContent />
    </TabBarProvider>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
