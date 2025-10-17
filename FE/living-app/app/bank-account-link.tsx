import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { urlHelpers } from '@/src/config/environment';

interface BankAccount {
  accountNumber: string;
  accountName: string;
  accountType: string;
  balance: number;
  status: string;
}

interface LinkedBankAccount {
  id: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  status: string;
}

export default function BankAccountLink() {
  const { user } = useAuth();
  const [accountNumber, setAccountNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedBankAccount[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    loadLinkedAccounts();
    loadAvailableAccounts();
  }, []);

  const loadLinkedAccounts = async () => {
    try {
      if (!user?.id) return;

      const response = await fetch(`${urlHelpers.getCurrentApiUrl()}/api/bank-accounts?userId=${user.id}`);
      const data = await response.json();

      if (data.success) {
        setLinkedAccounts(data.data || []);
      }
    } catch (error) {
    }
  };

  const loadAvailableAccounts = async () => {
    try {
      if (!user?.userCi) {
        return;
      }

      // 하나원큐리빙 API를 통해 하나은행 계좌 조회
      const response = await fetch(`${urlHelpers.getCurrentApiUrl()}/api/bank-accounts/available?userCi=${user.userCi}`);
      const data = await response.json();

      if (data.success && data.data) {
        setAvailableAccounts(data.data);
      }
    } catch (error) {
    }
  };

  const handleLinkAccount = async () => {
    if (!accountNumber.trim()) {
      Alert.alert('오류', '계좌번호를 입력해주세요.');
      return;
    }

    if (!user?.id || !user?.userCi) {
      Alert.alert('오류', '로그인 정보가 없습니다. user.id: ' + user?.id + ', user.userCi: ' + user?.userCi);
      return;
    }

    setIsLoading(true);

    try {
      // 계좌 연동 요청 (URL 쿼리 파라미터 방식)
      const params = new URLSearchParams({
        userId: user.id.toString(),
        userCi: user.userCi,
        accountNumber: accountNumber.trim(),
      });

      const response = await fetch(`${urlHelpers.getCurrentApiUrl()}/api/bank-accounts/link?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        Alert.alert('오류', '서버 응답을 처리할 수 없습니다.\n응답: ' + responseText.substring(0, 100));
        return;
      }

      if (data.success) {
        Alert.alert('성공', '계좌 연동이 완료되었습니다.', [
          { text: '확인', onPress: () => {
            setAccountNumber('');
            loadLinkedAccounts();
          }}
        ]);
      } else {
        Alert.alert('연동 실패', data.message || '계좌 연동에 실패했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '네트워크 오류가 발생했습니다.\n' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlinkAccount = async (accountNumber: string) => {
    if (!user?.id) return;

    Alert.alert(
      '계좌 연동 해제',
      '정말로 이 계좌의 연동을 해제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '해제',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${urlHelpers.getCurrentApiUrl()}/api/bank-accounts/unlink`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  userId: user.id.toString(),
                  accountNumber: accountNumber,
                }),
              });

              const data = await response.json();

              if (data.success) {
                Alert.alert('성공', '계좌 연동이 해제되었습니다.');
                loadLinkedAccounts();
              } else {
                Alert.alert('실패', data.message || '연동 해제에 실패했습니다.');
              }
            } catch (error) {
              Alert.alert('오류', '네트워크 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'SAVINGS': return '예금계좌';
      case 'CHECKING': return '당좌계좌';
      default: return type;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>하나은행 계좌 연동</Text>
      </View>

      {/* 계좌 연동 섹션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>새 계좌 연동</Text>
        <Text style={styles.sectionDescription}>
          하나은행 계좌번호를 입력하여 연동하세요
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="계좌번호를 입력하세요 (예: 123-456789-01)"
            value={accountNumber}
            onChangeText={setAccountNumber}
            keyboardType="default"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.linkButton, isLoading && styles.disabledButton]}
          onPress={handleLinkAccount}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.light.background} />
          ) : (
            <Text style={styles.linkButtonText}>계좌 연동하기</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 사용 가능한 계좌 목록 */}
      {availableAccounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>보유 계좌 목록</Text>
          <Text style={styles.sectionDescription}>
            하나은행에서 조회된 계좌 목록입니다
          </Text>

          {availableAccounts.map((account, index) => (
            <View key={index} style={styles.accountCard}>
              <View style={styles.accountInfo}>
                <Text style={styles.accountNumber}>{account.accountNumber}</Text>
                <Text style={styles.accountName}>{account.accountName}</Text>
                <Text style={styles.accountType}>{getAccountTypeLabel(account.accountType)}</Text>
              </View>
              <View style={styles.accountBalance}>
                <Text style={styles.balanceText}>
                  {account.balance.toLocaleString()}원
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 연동된 계좌 목록 */}
      {linkedAccounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>연동된 계좌</Text>
          <Text style={styles.sectionDescription}>
            현재 연동되어 있는 하나은행 계좌입니다
          </Text>

          {linkedAccounts.map((account) => (
            <View key={account.id} style={styles.linkedAccountCard}>
              <View style={styles.accountInfo}>
                <Text style={styles.accountNumber}>{account.accountNumber}</Text>
                <Text style={styles.accountName}>{account.accountName}</Text>
                <Text style={styles.accountType}>{getAccountTypeLabel(account.accountType)}</Text>
              </View>
              <TouchableOpacity
                style={styles.unlinkButton}
                onPress={() => handleUnlinkAccount(account.accountNumber)}
              >
                <Text style={styles.unlinkButtonText}>연동 해제</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  section: {
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: Colors.light.surface,
  },
  linkButton: {
    backgroundColor: Colors.light.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  linkButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  accountCard: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  linkedAccountCard: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  accountInfo: {
    flex: 1,
  },
  accountNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  accountName: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 2,
  },
  accountType: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  accountBalance: {
    justifyContent: 'center',
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  unlinkButton: {
    backgroundColor: Colors.light.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
  },
  unlinkButtonText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 40,
  },
});