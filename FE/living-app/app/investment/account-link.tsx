import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import api from '../../services/api';

export default function AccountLinkScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    accountNumber: '',
    accountPassword: '',
    userName: '',
    phoneNumber: '',
    birthDate: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatAccountNumber = (text: string) => {
    // 계좌번호 포맷: XXX-XXXXXX-XX
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 9) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 9)}-${numbers.slice(9, 11)}`;
    }
  };

  const formatPhoneNumber = (text: string) => {
    // 전화번호 포맷: XXX-XXXX-XXXX
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const formatBirthDate = (text: string) => {
    // 생년월일 포맷: YYYY-MM-DD
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 4) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    } else {
      return `${numbers.slice(0, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6, 8)}`;
    }
  };

  const validateForm = () => {
    if (!formData.accountNumber || formData.accountNumber.length < 12) {
      Alert.alert('오류', '올바른 계좌번호를 입력해주세요.');
      return false;
    }
    if (!formData.accountPassword || formData.accountPassword.length < 4) {
      Alert.alert('오류', '계좌 비밀번호는 4자리 이상이어야 합니다.');
      return false;
    }
    if (!formData.userName.trim()) {
      Alert.alert('오류', '성명을 입력해주세요.');
      return false;
    }
    if (!formData.phoneNumber || formData.phoneNumber.length < 12) {
      Alert.alert('오류', '올바른 휴대폰 번호를 입력해주세요.');
      return false;
    }
    if (!formData.birthDate || formData.birthDate.length !== 10) {
      Alert.alert('오류', '올바른 생년월일을 입력해주세요.');
      return false;
    }
    return true;
  };

  const handleAccountLink = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await api.post('/securities-accounts/link', {
        accountNumber: formData.accountNumber.replace(/\D/g, ''),
        accountPassword: formData.accountPassword,
        userName: formData.userName,
        phoneNumber: formData.phoneNumber.replace(/\D/g, ''),
        birthDate: formData.birthDate.replace(/\D/g, ''),
      });

      if (response.data.success) {
        Alert.alert(
          '연동 완료',
          `${response.data.accountName}\n계좌가 성공적으로 연동되었습니다.\n잔액: ${response.data.balance?.toLocaleString()}원`,
          [
            {
              text: '확인',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('연동 실패', response.data.message);
      }
    } catch (error: any) {
      Alert.alert('오류', '계좌 연동 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>증권계좌 연동</Text>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.infoCard}>
            <MaterialIcons name="security" size={28} color={Colors.light.primary} />
            <Text style={styles.infoTitle}>안전한 계좌 연동</Text>
            <Text style={styles.infoText}>
              하나증권과의 안전한 API 연동을 통해{'\n'}
              투자 서비스를 이용하실 수 있습니다.
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>계좌번호</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="account-balance" size={20} color={Colors.light.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="123-456789-01"
                  placeholderTextColor={Colors.light.textTertiary}
                  value={formData.accountNumber}
                  onChangeText={(text) => 
                    handleInputChange('accountNumber', formatAccountNumber(text))
                  }
                  keyboardType="numeric"
                  maxLength={13}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>계좌 비밀번호</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="lock" size={20} color={Colors.light.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="4자리 숫자"
                  placeholderTextColor={Colors.light.textTertiary}
                  value={formData.accountPassword}
                  onChangeText={(text) => 
                    handleInputChange('accountPassword', text.replace(/\D/g, ''))
                  }
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>성명</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="person" size={20} color={Colors.light.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="홍길동"
                  placeholderTextColor={Colors.light.textTertiary}
                  value={formData.userName}
                  onChangeText={(text) => handleInputChange('userName', text)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>휴대폰 번호</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="phone" size={20} color={Colors.light.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="010-1234-5678"
                  placeholderTextColor={Colors.light.textTertiary}
                  value={formData.phoneNumber}
                  onChangeText={(text) => 
                    handleInputChange('phoneNumber', formatPhoneNumber(text))
                  }
                  keyboardType="numeric"
                  maxLength={13}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>생년월일</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="calendar-today" size={20} color={Colors.light.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="1990-01-01"
                  placeholderTextColor={Colors.light.textTertiary}
                  value={formData.birthDate}
                  onChangeText={(text) => 
                    handleInputChange('birthDate', formatBirthDate(text))
                  }
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>
          </View>

          <View style={styles.securityNote}>
            <MaterialIcons name="security" size={16} color={Colors.light.textSecondary} />
            <Text style={styles.securityText}>
              입력하신 정보는 암호화되어 안전하게 처리됩니다.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.linkButton, loading && styles.linkButtonDisabled]}
            onPress={handleAccountLink}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.light.background} />
            ) : (
              <>
                <MaterialIcons name="link" size={20} color={Colors.light.background} style={styles.buttonIcon} />
                <Text style={styles.linkButtonText}>계좌 연동하기</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.helpCard}>
            <View style={styles.helpHeader}>
              <MaterialIcons name="help-outline" size={20} color={Colors.light.primary} />
              <Text style={styles.helpTitle}>도움말</Text>
            </View>
            <Text style={styles.helpText}>
              • 하나증권 계좌만 연동 가능합니다{'\n'}
              • 계좌 비밀번호는 숫자 4-6자리입니다{'\n'}
              • 연동 후 실시간 투자가 가능합니다{'\n'}
              • 계좌 정보는 언제든 해제할 수 있습니다
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: Colors.light.background,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: Colors.light.background,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: Colors.light.text,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  securityText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginLeft: 8,
  },
  linkButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  linkButtonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  linkButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  helpCard: {
    backgroundColor: Colors.light.background,
    padding: 20,
    borderRadius: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: 8,
  },
  helpText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
});