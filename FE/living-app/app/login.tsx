import { GradientView } from '@/components/GradientView';
import { HanaButton } from '@/components/HanaButton';
import { HanaCard } from '@/components/HanaCard';
import { HanaHeader } from '@/components/HanaHeader';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { login } = useAuth();
  const colorScheme = useColorScheme();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(email.trim(), password);
      if (success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('로그인 실패', '이메일 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => {
    router.push('/register');
  };

  return (
    <GradientView colors={[Colors.light.primary, Colors.light.primaryLight]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* 상단 헤더 */}
        <HanaHeader
          title="하나원큐리빙"
          subtitle="스마트한 오피스텔 라이프"
          variant="transparent"
        />
        
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 로고 및 브랜딩 */}
          <View style={styles.brandSection}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>하나</Text>
              <Text style={styles.logoSubText}>ONE</Text>
            </View>
            <Text style={styles.brandTitle}>하나원큐 리빙</Text>
            <Text style={styles.brandSubtitle}>
              스마트한 오피스텔 라이프를 위한{'\n'}하나금융그룹의 프리미엄 서비스
            </Text>
          </View>

          {/* 로그인 폼 */}
          <HanaCard variant="elevated" style={styles.loginCard}>
            <Text style={styles.welcomeText}>안녕하세요!</Text>
            <Text style={styles.welcomeSubtext}>
              하나원큐 리빙에 오신 것을 환영합니다
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                label="이메일"
                value={email}
                onChangeText={setEmail}
                style={[
                  styles.input,
                  emailFocused && styles.inputFocused
                ]}
                mode="outlined"
                outlineColor={emailFocused ? Colors.light.primary : Colors.light.border}
                activeOutlineColor={Colors.light.primary}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                autoCapitalize="none"
                keyboardType="email-address"
                left={<TextInput.Icon icon="email" iconColor={Colors.light.textSecondary} />}
              />
              
              <TextInput
                label="비밀번호"
                value={password}
                onChangeText={setPassword}
                style={[
                  styles.input,
                  passwordFocused && styles.inputFocused
                ]}
                mode="outlined"
                outlineColor={passwordFocused ? Colors.light.primary : Colors.light.border}
                activeOutlineColor={Colors.light.primary}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry
                left={<TextInput.Icon icon="lock" iconColor={Colors.light.textSecondary} />}
              />
            </View>

            <View style={styles.buttonContainer}>
              <HanaButton
                title="로그인"
                onPress={handleLogin}
                variant="primary"
                size="large"
                loading={isLoading}
                disabled={isLoading}
                style={styles.loginButton}
              />
              
              <HanaButton
                title="회원가입"
                onPress={handleRegister}
                variant="outline"
                size="large"
                style={styles.registerButton}
              />
            </View>

            <View style={styles.helpSection}>
              <Text style={styles.helpText}>계정이 기억나지 않으세요?</Text>
              <Text style={styles.helpLink}>아이디/비밀번호 찾기</Text>
            </View>
          </HanaCard>

          {/* 추가 정보 */}
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              하나금융그룹의 모든 서비스를{'\n'}
              하나의 계정으로 이용하세요
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.light.textInverse,
    letterSpacing: 2,
  },
  logoSubText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.textInverse,
    letterSpacing: 4,
    marginTop: -8,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.textInverse,
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 16,
    color: Colors.light.textInverse,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
  },
  loginCard: {
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtext: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 30,
  },
  input: {
    marginBottom: 20,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
  },
  inputFocused: {
    borderColor: Colors.light.primary,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 24,
  },
  loginButton: {
    width: '100%',
  },
  registerButton: {
    width: '100%',
  },
  helpSection: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  helpText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  helpLink: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  infoSection: {
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.textInverse,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
});

