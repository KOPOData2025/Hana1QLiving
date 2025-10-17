import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import SplashScreen from '@/components/SplashScreen';
import { AccountProvider } from '@/contexts/AccountContext';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 스플래시 화면 표시 시간 (3초)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AccountProvider>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{ headerShown: false }}
            initialRouteName="index"
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="building-detail" options={{ headerShown: false }} />
            <Stack.Screen name="reservation-success" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </AccountProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
