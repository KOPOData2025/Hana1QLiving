import { Colors } from '@/constants/Colors';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, ImageBackground, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    const animations = [
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ];

    Animated.parallel(animations).start();
  }, []);

  return (
    <ImageBackground
      source={require('@/assets/images/splash_tree.png')}
      style={styles.container}
      resizeMode="cover"
    >
      {/* 어두운 오버레이로 가독성 향상 */}
      <View style={styles.overlay} />
      
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* 하나원큐리빙 로고 */}
        <View style={styles.logoWrapper}>
          <Text style={styles.logoText}>하나원큐리빙</Text>
          <Text style={styles.logoSubtext}>HANA ONE Q LIVING</Text>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideUpAnim }],
          },
        ]}
      >
        <Text style={styles.slogan}>프리미엄 오피스텔 라이프, 하나로</Text>
        <Text style={styles.description}>
          입주 · 결제 · 계약 · 대출까지{'\n'}
          하나의 앱으로 간편하게
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.footer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideUpAnim }],
          },
        ]}
      >
        <Text style={styles.footerText}>하나원큐 리빙</Text>
        <Text style={styles.footerSubtext}>SMART LIVING SERVICE</Text>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoWrapper: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 20,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.light.background,
    marginBottom: 8,
    letterSpacing: 1,
  },
  logoSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.background,
    opacity: 0.85,
    letterSpacing: 2,
  },
  contentContainer: {
    alignItems: 'center',
    marginBottom: 60,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 12,
  },
  slogan: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.background,
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: 16,
    color: Colors.light.background,
    textAlign: 'center',
    lineHeight: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  footerText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.background,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: Colors.light.background,
    letterSpacing: 1,
  },
});
