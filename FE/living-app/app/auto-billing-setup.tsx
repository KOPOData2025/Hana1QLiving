import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Alert, Platform } from 'react-native';
import { Text, Card, Button, TextInput, Chip, Modal, Portal, List, Surface } from 'react-native-paper';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HanaHeader } from '@/components/HanaHeader';
import { HanaCard } from '@/components/HanaCard';
import { HanaButton } from '@/components/HanaButton';
import { Colors } from '@/constants/Colors';
import { mobileApi } from '@/services/mobileApi';
import { contractAPI, Contract } from '@/services/contractAPI';
import { urlHelpers } from '@/src/config/environment';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Account {
  id: number;
  accountNumber: string;
  accountName: string;
  accountNickname?: string;
  bankName: string;
  balance?: number;
}


export default function AutoBillingSetupScreen() {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [billingDay, setBillingDay] = useState('25');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadAccounts(), loadContracts()]);
    } catch (error) {
      Alert.alert('오류', '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await mobileApi.getMyAccounts();
      if (response?.success && Array.isArray(response.data)) {
        setAccounts(response.data);
        if (response.data.length === 1) {
          setSelectedAccount(response.data[0]);
        }
      }
    } catch (error) {
    }
  };

  const loadContracts = async () => {
    try {
      const response = await contractAPI.getByUserId(1);
      if (response?.success && Array.isArray(response.data)) {
        setContracts(response.data);
        if (response.data.length === 1) {
          const firstContract = response.data[0];
          setSelectedContract(firstContract);
          if (firstContract.paymentDay) {
            setBillingDay(firstContract.paymentDay.toString());
          }
        }
      }
    } catch (error) {
    }
  };

  const handleSubmit = async () => {
    if (!selectedAccount) {
      Alert.alert('오류', '출금 계좌를 선택해주세요.');
      return;
    }

    if (!selectedContract) {
      Alert.alert('오류', '계약을 선택해주세요.');
      return;
    }

    const day = parseInt(billingDay);
    if (isNaN(day) || day < 1 || day > 31) {
      Alert.alert('오류', '유효한 납부일을 입력해주세요. (1-31일)');
      return;
    }

    try {
      setLoading(true);

      const setupData = {
        contractId: selectedContract.id,
        fromAccount: selectedAccount.accountNumber,
        billingDay: day,
      };

      const response = await fetch(`${urlHelpers.getCurrentApiUrl()}/api/auto-billing/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(setupData),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          '설정 완료',
          '자동납부가 성공적으로 설정되었습니다.',
          [
            {
              text: '확인',
              onPress: () => router.replace('/auto-billing-manage')
            }
          ]
        );
      } else {
        Alert.alert('오류', result.message || '자동납부 설정에 실패했습니다.');
      }
    } catch (error: any) {
      Alert.alert('오류', '자동납부 설정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <HanaHeader 
        title="자동납부 설정" 
        showBack={true}
        onBackPress={() => router.back()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 안내 메시지 */}
        <HanaCard style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Icon name="information" size={24} color={Colors.primary} />
            <Text style={styles.infoTitle}>자동납부란?</Text>
          </View>
          <Text style={styles.infoText}>
            매월 관리비, 공과금 등의 청구서가 자동으로 납부되는 서비스입니다.
            {'\n'}설정한 날짜에 자동으로 납부되어 편리합니다.
          </Text>
        </HanaCard>

        {/* 🏢 계약 정보 */}
        <HanaCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🏢</Text>
            <Text style={styles.sectionTitle}>계약 정보</Text>
          </View>

          <Surface style={styles.selectionCard} elevation={1}>
            <Button
              mode="outlined"
              onPress={() => setShowContractModal(true)}
              style={styles.selectionButton}
              contentStyle={styles.selectionButtonContent}
            >
              {selectedContract ? (
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedTitle}>
                    {selectedContract.buildingName} {selectedContract.unitNumber}
                  </Text>
                  <Text style={styles.selectedSubtitle}>
                    월세: {formatCurrency(selectedContract.monthlyRent)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.placeholderText}>계약을 선택해주세요</Text>
              )}
            </Button>
          </Surface>
        </HanaCard>

        {/* 💳 출금 계좌 */}
        <HanaCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>💳</Text>
            <Text style={styles.sectionTitle}>출금 계좌</Text>
          </View>

          <Surface style={styles.selectionCard} elevation={1}>
            <Button
              mode="outlined"
              onPress={() => setShowAccountModal(true)}
              style={styles.selectionButton}
              contentStyle={styles.selectionButtonContent}
            >
              {selectedAccount ? (
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedTitle}>
                    {selectedAccount.bankName} {selectedAccount.accountName}
                  </Text>
                  <Text style={styles.selectedSubtitle}>
                    {selectedAccount.accountNumber}
                  </Text>
                  {selectedAccount.balance !== undefined && (
                    <Text style={styles.balanceText}>
                      잔액: {formatCurrency(selectedAccount.balance)}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.placeholderText}>출금 계좌를 선택해주세요</Text>
              )}
            </Button>
          </Surface>
        </HanaCard>

        {/* 📅 납부 설정 */}
        <HanaCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📅</Text>
            <Text style={styles.sectionTitle}>납부 설정</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>매월 납부일</Text>
            <TextInput
              value={billingDay}
              onChangeText={setBillingDay}
              keyboardType="numeric"
              maxLength={2}
              style={styles.dayInput}
              mode="outlined"
              right={<TextInput.Affix text="일" />}
            />
            <Text style={styles.inputHint}>
              1일부터 31일까지 설정 가능합니다
            </Text>
          </View>
        </HanaCard>

        {/* 주의사항 */}
        <HanaCard style={styles.section}>
          <View style={styles.warningHeader}>
            <Icon name="alert-circle" size={20} color="#f57c00" />
            <Text style={styles.warningTitle}>주의사항</Text>
          </View>
          <View style={styles.warningList}>
            <Text style={styles.warningItem}>• 매월 설정한 날짜에 자동으로 납부됩니다</Text>
            <Text style={styles.warningItem}>• 계좌 잔액이 부족할 경우 납부가 실패할 수 있습니다</Text>
            <Text style={styles.warningItem}>• 자동납부는 언제든지 해지할 수 있습니다</Text>
            <Text style={styles.warningItem}>• 금액은 매월 청구서에 따라 달라집니다</Text>
          </View>
        </HanaCard>

        {/* 설정 버튼 */}
        <View style={styles.buttonContainer}>
          <HanaButton
            title="자동납부 설정"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !selectedAccount || !selectedContract}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>

      {/* 계약 선택 모달 */}
      <Portal>
        <Modal 
          visible={showContractModal} 
          onDismiss={() => setShowContractModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>계약 선택</Text>
          {contracts.map((contract) => (
            <List.Item
              key={contract.id}
              title={`${contract.buildingName} ${contract.unitNumber}`}
              description={`월세: ${formatCurrency(contract.monthlyRent)}`}
              left={() => <Icon name="home" size={24} color={Colors.primary} />}
              onPress={() => {
                setSelectedContract(contract);
                if (contract.paymentDay) {
                  setBillingDay(contract.paymentDay.toString());
                }
                setShowContractModal(false);
              }}
              style={styles.modalItem}
            />
          ))}
        </Modal>
      </Portal>

      {/* 계좌 선택 모달 */}
      <Portal>
        <Modal 
          visible={showAccountModal} 
          onDismiss={() => setShowAccountModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>출금 계좌 선택</Text>
          {accounts.map((account) => (
            <List.Item
              key={account.id}
              title={`${account.bankName} ${account.accountName}`}
              description={account.accountNumber}
              left={() => <Icon name="bank" size={24} color={Colors.primary} />}
              right={() => account.balance !== undefined && (
                <Text style={styles.balanceText}>
                  {formatCurrency(account.balance)}
                </Text>
              )}
              onPress={() => {
                setSelectedAccount(account);
                setShowAccountModal(false);
              }}
              style={styles.modalItem}
            />
          ))}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1565c0',
    lineHeight: 20,
  },
  section: {
    marginBottom: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  selectionCard: {
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  selectionButton: {
    borderRadius: 8,
    borderColor: '#e0e0e0',
    backgroundColor: 'transparent',
  },
  selectionButtonContent: {
    paddingVertical: 16,
    justifyContent: 'flex-start',
  },
  selectedInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  selectedSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  balanceText: {
    fontSize: 12,
    color: Colors.success,
    marginTop: 2,
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'left',
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 8,
  },
  dayInput: {
    width: 100,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f57c00',
    marginLeft: 6,
  },
  warningList: {
    gap: 6,
  },
  warningItem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  buttonContainer: {
    padding: 16,
    paddingTop: 0,
  },
  submitButton: {
    marginTop: 16,
  },
  modal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
});