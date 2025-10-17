import { GradientView } from '@/components/GradientView';
import { HanaButton } from '@/components/HanaButton';
import { HanaCard } from '@/components/HanaCard';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Checkbox, Text, TextInput } from 'react-native-paper';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    currentAddress: '',
    agreeTerms: false,
    agreeMarketing: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // 전화번호 포맷팅 함수 (01012341234 -> 010-1234-5678)
  const formatPhoneNumber = (value: string): string => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '');

    // 길이에 따라 포맷팅
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    }

    // 11자리를 초과하면 11자리까지만 포맷팅
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    // 전화번호 필드인 경우 자동 포맷팅
    if (field === 'phone' && typeof value === 'string') {
      const formatted = formatPhoneNumber(value);
      setFormData(prev => ({ ...prev, [field]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleRegister = async () => {
    // 폼 검증
    if (!formData.username.trim() || !formData.email.trim() || !formData.password || !formData.confirmPassword) {
      Alert.alert('입력 오류', '모든 필수 항목을 입력해주세요.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('입력 오류', '비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!formData.agreeTerms) {
      Alert.alert('약관 동의', '이용약관에 동의해주세요.');
      return;
    }

    // 비밀번호 강도 검증
    if (formData.password.length < 8) {
      Alert.alert('입력 오류', '비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);
    try {
      // 회원가입 API 호출
      const success = await register(
        formData.email.trim().toLowerCase(),
        formData.password,
        formData.username.trim(),
        formData.phone.trim(),
        formData.currentAddress.trim(),
        formData.agreeMarketing
      );

      if (success) {
        Alert.alert(
          '회원가입 완료', 
          '하나원큐 리빙에 가입되었습니다!\n이메일 인증을 완료해주세요.', 
          [
            { text: '확인', onPress: () => router.replace('/login') }
          ]
        );
      } else {
        Alert.alert('회원가입 실패', '회원가입 중 오류가 발생했습니다.');
      }
    } catch (error: any) {
      Alert.alert('회원가입 실패', '회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  return (
    <GradientView colors={[Colors.light.primary, Colors.light.primaryLight]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <HanaButton
              title="← 뒤로"
              onPress={handleBackToLogin}
              variant="ghost"
              size="small"
              style={styles.backButton}
            />
            <Text style={styles.headerTitle}>회원가입</Text>
          </View>

          {/* 브랜딩 */}
          <View style={styles.brandSection}>
            <Text style={styles.brandTitle}>하나원큐 리빙</Text>
            <Text style={styles.brandSubtitle}>
              하나금융그룹의 프리미엄 오피스텔 서비스에{'\n'}
              가입하고 스마트한 라이프를 시작하세요
            </Text>
          </View>

          {/* 회원가입 폼 */}
          <HanaCard variant="elevated" style={styles.formCard}>
            <Text style={styles.formTitle}>기본 정보 입력</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                label="이름 *"
                value={formData.username}
                onChangeText={(value) => handleInputChange('username', value)}
                style={[
                  styles.input,
                  focusedField === 'username' && styles.inputFocused
                ]}
                mode="outlined"
                outlineColor={focusedField === 'username' ? Colors.light.primary : Colors.light.border}
                activeOutlineColor={Colors.light.primary}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="words"
                left={<TextInput.Icon icon="account" iconColor={Colors.light.textSecondary} />}
              />
              
              <TextInput
                label="이메일 *"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                style={[
                  styles.input,
                  focusedField === 'email' && styles.inputFocused
                ]}
                mode="outlined"
                outlineColor={focusedField === 'email' ? Colors.light.primary : Colors.light.border}
                activeOutlineColor={Colors.light.primary}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                keyboardType="email-address"
                left={<TextInput.Icon icon="email" iconColor={Colors.light.textSecondary} />}
              />
              
              <TextInput
                label="비밀번호 *"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                style={[
                  styles.input,
                  focusedField === 'password' && styles.inputFocused
                ]}
                mode="outlined"
                outlineColor={focusedField === 'password' ? Colors.light.primary : Colors.light.border}
                activeOutlineColor={Colors.light.primary}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry
                left={<TextInput.Icon icon="lock" iconColor={Colors.light.textSecondary} />}
              />
              
              <TextInput
                label="비밀번호 확인 *"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                style={[
                  styles.input,
                  focusedField === 'confirmPassword' && styles.inputFocused
                ]}
                mode="outlined"
                outlineColor={focusedField === 'confirmPassword' ? Colors.light.primary : Colors.light.border}
                activeOutlineColor={Colors.light.primary}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry
                left={<TextInput.Icon icon="lock-check" iconColor={Colors.light.textSecondary} />}
              />
              
              <TextInput
                label="휴대폰 번호"
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                style={[
                  styles.input,
                  focusedField === 'phone' && styles.inputFocused
                ]}
                mode="outlined"
                outlineColor={focusedField === 'phone' ? Colors.light.primary : Colors.light.border}
                activeOutlineColor={Colors.light.primary}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                keyboardType="phone-pad"
                placeholder="010-1234-5678"
                left={<TextInput.Icon icon="phone" iconColor={Colors.light.textSecondary} />}
              />
              
              <TextInput
                label="이전 거주지 (구까지)"
                value={formData.currentAddress}
                onChangeText={(value) => handleInputChange('currentAddress', value)}
                style={[
                  styles.input,
                  focusedField === 'currentAddress' && styles.inputFocused
                ]}
                mode="outlined"
                outlineColor={focusedField === 'currentAddress' ? Colors.light.primary : Colors.light.border}
                activeOutlineColor={Colors.light.primary}
                onFocus={() => setFocusedField('currentAddress')}
                onBlur={() => setFocusedField(null)}
                placeholder="예: 강남구, 서초구 등"
                left={<TextInput.Icon icon="map-marker" iconColor={Colors.light.textSecondary} />}
              />
            </View>

            {/* 약관 동의 */}
            <View style={styles.termsSection}>
              <Text style={styles.termsTitle}>약관 동의</Text>
              
              <View style={styles.termItem}>
                <Checkbox
                  status={formData.agreeTerms ? 'checked' : 'unchecked'}
                  onPress={() => handleInputChange('agreeTerms', !formData.agreeTerms)}
                  color={Colors.light.primary}
                />
                <View style={styles.termTextContainer}>
                  <Text style={styles.termText}>
                    <Text style={styles.termRequired}>[필수]</Text> 이용약관 및 개인정보처리방침에 동의합니다
                  </Text>
                  <Text style={styles.termLink}>자세히 보기</Text>
                </View>
              </View>
              
              <View style={styles.termItem}>
                <Checkbox
                  status={formData.agreeMarketing ? 'checked' : 'unchecked'}
                  onPress={() => handleInputChange('agreeMarketing', !formData.agreeMarketing)}
                  color={Colors.light.primary}
                />
                <View style={styles.termTextContainer}>
                  <Text style={styles.termText}>
                    [선택] 마케팅 정보 수신에 동의합니다
                  </Text>
                  <Text style={styles.termDescription}>
                    새로운 서비스 및 이벤트 정보를 받아보실 수 있습니다
                  </Text>
                </View>
              </View>
            </View>

            {/* 회원가입 버튼 */}
            <HanaButton
              title="회원가입 완료"
              onPress={handleRegister}
              variant="primary"
              size="large"
              loading={isLoading}
              disabled={isLoading || !formData.agreeTerms}
              style={styles.registerButton}
            />
          </HanaCard>

          {/* 추가 정보 */}
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              이미 계정이 있으신가요?{' '}
              <Text style={styles.loginLink} onPress={handleBackToLogin}>
                로그인하기
              </Text>
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    marginRight: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.textInverse,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.textInverse,
    marginBottom: 12,
  },
  brandSubtitle: {
    fontSize: 16,
    color: Colors.light.textInverse,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
  },
  formCard: {
    marginBottom: 30,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 20,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
  },
  inputFocused: {
    borderColor: Colors.light.primary,
  },
  termsSection: {
    marginBottom: 30,
  },
  termsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  termItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  termTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  termText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  termRequired: {
    color: Colors.light.error,
    fontWeight: '700',
  },
  termLink: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  termDescription: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  registerButton: {
    width: '100%',
  },
  infoSection: {
    alignItems: 'center',
  },
  infoText: {
    fontSize: 16,
    color: Colors.light.textInverse,
    textAlign: 'center',
  },
  loginLink: {
    color: Colors.light.textInverse,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

