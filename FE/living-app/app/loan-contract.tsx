import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert,
  TouchableOpacity,
  TextInput,
  Platform
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { HanaButton } from '../components/HanaButton';
import { HanaHeader } from '../components/HanaHeader';
import { Colors } from '../constants/Colors';
import { mobileApi, loanAPI } from '../services/mobileApi';
import { formatKoreanCurrency, formatNumberWithCommas } from '../utils/formatUtils';

export default function LoanContractScreen() {
  const params = useLocalSearchParams();
  
  // 실제 승인 정보 상태
  const [approvalData, setApprovalData] = useState({
    approvedLimit: 0,
    approvedRate: 0,
    approvedTerm: 0,
    applicationId: '',
    loading: true,
    error: null as string | null
  });

  // URL 파라미터에서 기본 정보 가져오기 (실제 데이터가 로드될 때까지 임시 사용)
  const defaultLimit = params.approvedLimit ? parseInt(params.approvedLimit as string) : 50000000;
  const defaultRate = params.approvedRate ? parseFloat(params.approvedRate as string) : 3.5;
  const defaultTerm = params.approvedTerm ? parseInt(params.approvedTerm as string) : 24;
  const loanApplicationId = params.applicationId ? params.applicationId as string : null;

  const [contractData, setContractData] = useState({
    loanId: 1,
    loanAmount: '',
    interestRate: defaultRate ? defaultRate.toString() : '3.5',
    loanTerm: defaultTerm ? defaultTerm.toString() : '24',
    loanPurpose: '전월세보증금',
    desiredContractDate: new Date(),
    agreesToTerms: false,
    agreesToPrivacy: false,
    agreesToCredit: false,
    landlordAccount: '', // 임대인 계좌번호 추가
  });

  // 실제 승인 데이터 가져오기
  useEffect(() => {
    const fetchApprovalData = async () => {
      if (!loanApplicationId) {
        setApprovalData({
          approvedLimit: 0,
          approvedRate: 0,
          approvedTerm: 0,
          applicationId: '',
          loading: false,
          error: '대출 신청 ID가 없습니다.'
        });
        Alert.alert(
          '오류',
          '대출 신청 정보가 없습니다. 다시 시도해주세요.',
          [{ text: '확인', onPress: () => router.back() }]
        );
        return;
      }

      try {
        setApprovalData(prev => ({ ...prev, loading: true, error: null }));
        
        const response = await mobileApi.getLoanApproval(loanApplicationId);
        
        // createRetryableAPI가 이미 데이터를 파싱하므로 직접 사용
        if (response && (response.approvedLimit || response.data)) {
          const approval = response.data || response;
          setApprovalData({
            approvedLimit: approval.approvedLimit || defaultLimit,
            approvedRate: approval.approvedRate || defaultRate,
            approvedTerm: approval.approvedTerm || defaultTerm,
            applicationId: loanApplicationId,
            loading: false,
            error: null
          });

          // contractData도 실제 데이터로 업데이트 (null 체크 포함)
          setContractData(prev => ({
            ...prev,
            interestRate: approval.approvedRate ? approval.approvedRate.toString() : defaultRate.toString(),
            loanTerm: approval.approvedTerm ? approval.approvedTerm.toString() : defaultTerm.toString()
          }));
        } else {
          throw new Error('승인 정보를 가져올 수 없습니다.');
        }
      } catch (error) {
        
        // 실제 에러 메시지 파싱
        let errorMessage = '승인 정보를 불러오는데 실패했습니다.';
        if (error.response && error.response.data) {
          if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          }
        }
        
        setApprovalData({
          approvedLimit: 0,
          approvedRate: 0,
          approvedTerm: 0,
          applicationId: '',
          loading: false,
          error: errorMessage
        });
        
        // 실제 에러를 사용자에게 표시
        Alert.alert(
          '오류', 
          errorMessage,
          [
            { 
              text: '확인', 
              onPress: () => router.back() // 이전 화면으로 돌아가기
            }
          ]
        );
      }
    };

    fetchApprovalData();
  }, [loanApplicationId, defaultLimit, defaultRate, defaultTerm]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setContractData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleInputChange('desiredContractDate', selectedDate);
    }
  };

  const validateForm = () => {
    const { loanAmount, loanTerm } = contractData;
    
    if (!loanAmount) {
      Alert.alert('입력 오류', '대출 금액을 입력해주세요.');
      return false;
    }

    if (!loanTerm) {
      Alert.alert('입력 오류', '대출 기간을 입력해주세요.');
      return false;
    }

    const numericAmount = parseFloat(loanAmount.replace(/[^0-9]/g, ''));
    const currentLimit = approvalData.approvedLimit;
    const numericTerm = parseInt(loanTerm);
    const currentTerm = approvalData.approvedTerm;
    
    if (!currentLimit || currentLimit === 0) {
      Alert.alert('오류', '승인 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
      return false;
    }
    
    if (numericAmount > currentLimit) {
      Alert.alert('금액 초과', `승인된 한도 ${currentLimit.toLocaleString()}만원을 초과할 수 없습니다.`);
      return false;
    }

    if (numericTerm > currentTerm) {
      Alert.alert('기간 초과', `승인된 기간 ${currentTerm}개월을 초과할 수 없습니다.`);
      return false;
    }

    if (numericTerm < 1) {
      Alert.alert('입력 오류', '대출 기간은 1개월 이상이어야 합니다.');
      return false;
    }

    if (!contractData.agreesToTerms || !contractData.agreesToPrivacy || !contractData.agreesToCredit) {
      Alert.alert('동의 필요', '모든 약관에 동의해주세요.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    // loanApplicationId 필수 체크
    if (!loanApplicationId) {
      Alert.alert('오류', '대출 신청 ID가 없습니다. 다시 시도해주세요.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData = {
        ...contractData,
        loanApplicationId: loanApplicationId, // 백엔드에서 필요한 필드 추가
        desiredContractDate: contractData.desiredContractDate.toISOString().split('T')[0],
        loanAmount: parseFloat(contractData.loanAmount.replace(/[^0-9]/g, '')) * 10000, // 만원 -> 원 (사용자 입력 1000만원 → 10000000원)
        interestRate: parseFloat(contractData.interestRate),
        loanTerm: parseInt(contractData.loanTerm),
      };
      

      const response = await mobileApi.createLoanContract(requestData);
      
      // createRetryableAPI가 이미 데이터를 파싱하므로 직접 사용
      const result = response.data || response;
      
      if (result.status === 'SCHEDULED' || result.success) {
        // AsyncStorage에 계약 완료 정보 저장
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.setItem(`contract_completed_${loanApplicationId}`, JSON.stringify({
            contractNumber: result.contractNumber,
            scheduledDate: result.scheduledDate,
            completedAt: new Date().toISOString()
          }));
        } catch (error) {
        }
        
        Alert.alert(
          '계약서 생성 완료',
          '계약서가 성공적으로 생성되었습니다.',
          [{
            text: '확인',
            onPress: () => router.push({
              pathname: '/reservation-success',
              params: {
                type: 'contract',
                contractNumber: result.contractNumber,
                scheduledDate: result.scheduledDate
              }
            })
          }]
        );
      } else {
        Alert.alert('오류', result.message || '계약서 생성에 실패했습니다.');
      }
    } catch (error) {
      // 더 상세한 에러 메시지 파싱
      let errorMessage = '계약서 생성 중 오류가 발생했습니다.';

      if (error.response) {
        // HTTP 응답 에러
        const status = error.response.status;
        const data = error.response.data;

        if (data && typeof data === 'object') {
          if (data.message) {
            errorMessage = data.message;
          } else if (data.error) {
            errorMessage = data.error;
          }
        } else if (typeof data === 'string') {
          errorMessage = data;
        }

      } else if (error.message) {
        // 네트워크 에러 또는 기타 에러
        if (error.message.includes('Network Error')) {
          errorMessage = '네트워크 연결을 확인해주세요.';
        } else if (error.message.includes('timeout')) {
          errorMessage = '요청 시간이 초과되었습니다. 다시 시도해주세요.';
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert(
        '계약서 생성 실패',
        errorMessage,
        [
          {
            text: '다시 시도',
            onPress: () => {
              // 재시도 로직은 사용자가 버튼을 다시 누르도록 함
            }
          },
          {
            text: '취소',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmount = (amount: string) => {
    return formatNumberWithCommas(amount);
  };

  const handleAmountChange = (text: string) => {
    const formatted = formatAmount(text);
    handleInputChange('loanAmount', formatted);
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <HanaHeader
        title="대출 계약서 작성"
        subtitle="전월세보증금 대출 계약서를 작성하세요"
        leftIcon="arrow-left"
        onLeftPress={() => router.back()}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 승인 정보 표시 */}
        <View style={styles.approvalSection}>
          <Text style={styles.approvalTitle}>관리자 승인 정보</Text>
          {approvalData.loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>승인 정보를 불러오는 중...</Text>
            </View>
          ) : (
            <View style={styles.approvalCard}>
              {approvalData.error ? (
                <View style={styles.errorNotice}>
                  <Text style={styles.errorNoticeText}>{approvalData.error}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.approvalRow}>
                    <Text style={styles.approvalLabel}>승인 한도</Text>
                    <Text style={styles.approvalValue}>
                      {formatKoreanCurrency(approvalData.approvedLimit)}
                    </Text>
                  </View>
                  <View style={styles.approvalRow}>
                    <Text style={styles.approvalLabel}>적용 금리</Text>
                    <Text style={styles.approvalValue}>
                      {approvalData.approvedRate}%
                    </Text>
                  </View>
                  <View style={styles.approvalRow}>
                    <Text style={styles.approvalLabel}>대출 기간</Text>
                    <Text style={styles.approvalValue}>
                      {approvalData.approvedTerm}개월
                    </Text>
                  </View>
                  {approvalData.applicationId && (
                    <View style={styles.approvalRow}>
                      <Text style={styles.approvalLabel}>신청번호</Text>
                      <Text style={styles.approvalValue}>{approvalData.applicationId}</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {/* 대출 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>대출 정보</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>희망 대출금액 (만원) *</Text>
            <View style={[styles.amountInputContainer, approvalData.approvedLimit === 0 && styles.disabledInput]}>
              <TextInput
                style={styles.amountInput}
                value={contractData.loanAmount}
                onChangeText={handleAmountChange}
                placeholder={approvalData.approvedLimit > 0 ? "대출 받을 금액을 입력하세요" : "승인 정보 로딩 중..."}
                keyboardType="numeric"
                editable={approvalData.approvedLimit > 0}
              />
              <Text style={styles.amountUnit}>만원</Text>
            </View>
            <Text style={styles.helperText}>
              {approvalData.approvedLimit > 0
                ? `최대 ${formatKoreanCurrency(approvalData.approvedLimit)}까지 가능`
                : '승인 정보를 불러온 후 입력 가능합니다'
              }
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>대출 기간 (개월) *</Text>
            <View style={[styles.termInputContainer, approvalData.approvedTerm === 0 && styles.disabledInput]}>
              <TextInput
                style={styles.termInput}
                value={contractData.loanTerm}
                onChangeText={(text) => handleInputChange('loanTerm', text.replace(/[^0-9]/g, ''))}
                placeholder={approvalData.approvedTerm > 0 ? "대출 기간을 입력하세요" : "승인 정보 로딩 중..."}
                keyboardType="numeric"
                editable={approvalData.approvedTerm > 0}
              />
              <Text style={styles.termUnit}>개월</Text>
            </View>
            <Text style={styles.helperText}>
              {approvalData.approvedTerm > 0 
                ? `승인된 기간: ${approvalData.approvedTerm}개월`
                : '승인 정보를 불러온 후 입력 가능합니다'
              }
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>대출 용도</Text>
            <View style={styles.readonlyContainer}>
              <Text style={styles.readonlyText}>{contractData.loanPurpose}</Text>
            </View>
          </View>
        </View>

        {/* 계약 희망일 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계약 희망일</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>희망일자 *</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {contractData.desiredContractDate.toLocaleDateString('ko-KR')}
              </Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* 동의사항 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>동의사항</Text>
          
          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => handleInputChange('agreesToTerms', !contractData.agreesToTerms)}
          >
            <View style={[styles.checkbox, contractData.agreesToTerms && styles.checkedBox]}>
              {contractData.agreesToTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>전월세보증금 대출약관에 동의합니다</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => handleInputChange('agreesToPrivacy', !contractData.agreesToPrivacy)}
          >
            <View style={[styles.checkbox, contractData.agreesToPrivacy && styles.checkedBox]}>
              {contractData.agreesToPrivacy && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>개인정보처리방침에 동의합니다</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => handleInputChange('agreesToCredit', !contractData.agreesToCredit)}
          >
            <View style={[styles.checkbox, contractData.agreesToCredit && styles.checkedBox]}>
              {contractData.agreesToCredit && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>신용정보 조회·제공·이용에 동의합니다</Text>
          </TouchableOpacity>
        </View>

        <HanaButton
          title={isSubmitting ? "처리 중..." : "계약서 생성"}
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={styles.submitButton}
        />
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={contractData.desiredContractDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  
  // 승인 정보 스타일
  approvalSection: {
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  approvalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  approvalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  approvalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  approvalLabel: {
    fontSize: 16,
    color: '#666',
  },
  approvalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  
  // 섹션 스타일
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  
  // 입력 필드 스타일
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  amountInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  amountUnit: {
    fontSize: 16,
    color: '#666',
    paddingRight: 12,
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  termInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  termInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  termUnit: {
    fontSize: 16,
    color: '#666',
    paddingRight: 12,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  readonlyContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    padding: 12,
  },
  readonlyText: {
    fontSize: 16,
    color: '#666',
  },
  
  // 날짜 버튼 스타일
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  
  
  // 체크박스 스타일
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkedBox: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  
  // 제출 버튼 스타일
  submitButton: {
    margin: 20,
    marginTop: 30,
  },
  
  // 로딩 상태 스타일
  loadingContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  
  // 에러 알림 스타일
  errorNotice: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorNoticeText: {
    fontSize: 14,
    color: '#c62828',
    lineHeight: 18,
  },
});