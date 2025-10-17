import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HanaHeader } from '@/components/HanaHeader';
import { HanaCard } from '@/components/HanaCard';
import { HanaButton } from '@/components/HanaButton';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { loanExecutionAPI } from '@/services/api';
import { IconButton } from 'react-native-paper';

interface LoanExecutionInfo {
  loanId: number;
  executionStatus: string;
  desiredExecutionDate?: string;
  actualExecutionDate?: string;
  loanAmount: number;
  landlordAccountNumber?: string;
  landlordBankCode?: string;
  landlordAccountHolder?: string;
  transactionId?: string;
  executionResultMessage?: string;
  canExecute: boolean;
  contractFilePath?: string;
}

const BANK_CODES = {
  '088': '신한은행',
  '004': 'KB국민은행',
  '011': 'NH농협은행',
  '020': '우리은행',
  '081': 'KEB하나은행',
  '003': '기업은행',
  '023': 'SC제일은행',
  '027': '씨티은행',
  '045': '새마을금고',
  '071': '우체국',
};

export default function LoanExecutionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const loanId = params.loanId as string;
  const loanAmount = Number(params.loanAmount);
  const loanType = params.loanType as string;
  
  // 상태 관리
  const [executionInfo, setExecutionInfo] = useState<LoanExecutionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [executing, setExecuting] = useState(false);
  
  // 폼 데이터
  const [desiredDate, setDesiredDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [landlordAccount, setLandlordAccount] = useState('');
  const [bankCode, setBankCode] = useState('088');
  const [accountHolder, setAccountHolder] = useState('');
  const [contractFile, setContractFile] = useState('');

  // 대출 실행 정보 조회
  const fetchExecutionInfo = async () => {
    try {
      setLoading(true);
      
      const response = await loanExecutionAPI.getExecutionInfo(
        loanId, 
        user?.id?.toString() || '0'
      );
      
      if (response.data.success) {
        const executionData = response.data.data;
        setExecutionInfo(executionData);
        
        // 기존 데이터로 폼 초기화
        if (executionData.desiredExecutionDate) {
          setDesiredDate(new Date(executionData.desiredExecutionDate));
        }
        if (executionData.landlordAccountNumber) {
          setLandlordAccount(executionData.landlordAccountNumber);
        }
        if (executionData.landlordBankCode) {
          setBankCode(executionData.landlordBankCode);
        }
        if (executionData.landlordAccountHolder) {
          setAccountHolder(executionData.landlordAccountHolder);
        }
        if (executionData.contractFilePath) {
          setContractFile(executionData.contractFilePath);
        }
      } else {
        Alert.alert('오류', response.data.message);
      }
    } catch (error) {
      Alert.alert('오류', '대출 실행 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loanId && user?.id) {
      fetchExecutionInfo();
    }
  }, [loanId, user?.id]);

  // 실행 정보 설정
  const handleSetExecutionInfo = async () => {
    if (!landlordAccount || !accountHolder) {
      Alert.alert('알림', '집주인 계좌 정보를 모두 입력해주세요.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(desiredDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      Alert.alert('알림', '희망 실행일은 오늘 이후로 선택해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      
      const requestData = {
        desiredExecutionDate: desiredDate.toISOString().split('T')[0],
        landlordAccountNumber: landlordAccount,
        landlordBankCode: bankCode,
        landlordAccountHolder: accountHolder,
        contractFilePath: contractFile || ''
      };
      
      const response = await loanExecutionAPI.setExecutionInfo(
        loanId,
        user?.id?.toString() || '0',
        requestData
      );
      
      if (response.data.success) {
        Alert.alert('완료', '대출 실행 정보가 설정되었습니다.', [
          { text: '확인', onPress: () => fetchExecutionInfo() }
        ]);
      } else {
        Alert.alert('오류', response.data.message);
      }
    } catch (error) {
      Alert.alert('오류', '대출 실행 정보 설정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 대출 실행
  const handleExecuteLoan = async () => {
    Alert.alert(
      '대출 실행 확인',
      `${loanAmount.toLocaleString()}원을 집주인 계좌로 송금하시겠습니까?\n\n집주인: ${accountHolder}\n계좌: ${BANK_CODES[bankCode as keyof typeof BANK_CODES]} ${landlordAccount}`,
      [
        { text: '취소', style: 'cancel' },
        { text: '실행', style: 'destructive', onPress: executeLoan }
      ]
    );
  };

  const executeLoan = async () => {
    try {
      setExecuting(true);
      
      const response = await loanExecutionAPI.executeLoan(
        loanId,
        user?.id?.toString() || '0'
      );
      
      if (response.data.success) {
        Alert.alert('대출 실행 완료', '대출이 성공적으로 실행되었습니다.', [
          { text: '확인', onPress: () => {
            fetchExecutionInfo();
          }}
        ]);
      } else {
        Alert.alert('대출 실행 실패', response.data.message);
      }
    } catch (error) {
      Alert.alert('오류', '대출 실행 중 오류가 발생했습니다.');
    } finally {
      setExecuting(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDesiredDate(selectedDate);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#FFA500';
      case 'READY': return '#00C851';
      case 'EXECUTED': return Colors.light.success;
      case 'FAILED': return Colors.light.error;
      default: return Colors.light.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return '대기 중';
      case 'READY': return '실행 가능';
      case 'EXECUTED': return '실행 완료';
      case 'FAILED': return '실행 실패';
      default: return '알 수 없음';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>대출 정보를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <HanaHeader
        title="대출 실행"
        subtitle={`${loanType} 대출 실행 관리`}
        showBack
        onBackPress={() => router.back()}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 대출 정보 카드 */}
        <HanaCard variant="elevated" style={styles.loanInfoCard}>
          <Text style={styles.sectionTitle}>대출 정보</Text>
          <View style={styles.loanInfoRow}>
            <Text style={styles.loanInfoLabel}>대출 종류:</Text>
            <Text style={styles.loanInfoValue}>{loanType} 대출</Text>
          </View>
          <View style={styles.loanInfoRow}>
            <Text style={styles.loanInfoLabel}>대출 금액:</Text>
            <Text style={styles.loanInfoValue}>{loanAmount.toLocaleString()}원</Text>
          </View>
          <View style={styles.loanInfoRow}>
            <Text style={styles.loanInfoLabel}>실행 상태:</Text>
            <Text style={[styles.loanInfoValue, { 
              color: getStatusColor(executionInfo?.executionStatus || 'PENDING') 
            }]}>
              {getStatusText(executionInfo?.executionStatus || 'PENDING')}
            </Text>
          </View>
          
          {executionInfo?.actualExecutionDate && (
            <View style={styles.loanInfoRow}>
              <Text style={styles.loanInfoLabel}>실행일시:</Text>
              <Text style={styles.loanInfoValue}>{executionInfo.actualExecutionDate}</Text>
            </View>
          )}
          
          {executionInfo?.transactionId && (
            <View style={styles.loanInfoRow}>
              <Text style={styles.loanInfoLabel}>거래번호:</Text>
              <Text style={styles.loanInfoValue}>{executionInfo.transactionId}</Text>
            </View>
          )}
        </HanaCard>

        {/* 실행 완료된 경우 결과 표시 */}
        {executionInfo?.executionStatus === 'EXECUTED' && (
          <HanaCard variant="elevated" style={styles.resultCard}>
            <Text style={styles.sectionTitle}>실행 결과</Text>
            <View style={styles.successContainer}>
              <IconButton icon="check-circle" size={48} iconColor={Colors.light.success} />
              <Text style={styles.successText}>대출이 성공적으로 실행되었습니다</Text>
              <Text style={styles.successMessage}>
                {executionInfo.executionResultMessage}
              </Text>
            </View>
          </HanaCard>
        )}

        {/* 실행 실패한 경우 결과 표시 */}
        {executionInfo?.executionStatus === 'FAILED' && (
          <HanaCard variant="elevated" style={styles.resultCard}>
            <Text style={styles.sectionTitle}>실행 결과</Text>
            <View style={styles.failureContainer}>
              <IconButton icon="alert-circle" size={48} iconColor={Colors.light.error} />
              <Text style={styles.failureText}>대출 실행에 실패했습니다</Text>
              <Text style={styles.failureMessage}>
                {executionInfo.executionResultMessage}
              </Text>
            </View>
          </HanaCard>
        )}

        {/* 실행 설정 카드 (PENDING 또는 READY 상태일 때) */}
        {(!executionInfo?.executionStatus || 
          executionInfo.executionStatus === 'PENDING' || 
          executionInfo.executionStatus === 'READY') && (
          <HanaCard variant="elevated" style={styles.formCard}>
            <Text style={styles.sectionTitle}>대출 실행 설정</Text>
            
            {/* 희망 실행일 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>희망 실행일</Text>
              <View style={styles.dateContainer}>
                <Text style={styles.dateText}>
                  {desiredDate.toLocaleDateString('ko-KR')}
                </Text>
                <View style={styles.dateButtons}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setDesiredDate(tomorrow);
                    }}
                  >
                    <Text style={styles.dateButtonText}>내일</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      const nextWeek = new Date();
                      nextWeek.setDate(nextWeek.getDate() + 7);
                      setDesiredDate(nextWeek);
                    }}
                  >
                    <Text style={styles.dateButtonText}>다음주</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 집주인 은행 선택 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>집주인 은행</Text>
              <View style={styles.bankSelectContainer}>
                {Object.entries(BANK_CODES).map(([code, name]) => (
                  <TouchableOpacity
                    key={code}
                    style={[
                      styles.bankOption,
                      bankCode === code && styles.bankOptionSelected
                    ]}
                    onPress={() => setBankCode(code)}
                  >
                    <Text style={[
                      styles.bankOptionText,
                      bankCode === code && styles.bankOptionTextSelected
                    ]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 집주인 계좌번호 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>집주인 계좌번호</Text>
              <TextInput
                style={styles.textInput}
                value={landlordAccount}
                onChangeText={setLandlordAccount}
                placeholder="계좌번호를 입력하세요 (하이픈 제외)"
                keyboardType="numeric"
                maxLength={20}
              />
            </View>

            {/* 집주인 예금주명 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>예금주명</Text>
              <TextInput
                style={styles.textInput}
                value={accountHolder}
                onChangeText={setAccountHolder}
                placeholder="예금주명을 입력하세요"
                maxLength={20}
              />
            </View>

            {/* 버튼들 */}
            <View style={styles.buttonContainer}>
              {(!executionInfo?.desiredExecutionDate || 
                executionInfo.executionStatus === 'PENDING') && (
                <HanaButton
                  title="실행 정보 설정"
                  onPress={handleSetExecutionInfo}
                  loading={submitting}
                  style={styles.setInfoButton}
                />
              )}
              
              {executionInfo?.canExecute && executionInfo.executionStatus === 'READY' && (
                <HanaButton
                  title="대출 실행하기"
                  onPress={handleExecuteLoan}
                  loading={executing}
                  style={styles.executeButton}
                  variant="primary"
                />
              )}
            </View>
          </HanaCard>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.surface,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  
  // 대출 정보 카드
  loanInfoCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  loanInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  loanInfoLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  loanInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  
  // 결과 카드
  resultCard: {
    marginBottom: 16,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.success,
    marginTop: 8,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  failureContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  failureText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.error,
    marginTop: 8,
    marginBottom: 8,
  },
  failureMessage: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  
  // 폼 카드
  formCard: {
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  
  // 날짜 선택
  dateContainer: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  dateText: {
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  dateButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dateButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dateButtonText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // 은행 선택
  bankSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  bankOptionSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  bankOptionText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  bankOptionTextSelected: {
    color: Colors.light.background,
    fontWeight: '600',
  },
  
  // 텍스트 입력
  textInput: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    color: Colors.light.text,
  },
  
  // 버튼 컨테이너
  buttonContainer: {
    gap: 12,
    marginTop: 20,
  },
  setInfoButton: {
    backgroundColor: Colors.light.primary,
  },
  executeButton: {
    backgroundColor: '#FF6B35',
  },
});