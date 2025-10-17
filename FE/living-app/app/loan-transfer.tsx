import { HanaButton } from '@/components/HanaButton';
import { HanaCard } from '@/components/HanaCard';
import { HanaHeader } from '@/components/HanaHeader';
import { Colors } from '@/constants/Colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ScrollView, StatusBar, StyleSheet, View, Alert, TextInput, TouchableOpacity, Modal } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { mobileApi } from '../services/mobileApi';

interface LoanTransferParams {
  applicationId?: string;
  loanAmount?: string;
  loanType?: string;
  contractNumber?: string;
}

interface ContractInfo {
  contractNumber: string;
  loanAmount: number;
  loanPurpose: string;
  scheduledDate: string;
  status: string;
  landlordAccount: string;
  landlordName: string;
  interestRate: number;
  loanTerm: number;
}

export default function LoanTransferScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<LoanTransferParams>();

  const [contractInfo, setContractInfo] = useState<ContractInfo>({
    contractNumber: '',
    loanAmount: 0,
    loanPurpose: '',
    scheduledDate: '',
    status: '',
    landlordAccount: '',
    landlordName: '',
    interestRate: 0,
    loanTerm: 0
  });

  const [transferData, setTransferData] = useState({
    transferAmount: '',
    landlordAccount: '',
    landlordName: '',
    transferMemo: '전월세보증금'
  });

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 계약 정보 가져오기
  useEffect(() => {
    const fetchContractInfo = async () => {
      if (params.contractNumber) {
        setLoading(true);
        try {
          // 1. 계약 정보 조회
          const contractResponse = await mobileApi.get(`/loans/contracts/${params.contractNumber}`);
          const contractData = contractResponse.data || contractResponse;
          
          // 2. 송금 기본값 조회
          const defaultsResponse = await mobileApi.getLoanTransferDefaults();
          const defaults = defaultsResponse.data || defaultsResponse;
          
          
          setContractInfo({
            contractNumber: contractData.contractNumber || params.contractNumber,
            loanAmount: contractData.loanAmount || parseInt(params.loanAmount || '0'),
            loanPurpose: contractData.loanPurpose || '전월세대출',
            scheduledDate: contractData.scheduledDate || '',
            status: contractData.status || 'SCHEDULED',
            landlordAccount: defaults.landlordAccount || '',
            landlordName: defaults.landlordName || '',
            interestRate: contractData.interestRate || 3.5,
            loanTerm: contractData.loanTerm || 24
          });

          // 송금 정보 초기값 설정 (yml에서 가져온 기본값 사용)
          setTransferData(prev => ({
            ...prev,
            transferAmount: ((contractData.loanAmount || parseInt(params.loanAmount || '0')) / 10000).toString(), // 원을 만원으로
            landlordAccount: defaults.landlordAccount || '',
            landlordName: defaults.landlordName || '',
            transferMemo: defaults.transferMemo || '전월세보증금'
          }));

        } catch (error) {
          Alert.alert('오류', '계약 정보를 불러올 수 없습니다.');
          router.back();
        } finally {
          setLoading(false);
        }
      } else {
        // 계약번호가 없는 경우에도 기본값만 설정
        const fetchDefaults = async () => {
          try {
            const defaultsResponse = await mobileApi.getLoanTransferDefaults();
            const defaults = defaultsResponse.data || defaultsResponse;
            
            
            // 파라미터 정보로 기본 설정
            setContractInfo({
              contractNumber: '',
              loanAmount: parseInt(params.loanAmount || '0'),
              loanPurpose: '전월세대출',
              scheduledDate: '',
              status: 'SCHEDULED',
              landlordAccount: defaults.landlordAccount || '',
              landlordName: defaults.landlordName || '',
              interestRate: 3.5,
              loanTerm: 24
            });

            // 송금 정보 기본값 설정
            setTransferData(prev => ({
              ...prev,
              transferAmount: ((parseInt(params.loanAmount || '0')) / 10000).toString(),
              landlordAccount: defaults.landlordAccount || '',
              landlordName: defaults.landlordName || '',
              transferMemo: defaults.transferMemo || '전월세보증금'
            }));
            
          } catch (error) {
          }
        };
        
        fetchDefaults();
      }
    };

    fetchContractInfo();
  }, [params.contractNumber, params.loanAmount]);

  const validateTransferData = () => {
    // 모든 값이 자동으로 설정되므로 기본 검증만 수행
    if (!transferData.transferAmount || !transferData.landlordAccount || !transferData.landlordName) {
      Alert.alert('오류', '송금 정보가 올바르게 설정되지 않았습니다. 다시 시도해주세요.');
      return false;
    }

    return true;
  };

  const handleTransferConfirm = async () => {
    if (!validateTransferData()) return;
    
    setIsSubmitting(true);
    try {
      const requestData = {
        contractNumber: contractInfo.contractNumber,
        paymentAmount: parseFloat(transferData.transferAmount) * 10000, // 만원을 원으로
        landlordAccount: transferData.landlordAccount,
        landlordName: transferData.landlordName,
        transferMemo: transferData.transferMemo
      };


      const response = await mobileApi.post('/api/loans/execute', requestData);
      const result = response.data || response;

      if (result.success) {
        Alert.alert(
          '송금 완료',
          '송금이 성공적으로 완료되었습니다.',
          [
            {
              text: '확인',
              onPress: () => {
                router.push({
                  pathname: '/transfer-success',
                  params: {
                    contractNumber: contractInfo.contractNumber,
                    transferAmount: (parseFloat(transferData.transferAmount) * 10000).toString(),
                    landlordAccount: transferData.landlordAccount,
                    landlordName: transferData.landlordName,
                    transactionId: result.transactionId,
                    type: 'transfer'
                  }
                });
              }
            }
          ]
        );
      } else {
        throw new Error(result.message || '송금에 실패했습니다.');
      }
    } catch (error: any) {
      Alert.alert(
        '송금 실패', 
        error.response?.data?.message || error.message || '송금 처리 중 오류가 발생했습니다.'
      );
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
        <HanaHeader
          title="대출금 송금"
          subtitle="대출금을 임대인에게 송금합니다"
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>계약 정보 로딩 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      
      {/* 상단 헤더 */}
      <HanaHeader
        title="대출금 송금"
        subtitle="대출금을 임대인에게 송금합니다"
        leftIcon="arrow-left"
        onLeftPress={() => router.back()}
      />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 계약 정보 카드 */}
        <HanaCard variant="elevated" style={styles.contractCard}>
          <Text style={styles.cardTitle}>계약 정보</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>계약번호</Text>
            <Text style={styles.infoValue}>{contractInfo.contractNumber}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>대출 목적</Text>
            <Text style={styles.infoValue}>{contractInfo.loanPurpose}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>대출 금액</Text>
            <Text style={styles.infoValue}>{(contractInfo.loanAmount / 10000).toLocaleString()}만원</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>적용 금리</Text>
            <Text style={styles.infoValue}>{contractInfo.interestRate}%</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>대출 기간</Text>
            <Text style={styles.infoValue}>{contractInfo.loanTerm}개월</Text>
          </View>
        </HanaCard>

        {/* 송금 정보 입력 카드 */}
        <HanaCard variant="elevated" style={styles.transferCard}>
          <Text style={styles.cardTitle}>송금 정보</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>송금 금액 (만원) *</Text>
            <View style={[styles.amountInputContainer, styles.readOnlyInputContainer]}>
              <TextInput
                style={[styles.amountInput, styles.readOnlyAmountInput]}
                value={transferData.transferAmount}
                editable={false}
                placeholder="송금 금액 (자동 설정)"
              />
              <Text style={styles.amountUnit}>만원</Text>
            </View>
            <Text style={styles.helperText}>
              대출 승인 금액 전액이 송금됩니다
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>임대인 계좌번호 *</Text>
            <TextInput
              style={[styles.input, styles.readOnlyInput]}
              value={transferData.landlordAccount}
              editable={false}
              placeholder="임대인 계좌번호 (자동 설정)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>임대인 이름 *</Text>
            <TextInput
              style={[styles.input, styles.readOnlyInput]}
              value={transferData.landlordName}
              editable={false}
              placeholder="임대인 이름 (자동 설정)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>송금 메모</Text>
            <TextInput
              style={[styles.input, styles.readOnlyInput]}
              value={transferData.transferMemo}
              editable={false}
              placeholder="송금 메모 (자동 설정)"
            />
          </View>
        </HanaCard>

        {/* 주의사항 */}
        <HanaCard variant="elevated" style={styles.noticeCard}>
          <Text style={styles.cardTitle}>주의사항</Text>
          
          <View style={styles.noticeItem}>
            <Text style={styles.noticeText}>• 송금 후 취소가 불가능합니다. 계좌번호를 정확히 확인해주세요.</Text>
          </View>
          <View style={styles.noticeItem}>
            <Text style={styles.noticeText}>• 송금은 영업시간 내에 즉시 처리됩니다.</Text>
          </View>
          <View style={styles.noticeItem}>
            <Text style={styles.noticeText}>• 송금 완료 후 거래내역을 확인하실 수 있습니다.</Text>
          </View>
        </HanaCard>

        {/* 송금하기 버튼 */}
        <HanaButton
          title="송금하기"
          onPress={() => setShowConfirmModal(true)}
          variant="primary"
          size="large"
          style={styles.transferButton}
          disabled={isSubmitting}
        />
      </ScrollView>

      {/* 송금 확인 모달 */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>송금 확인</Text>
            <Text style={styles.modalMessage}>
              아래 정보로 송금하시겠습니까?{'\n\n'}
              송금 금액: {transferData.transferAmount}만원{'\n'}
              받는 계좌: {transferData.landlordAccount}{'\n'}
              받는 분: {transferData.landlordName}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleTransferConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>송금하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },

  // 로딩
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },

  // 카드
  contractCard: {
    marginBottom: 20,
  },
  transferCard: {
    marginBottom: 20,
  },
  noticeCard: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },

  // 정보 행
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border + '30',
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },

  // 입력 폼
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.light.surface,
  },
  readOnlyInput: {
    backgroundColor: Colors.light.border + '30',
    borderColor: Colors.light.border + '50',
    color: Colors.light.textSecondary,
  },
  readOnlyInputContainer: {
    backgroundColor: Colors.light.border + '30',
    borderColor: Colors.light.border + '50',
  },
  readOnlyAmountInput: {
    color: Colors.light.textSecondary,
    backgroundColor: 'transparent',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
  },
  amountInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  amountUnit: {
    paddingRight: 16,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  helperText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },

  // 주의사항
  noticeItem: {
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },

  // 송금 버튼
  transferButton: {
    marginTop: 20,
  },

  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 24,
    minWidth: 300,
    maxWidth: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalMessage: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.surface,
  },
});