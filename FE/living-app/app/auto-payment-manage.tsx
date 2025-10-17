import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Alert, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Card, Divider, Switch, Chip, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HanaHeader } from '@/components/HanaHeader';
import { HanaCard } from '@/components/HanaCard';
import { HanaButton } from '@/components/HanaButton';
import { Colors } from '@/constants/Colors';
import { mobileApi } from '@/services/mobileApi';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

interface AutoPaymentInfo {
  id: number;
  userCi: string;
  fromAccount: string;
  toAccount: string;
  toBankCode: string;
  toBankName: string;
  amount: number;
  transferDay: number;
  beneficiaryName: string;
  memo: string;
  nextTransferDate: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  lastExecutionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TransferHistory {
  id: number;
  contractId: number;
  executionDate: string;
  scheduledDate: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  transactionId: string | null;
  failureReason: string | null;
  fromAccount: string;
  toAccount: string;
}

export default function AutoPaymentManageScreen() {
  const [autoPaymentInfo, setAutoPaymentInfo] = useState<AutoPaymentInfo | null>(null);
  const [transferHistory, setTransferHistory] = useState<TransferHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasAutoPayment, setHasAutoPayment] = useState(false);

  useEffect(() => {
    checkAutoPaymentStatus();
  }, []);

  const checkAutoPaymentStatus = async () => {
    try {
      setLoading(true);
      
      // 자동결제 설정 여부 확인
      const statusResponse = await mobileApi.getAutoPaymentStatus();
      if (statusResponse?.success) {
        setHasAutoPayment(statusResponse.data);
        
        if (statusResponse.data) {
          // 자동결제 목록 조회 (새로운 API 사용)
          const listResponse = await mobileApi.getAutoPaymentList();
          if (listResponse?.success && listResponse.data && listResponse.data.length > 0) {
            // 첫 번째 자동결제 설정 정보 사용
            const autoPayment = listResponse.data[0];

            // 기존 인터페이스에 맞게 데이터 변환
            const convertedData = {
              id: autoPayment.id,
              userCi: autoPayment.userCi || '',
              fromAccount: autoPayment.accountNumber || '',
              toAccount: '110-4567-891234', // 하나원큐리빙 관리사 계좌
              toBankCode: '081',
              toBankName: '하나은행',
              amount: autoPayment.monthlyRent,
              transferDay: autoPayment.paymentDay,
              beneficiaryName: '하나원큐리빙',
              memo: '월세 자동이체',
              nextTransferDate: autoPayment.nextTransferDate,
              // 상태 매핑: 백엔드 status를 그대로 사용
              status: autoPayment.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
              totalExecutions: autoPayment.totalExecutions || 0,
              successfulExecutions: autoPayment.successfulExecutions || 0,
              failedExecutions: autoPayment.failedExecutions || 0,
              lastExecutionDate: autoPayment.lastExecutionDate || null,
              createdAt: autoPayment.createdAt || '',
              updatedAt: autoPayment.updatedAt || ''
            };

            setAutoPaymentInfo(convertedData);

            // 자동결제 실행 이력 조회
            try {
              const historyResponse = await mobileApi.getAutoPaymentHistory();

              if (historyResponse?.success && historyResponse.data) {
                // 이력 데이터를 TransferHistory 형식으로 변환
                const convertedHistory = historyResponse.data.slice(0, 5).map((item: any) => {
                  const mappedStatus = item.status === 'PAID' || item.status === 'COMPLETED' || item.status === 'SUCCESS'
                    ? 'SUCCESS'
                    : (item.status === 'FAILED' ? 'FAILED' : 'PENDING');

                  return {
                    id: item.id || Math.random(),
                    contractId: item.contractId || autoPayment.contractId || 0,
                    executionDate: item.executedAt || item.paidDate || item.createdAt,
                    scheduledDate: item.scheduledDate || item.dueDate || item.createdAt,
                    amount: item.amount || 0,
                    status: mappedStatus,
                    transactionId: item.transactionId || item.hanaBankTransactionId || null,
                    failureReason: item.failureReason || null,
                    fromAccount: autoPayment.accountNumber || '',
                    toAccount: '110-4567-891234'
                  };
                });

                setTransferHistory(convertedHistory);
              } else {
                setTransferHistory([]);
              }
            } catch (error) {
              setTransferHistory([]);
            }
          }
        }
      }
    } catch (error) {
      Alert.alert('오류', '자동결제 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    checkAutoPaymentStatus();
  };

  const handleSuspendResume = async () => {
    if (!autoPaymentInfo) return;

    try {
      setLoading(true);
      
      const isActive = autoPaymentInfo.status === 'ACTIVE';
      const action = isActive ? '일시정지' : '재개';
      
      const response = isActive 
        ? await mobileApi.suspendAutoPayment()
        : await mobileApi.resumeAutoPayment();
      
      if (response?.success) {
        Alert.alert('성공', `자동결제가 ${action}되었습니다.`);
        checkAutoPaymentStatus(); // 정보 새로고침
      } else {
        Alert.alert('오류', `자동결제 ${action}에 실패했습니다.`);
      }
    } catch (error: any) {
      Alert.alert('오류', error.response?.data?.message || `자동결제 상태 변경 중 오류가 발생했습니다.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    Alert.alert(
      '자동결제 해지',
      '정말로 자동결제를 해지하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '해지',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              const response = await mobileApi.cancelAutoPayment();
              
              if (response?.success) {
                Alert.alert('해지 완료', '자동결제가 성공적으로 해지되었습니다.');
                setHasAutoPayment(false);
                setAutoPaymentInfo(null);
              } else {
                Alert.alert('오류', '자동결제 해지에 실패했습니다.');
              }
            } catch (error: any) {
              Alert.alert('오류', error.response?.data?.message || '자동결제 해지 중 오류가 발생했습니다.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleAmountChange = () => {
    Alert.alert(
      '금액 수정',
      '자동결제 금액을 수정하려면 기존 설정을 해지하고 새로 설정하세요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '설정 변경',
          onPress: () => router.push('/auto-payment-setup')
        }
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'null') {
      return '설정되지 않음';
    }
    
    try {
      // YY/MM/DD 또는 YY/MM/DD HH:MM:SS 형태 처리
      if (typeof dateString === 'string' && dateString.includes('/')) {
        // 날짜 부분만 추출 (시간 부분 제거)
        const dateOnlyPart = dateString.split(' ')[0];
        const parts = dateOnlyPart.trim().split('/');
        
        if (parts.length === 3) {
          let year = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const day = parseInt(parts[2]);
          
          // 2자리 연도를 4자리로 변환
          if (year >= 0 && year <= 99) {
            // 25 -> 2025, 24 -> 2024 등으로 변환
            year = 2000 + year;
          }
          
          // 유효한 날짜인지 확인
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const correctedDate = new Date(year, month - 1, day);
            
            // Invalid Date가 아닌지 확인
            if (!isNaN(correctedDate.getTime()) && correctedDate.getFullYear() === year) {
              return correctedDate.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
            }
          }
        }
      }
      
      // 다른 형태의 날짜 문자열 처리 (ISO 형태 등)
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      // 파싱 실패시 원본 반환
      return dateString;
      
    } catch (error) {
      return dateString || '날짜 오류';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return Colors.light.success;
      case 'SUSPENDED':
        return '#f57c00';
      case 'CANCELLED':
        return Colors.light.error;
      default:
        return Colors.light.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '정상';
      case 'SUSPENDED':
        return '일시정지';
      case 'CANCELLED':
        return '해지됨';
      default:
        return '알 수 없음';
    }
  };

  const getHistoryStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return Colors.light.success;
      case 'FAILED':
        return Colors.light.error;
      case 'PENDING':
        return '#f57c00';
      default:
        return Colors.light.textSecondary;
    }
  };

  const getHistoryStatusText = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return '완료';
      case 'FAILED':
        return '실패';
      case 'PENDING':
        return '처리중';
      default:
        return '알 수 없음';
    }
  };

  const getHistoryDescription = (history: TransferHistory) => {
    if (history.status === 'SUCCESS') {
      return `월세 자동이체 • ${history.transactionId || '거래완료'}`;
    } else if (history.status === 'FAILED') {
      return history.failureReason || '이체 실패';
    } else {
      return '이체 처리중';
    }
  };

  const formatHistoryDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric',
          weekday: 'short'
        });
      }
      return formatDate(dateString);
    } catch (error) {
      return formatDate(dateString);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <HanaHeader
          title="자동이체 관리"
          showBack={true}
          onBackPress={() => router.back()}
          variant="gray"
        />

        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>자동이체 정보를 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  if (!hasAutoPayment) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <HanaHeader
          title="자동이체 관리"
          showBack={true}
          onBackPress={() => router.back()}
          variant="gray"
        />

        <View style={styles.emptyContainer}>
          <Icon name="bank-transfer" size={80} color={Colors.light.textSecondary} />
          <Text style={styles.emptyTitle}>설정된 자동결제가 없습니다</Text>
          <Text style={styles.emptyDescription}>
            월세 자동이체를 설정하여{'\n'}
            매월 자동으로 납부하세요
          </Text>

          <HanaButton
            title="자동결제 설정하기"
            onPress={() => router.push('/auto-payment-setup')}
            style={styles.setupButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <HanaHeader
        title="자동이체 관리"
        showBack={true}
        onBackPress={() => router.back()}
        variant="gray"
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {autoPaymentInfo && (
          <>
            {/* 자동결제 상태 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>월세 자동이체</Text>

              <View style={styles.highlightBox}>
                <View style={styles.highlightRow}>
                  <Icon name="calendar-clock" size={20} color="#000" />
                  <View style={styles.highlightContent}>
                    <Text style={styles.highlightLabel}>다음 이체일</Text>
                    <Text style={styles.highlightValue}>{formatDate(autoPaymentInfo.nextTransferDate)}</Text>
                  </View>
                </View>
                <View style={styles.highlightRow}>
                  <Icon name="cash" size={20} color="#000" />
                  <View style={styles.highlightContent}>
                    <Text style={styles.highlightLabel}>이체 금액</Text>
                    <Text style={[styles.highlightValue, styles.amountText]}>{formatCurrency(autoPaymentInfo.amount)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleText}>
                  매월 <Text style={styles.scheduleDay}>{autoPaymentInfo.transferDay}일</Text>에 자동으로 이체됩니다
                </Text>
              </View>
            </View>

            {/* 계좌 정보 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>이체 계좌 정보</Text>

              <View style={styles.transferFlowVertical}>
                <View style={styles.accountCardBox}>
                  <Text style={styles.accountLabel}>출금계좌</Text>
                  <Text style={styles.accountNumberCenter}>{autoPaymentInfo.fromAccount}</Text>
                  <Text style={styles.bankNameCenter}>하나은행</Text>
                </View>

                <View style={styles.transferArrowVertical}>
                  <Icon name="arrow-down" size={24} color={Colors.light.textSecondary} />
                </View>

                <View style={styles.accountCardBox}>
                  <Text style={styles.accountLabel}>입금계좌</Text>
                  <Text style={styles.accountNumberCenter}>{autoPaymentInfo.toAccount}</Text>
                  <Text style={styles.bankNameCenter}>{autoPaymentInfo.toBankName} · {autoPaymentInfo.beneficiaryName}</Text>
                </View>
              </View>
            </View>

            {/* 이체 설정 상세 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>설정 상세 정보</Text>
              
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Icon name="calendar-month" size={16} color="#000" />
                  <Text style={styles.detailLabel}>매월 이체일</Text>
                  <Text style={styles.detailValue}>{autoPaymentInfo.transferDay}일</Text>
                </View>

                <View style={styles.detailRow}>
                  <Icon name="note-text" size={16} color="#000" />
                  <Text style={styles.detailLabel}>이체 목적</Text>
                  <Text style={styles.detailValue}>{autoPaymentInfo.memo || '월세 납부'}</Text>
                </View>


                <View style={styles.detailRow}>
                  <Icon name="shield-check" size={16} color="#000" />
                  <Text style={styles.detailLabel}>계약 상태</Text>
                  <Text style={[styles.detailValue, { color: getStatusColor(autoPaymentInfo.status) }]}>
                    {getStatusText(autoPaymentInfo.status)}
                  </Text>
                </View>
              </View>
            </View>

            {/* 이체 실행 현황 */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>최근 이체 내역</Text>
                {transferHistory.length > 0 && (
                  <Text style={styles.viewMoreText}>
                    총 {transferHistory.length}건
                  </Text>
                )}
              </View>
              
              {transferHistory.length > 0 ? (
                <>
                  <View style={styles.historyList}>
                    {transferHistory.map((history, index) => (
                      <View key={history.id} style={styles.historyItem}>
                        <View style={styles.historyLeft}>
                          <Text style={styles.historyDate}>
                            {formatHistoryDate(history.executionDate)}
                          </Text>
                          <Text style={styles.historyDescription}>
                            {getHistoryDescription(history)}
                          </Text>
                        </View>
                        <View style={styles.historyRight}>
                          <Text style={styles.historyAmount}>
                            {formatCurrency(history.amount)}
                          </Text>
                          <Text style={[styles.historyStatus, {
                            color: getHistoryStatusColor(history.status),
                            backgroundColor: getHistoryStatusColor(history.status) + '15'
                          }]}>
                            {getHistoryStatusText(history.status)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                  
                  {autoPaymentInfo.totalExecutions > transferHistory.length && (
                    <Button 
                      mode="text" 
                      onPress={() => Alert.alert('알림', '전체 이력 보기는 추후 업데이트 예정입니다.')}
                      style={styles.viewMoreButton}
                      labelStyle={styles.viewMoreButtonText}
                    >
                      더 보기 ({autoPaymentInfo.totalExecutions - transferHistory.length}건)
                    </Button>
                  )}
                </>
              ) : (
                <View style={styles.noHistoryBox}>
                  <Icon name="clock-outline" size={32} color={Colors.light.textSecondary} />
                  <Text style={styles.noHistoryTitle}>이체 내역이 없습니다</Text>
                  <Text style={styles.noHistoryDescription}>
                    다음 이체일인 {formatDate(autoPaymentInfo.nextTransferDate)}에{'\n'}
                    첫 번째 자동이체가 실행됩니다
                  </Text>
                </View>
              )}
            </View>

            {/* 관리 버튼들 */}
            <View style={styles.section}>
              <View style={styles.managementHeader}>
                <Text style={styles.sectionTitle}>계약 관리</Text>
                <Text style={styles.managementSubtitle}>
                  자동결제 설정을 변경하거나 해지할 수 있습니다
                </Text>
              </View>
              
              <View style={styles.managementButtons}>
                <View style={styles.buttonRow}>
                  <HanaButton
                    title={autoPaymentInfo.status === 'ACTIVE' ? '일시정지' : '재개'}
                    onPress={handleSuspendResume}
                    variant="outline"
                    size="medium"
                    disabled={loading}
                    style={styles.managementButton}
                  />
                  
                  <HanaButton
                    title="금액 수정"
                    onPress={handleAmountChange}
                    variant="outline"
                    size="medium"
                    disabled={loading}
                    style={styles.managementButton}
                  />
                </View>
                
                <View style={styles.dangerZone}>
                  <HanaButton
                    title="자동결제 해지"
                    onPress={handleCancel}
                    variant="outline"
                    size="medium"
                    disabled={loading}
                    style={styles.cancelButton}
                    textStyle={styles.cancelButtonText}
                  />
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
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
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  setupButton: {
    width: '100%',
    maxWidth: 280,
  },
  // 섹션 스타일 (대출 페이지의 serviceInfoSection 스타일)
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
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  statusInfo: {
    flex: 1,
  },
  contractId: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  statusChip: {
    paddingHorizontal: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  accountDetails: {
    flex: 1,
    marginLeft: 12,
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
  beneficiaryName: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  divider: {
    marginVertical: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
  },
  // 관리 섹션 스타일
  managementHeader: {
    marginBottom: 16,
  },
  managementSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  managementButtons: {
    gap: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  managementButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: 'white',
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerZone: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 16,
    marginTop: 4,
  },
  cancelButton: {
    borderColor: Colors.light.border,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    color: Colors.light.error,
    fontWeight: '600',
  },
  // 새로운 스타일들
  highlightBox: {
    backgroundColor: '#f5f7fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  highlightContent: {
    flex: 1,
    marginLeft: 12,
  },
  highlightLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  highlightValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  scheduleInfo: {
    backgroundColor: Colors.light.primary + '10',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  scheduleText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  scheduleDay: {
    fontWeight: '600',
    color: Colors.light.primary,
  },
  transferFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transferFlowVertical: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  accountBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  accountBoxVertical: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  accountCardBox: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f7fa',
    borderRadius: 12,
    gap: 8,
  },
  accountIcon: {
    marginBottom: 4,
  },
  accountLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 2,
    textAlign: 'center',
  },
  accountNumberCenter: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
  },
  bankNameCenter: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  transferArrow: {
    paddingHorizontal: 8,
  },
  transferArrowVertical: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailsContainer: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginLeft: 8,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  lastExecutionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: Colors.light.success + '10',
    borderRadius: 6,
  },
  lastExecutionText: {
    fontSize: 12,
    color: Colors.light.success,
    marginLeft: 6,
    fontWeight: '500',
  },
  noDataBox: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  noDataText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 8,
    fontWeight: '500',
  },
  noDataSubtext: {
    fontSize: 12,
    color: Colors.light.textTertiary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  // 새로운 이력 관련 스타일
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  viewMoreText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  historyLeft: {
    flex: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  historyDetails: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyDescription: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: Colors.light.text,
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  viewMoreButton: {
    marginTop: 8,
    alignSelf: 'center',
  },
  viewMoreButtonText: {
    fontSize: 13,
    color: Colors.light.primary,
  },
  noHistoryBox: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f5f7fa',
    borderRadius: 12,
  },
  noHistoryTitle: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  noHistoryDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});