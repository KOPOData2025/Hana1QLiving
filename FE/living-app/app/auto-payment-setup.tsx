import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Button, Card, TextInput, Chip, RadioButton, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HanaHeader } from '@/components/HanaHeader';
import { HanaCard } from '@/components/HanaCard';
import { HanaButton } from '@/components/HanaButton';
import { Colors } from '@/constants/Colors';
import { mobileApi, contractAPI } from '@/services/mobileApi';
import { useAuth } from '@/contexts/AuthContext';

interface LinkedAccount {
  id: number;
  accountNumber: string;
  bankName: string;
  accountName: string;
  balance: number;
  isLinked: boolean;
}

interface Contract {
  id: number;
  buildingName: string;
  unitNumber: string;
  monthlyRent: number;
  paymentDay?: number;
  status: string;
}

export default function AutoPaymentSetupScreen() {
  const { user } = useAuth();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedContract, setSelectedContract] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [transferDay, setTransferDay] = useState<string>('25');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    setInitialLoading(true);
    await Promise.all([
      fetchLinkedAccounts(),
      fetchContracts()
    ]);
    setInitialLoading(false);
  };

  const fetchLinkedAccounts = async () => {
    try {
      if (!user?.id) {
        return;
      }

      const response = await mobileApi.getMyAccounts(user.id);
      if (response?.success && response.bankAccounts) {
        // MyAccountsResponseDto 형태의 응답을 LinkedAccount 형태로 변환
        const accounts = response.bankAccounts.map((account: any) => ({
          id: account.accountNumber, // ID 대신 계좌번호 사용
          accountNumber: account.accountNumber,
          bankName: account.bankName || '하나은행',
          accountName: account.accountName,
          balance: account.balance || 0,
          isLinked: true
        }));
        setLinkedAccounts(accounts);

        // 첫 번째 계좌를 기본 선택
        if (accounts.length > 0) {
          setSelectedAccount(accounts[0].accountNumber);
        }
      }
    } catch (error) {
      Alert.alert('오류', '연결된 계좌 정보를 불러올 수 없습니다.');
    }
  };

  const handleContractSelect = (contractId: number) => {
    const selectedContractData = contracts.find(contract => contract.id === contractId);
    if (selectedContractData) {
      setSelectedContract(contractId);
      setPaymentAmount(selectedContractData.monthlyRent.toString());
      // 계약의 paymentDay가 있으면 사용, 없으면 기본값 25일
      if (selectedContractData.paymentDay) {
        setTransferDay(selectedContractData.paymentDay.toString());
      }
    }
  };

  const fetchContracts = async () => {
    try {
      if (!user?.id) {
        return;
      }

      const response = await contractAPI.getByUserId(user.id);

      if (response?.success || Array.isArray(response)) {
        const contractsData = response?.data || response || [];

        const activeContracts = contractsData.filter((contract: Contract) =>
          contract.status === 'ACTIVE'
        );
        setContracts(activeContracts);

        if (activeContracts.length > 0) {
          const firstContract = activeContracts[0];
          setSelectedContract(firstContract.id);
          setPaymentAmount(firstContract.monthlyRent.toString());
          if (firstContract.paymentDay) {
            setTransferDay(firstContract.paymentDay.toString());
          }
        }
      }
    } catch (error) {
      Alert.alert('오류', '계약 정보를 불러올 수 없습니다.');
    }
  };

  const handleSetupAutoPayment = async () => {
    if (!selectedAccount) {
      Alert.alert('알림', '출금할 계좌를 선택해주세요.');
      return;
    }

    if (!selectedContract) {
      Alert.alert('알림', '적용할 계약을 선택해주세요.');
      return;
    }

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      Alert.alert('알림', '올바른 이체 금액을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      const setupData = {
        contractId: selectedContract,
        fromAccount: selectedAccount,
        amount: parseFloat(paymentAmount),
        transferDay: parseInt(transferDay)
      };

      const response = await mobileApi.setupAutoPayment(setupData);

      if (response?.success) {
        Alert.alert(
          '설정 완료',
          '자동이체가 성공적으로 설정되었습니다.',
          [
            {
              text: '확인',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        Alert.alert('오류', response?.message || '자동이체 설정에 실패했습니다.');
      }
    } catch (error: any) {
      Alert.alert('오류', error.response?.data?.message || '자동이체 설정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  if (initialLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <HanaHeader
          title="자동이체 설정"
          showBack={true}
          onBackPress={() => router.back()}
          variant="gray"
        />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>정보를 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <HanaHeader
        title="자동이체 설정"
        showBack={true}
        onBackPress={() => router.back()}
        variant="gray"
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 계약 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>적용할 계약</Text>
          {contracts.map((contract) => (
            <Card
              key={contract.id}
              style={[
                styles.contractCard,
                selectedContract === contract.id && styles.selectedContractCard
              ]}
            >
              <TouchableOpacity
                style={styles.contractCardContent}
                onPress={() => handleContractSelect(contract.id)}
              >
                <RadioButton
                  value={contract.id.toString()}
                  status={selectedContract === contract.id ? 'checked' : 'unchecked'}
                  onPress={() => handleContractSelect(contract.id)}
                />
                <View style={styles.contractInfo}>
                  <Text style={styles.buildingName}>{contract.buildingName}</Text>
                  <Text style={styles.monthlyRent}>월세: {formatCurrency(contract.monthlyRent)}</Text>
                </View>
              </TouchableOpacity>
            </Card>
          ))}
        </View>

        {/* 출금 계좌 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>출금 계좌</Text>
          {linkedAccounts.length === 0 ? (
            <View style={styles.noAccountContainer}>
              <Text style={styles.noAccountText}>연결된 계좌가 없습니다.</Text>
              <Button 
                mode="outlined" 
                onPress={() => router.push('/bank-account-link')}
                style={styles.linkAccountButton}
              >
                계좌 연결하기
              </Button>
            </View>
          ) : (
            linkedAccounts.map((account) => (
              <Card
                key={account.id}
                style={[
                  styles.accountCard,
                  selectedAccount === account.accountNumber && styles.selectedAccountCard
                ]}
              >
                <TouchableOpacity
                  style={styles.accountCardContent}
                  onPress={() => setSelectedAccount(account.accountNumber)}
                >
                  <RadioButton
                    value={account.accountNumber}
                    status={selectedAccount === account.accountNumber ? 'checked' : 'unchecked'}
                    onPress={() => setSelectedAccount(account.accountNumber)}
                  />
                  <View style={styles.accountInfo}>
                    <View style={styles.accountHeader}>
                      <Text style={styles.bankName}>{account.bankName}</Text>
                      <Text style={styles.balance}>{formatCurrency(account.balance)}</Text>
                    </View>
                    <Text style={styles.accountNumber}>{account.accountNumber}</Text>
                    <Text style={styles.accountName}>{account.accountName}</Text>
                  </View>
                </TouchableOpacity>
              </Card>
            ))
          )}
        </View>

        {/* 이체 금액 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이체 금액</Text>
          <TextInput
            label="이체 금액"
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            keyboardType="numeric"
            mode="outlined"
            right={<TextInput.Affix text="원" />}
            style={styles.amountInput}
          />
          <Text style={styles.helperText}>
            하나원큐리빙에서 매월 설정된 날짜에 자동으로 월세를 이체합니다.
          </Text>
        </View>

        {/* 이체일 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>매월 이체일</Text>
          <TextInput
            label="이체일"
            value={transferDay}
            onChangeText={(text) => {
              // 1-31 범위만 허용
              const num = parseInt(text);
              if (text === '' || (!isNaN(num) && num >= 1 && num <= 31)) {
                setTransferDay(text);
              }
            }}
            keyboardType="numeric"
            mode="outlined"
            maxLength={2}
            right={<TextInput.Affix text="일" />}
            style={styles.transferDayInput}
            placeholder="1-31일 입력"
          />
          <Text style={styles.helperText}>
            하나원큐리빙에서 매월 설정한 날짜에 자동으로 월세를 이체합니다. (1일 ~ 31일)
          </Text>
        </View>


        {/* 설정 요약 */}
        {selectedAccount && selectedContract && paymentAmount && (
          <View style={[styles.section, styles.summaryCard]}>
            <Text style={styles.summaryTitle}>설정 요약</Text>
            <Divider style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>출금 계좌:</Text>
              <Text style={styles.summaryValue}>
                {linkedAccounts.find(acc => acc.accountNumber === selectedAccount)?.bankName} {selectedAccount}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>이체 금액:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(parseFloat(paymentAmount))}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>이체일:</Text>
              <Text style={styles.summaryValue}>매월 {transferDay}일</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>적용 계약:</Text>
              <Text style={styles.summaryValue}>
                {contracts.find(c => c.id === selectedContract)?.buildingName} {contracts.find(c => c.id === selectedContract)?.unitNumber}
              </Text>
            </View>
          </View>
        )}

        {/* 주의사항 */}
        <View style={styles.section}>
          <Text style={styles.helpTitle}>주의사항</Text>
          <Text style={styles.helpItem}>· 하나원큐리빙에서 매월 설정된 날짜에 자동으로 월세를 이체합니다.</Text>
          <Text style={styles.helpItem}>· 출금 계좌의 잔액이 부족한 경우 이체가 실패할 수 있습니다.</Text>
          <Text style={styles.helpItem}>· 자동이체는 언제든지 해지하거나 수정할 수 있습니다.</Text>
          <Text style={styles.helpItem}>· 이체 실패 시 알림을 받을 수 있습니다.</Text>
          <Text style={styles.helpItem}>· 별도의 은행 방문이나 추가 절차 없이 원큐리빙 앱에서 바로 관리됩니다.</Text>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <HanaButton
          title={loading ? "설정 중..." : "자동이체 설정하기"}
          onPress={handleSetupAutoPayment}
          disabled={!selectedAccount || !selectedContract || !paymentAmount || loading}
          loading={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  contractCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#f5f7fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedContractCard: {
    borderColor: Colors.light.primary,
    borderWidth: 2,
    backgroundColor: 'white',
  },
  contractCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  contractInfo: {
    flex: 1,
    marginLeft: 8,
  },
  buildingName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  unitNumber: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  monthlyRent: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
    marginTop: 4,
  },
  noAccountContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noAccountText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  linkAccountButton: {
    borderColor: Colors.primary,
  },
  accountCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#f5f7fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedAccountCard: {
    borderColor: Colors.light.primary,
    borderWidth: 2,
    backgroundColor: 'white',
  },
  accountCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  accountInfo: {
    flex: 1,
    marginLeft: 8,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bankName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  accountNumber: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  accountName: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  balance: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
    marginTop: 4,
  },
  amountInput: {
    marginBottom: 8,
    backgroundColor: 'white',
  },
  helperText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  transferDayInput: {
    marginBottom: 8,
    width: 150,
    backgroundColor: 'white',
  },
  summaryCard: {
    backgroundColor: '#f5f7fa',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
  },
  helpItem: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  divider: {
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    flex: 1,
    textAlign: 'right',
  },
  bottomContainer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});