import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Alert, RefreshControl } from 'react-native';
import { Text, Card, Button, Divider, Chip, List } from 'react-native-paper';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HanaHeader } from '@/components/HanaHeader';
import { HanaCard } from '@/components/HanaCard';
import { HanaButton } from '@/components/HanaButton';
import { Colors } from '@/constants/Colors';
import { urlHelpers } from '@/src/config/environment';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface AutoBillingInfo {
  id: number;
  userId: number;
  contractId: number;
  fromAccount: string;
  accountName: string;
  billingDay: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  hanaContractId: number;
  createdAt: string;
  updatedAt: string;
}

interface BillingRecord {
  id: number;
  billingMonth: string;
  buildingName: string;
  unitNumber: string;
  managementFee: number;
  waterFee: number;
  electricityFee: number;
  gasFee: number;
  cleaningFee: number;
  securityFee: number;
  parkingFee: number;
  otherFee: number;
  totalAmount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  paidAt?: string;
  transactionId?: string;
  failureReason?: string;
  createdAt: string;
}

export default function AutoBillingManageScreen() {
  const [autoInfo, setAutoInfo] = useState<AutoBillingInfo | null>(null);
  const [billings, setBillings] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasAutoBilling, setHasAutoBilling] = useState(false);

  useEffect(() => {
    checkAutoBillingStatus();
  }, []);

  const checkAutoBillingStatus = async () => {
    try {
      setLoading(true);
      
      // 자동납부 설정 여부 확인
      const statusResponse = await fetch(`${urlHelpers.getCurrentApiUrl()}/api/auto-billing/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const statusResult = await statusResponse.json();
      
      if (statusResult.success) {
        setHasAutoBilling(statusResult.data);
        
        if (statusResult.data) {
          // 자동납부 정보 및 청구서 목록 조회
          await Promise.all([loadAutoBillingInfo(), loadBillingRecords()]);
        }
      }
    } catch (error) {
      Alert.alert('오류', '자동납부 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAutoBillingInfo = async () => {
    try {
      const response = await fetch(`${urlHelpers.getCurrentApiUrl()}/api/auto-billing/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setAutoInfo(result.data);
      }
    } catch (error) {
    }
  };

  const loadBillingRecords = async () => {
    try {
      const response = await fetch(`${urlHelpers.getCurrentApiUrl()}/api/auto-billing/bills`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        // 최신순으로 정렬
        const sortedBillings = result.data.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setBillings(sortedBillings);
      }
    } catch (error) {
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    checkAutoBillingStatus();
  };

  const handleSuspendResume = async () => {
    if (!autoInfo) return;

    try {
      setLoading(true);
      
      const isActive = autoInfo.status === 'ACTIVE';
      const action = isActive ? '일시정지' : '재개';
      const endpoint = isActive ? 'suspend' : 'resume';
      
      const response = await fetch(`${urlHelpers.getCurrentApiUrl()}/api/auto-billing/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        Alert.alert('성공', `자동납부가 ${action}되었습니다.`);
        checkAutoBillingStatus();
      } else {
        Alert.alert('오류', result.message || `자동납부 ${action}에 실패했습니다.`);
      }
    } catch (error: any) {
      Alert.alert('오류', `자동납부 상태 변경 중 오류가 발생했습니다.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    Alert.alert(
      '자동납부 해지',
      '정말로 자동납부를 해지하시겠습니까?\n해지 후 다시 설정할 수 있습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '해지',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              const response = await fetch(`${urlHelpers.getCurrentApiUrl()}/api/auto-billing/cancel`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
              });
              
              const result = await response.json();
              
              if (result.success) {
                Alert.alert('해지 완료', '자동납부가 성공적으로 해지되었습니다.');
                setHasAutoBilling(false);
                setAutoInfo(null);
                setBillings([]);
              } else {
                Alert.alert('오류', result.message || '자동납부 해지에 실패했습니다.');
              }
            } catch (error: any) {
              Alert.alert('오류', '자동납부 해지 중 오류가 발생했습니다.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatMonth = (monthString: string) => {
    return monthString.replace('-', '년 ') + '월';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return Colors.success;
      case 'SUSPENDED':
        return '#f57c00';
      case 'CANCELLED':
        return Colors.error;
      case 'PENDING':
        return '#f57c00';
      case 'PAID':
        return Colors.success;
      case 'FAILED':
        return Colors.error;
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
      case 'PENDING':
        return '대기';
      case 'PAID':
        return '납부완료';
      case 'FAILED':
        return '실패';
      default:
        return '알 수 없음';
    }
  };

  const getBillingIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'clock-outline';
      case 'PAID':
        return 'check-circle';
      case 'FAILED':
        return 'alert-circle';
      default:
        return 'receipt';
    }
  };

  if (!hasAutoBilling) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <HanaHeader 
          title="자동납부 관리" 
          showBack={true}
          onBackPress={() => router.back()}
        />

        <View style={styles.emptyContainer}>
          <Icon name="receipt" size={80} color={Colors.light.textSecondary} />
          <Text style={styles.emptyTitle}>설정된 자동납부가 없습니다</Text>
          <Text style={styles.emptyDescription}>
            관리비, 공과금 자동납부를 설정하여{'\n'}
            매월 자동으로 납부하세요
          </Text>
          
          <HanaButton
            title="자동납부 설정하기"
            onPress={() => router.push('/auto-billing-setup')}
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
        title="자동납부 관리" 
        showBack={true}
        onBackPress={() => router.back()}
      />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {autoInfo && (
          <>
            {/* 자동납부 상태 */}
            <HanaCard style={styles.section}>
              <View style={styles.statusHeader}>
                <Text style={styles.sectionTitle}>자동납부 상태</Text>
                <Chip 
                  mode="flat"
                  style={[styles.statusChip, { backgroundColor: getStatusColor(autoInfo.status) + '20' }]}
                  textStyle={[styles.statusText, { color: getStatusColor(autoInfo.status) }]}
                >
                  {getStatusText(autoInfo.status)}
                </Chip>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.label}>매월 납부일:</Text>
                <Text style={styles.value}>{autoInfo.billingDay}일</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.label}>출금 계좌:</Text>
                <Text style={styles.value}>{autoInfo.fromAccount}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.label}>설정일:</Text>
                <Text style={styles.value}>{formatDate(autoInfo.createdAt)}</Text>
              </View>
            </HanaCard>

            {/* 최근 청구서 */}
            <HanaCard style={styles.section}>
              <Text style={styles.sectionTitle}>최근 청구서</Text>
              
              {billings.length > 0 ? (
                <View style={styles.billingList}>
                  {billings.slice(0, 3).map((billing) => (
                    <View key={billing.id} style={styles.billingItem}>
                      <View style={styles.billingHeader}>
                        <View style={styles.billingInfo}>
                          <Icon 
                            name={getBillingIcon(billing.status)} 
                            size={20} 
                            color={getStatusColor(billing.status)} 
                          />
                          <Text style={styles.billingMonth}>
                            {formatMonth(billing.billingMonth)}
                          </Text>
                        </View>
                        <Chip 
                          mode="flat"
                          style={[
                            styles.billingStatusChip, 
                            { backgroundColor: getStatusColor(billing.status) + '20' }
                          ]}
                          textStyle={[
                            styles.billingStatusText, 
                            { color: getStatusColor(billing.status) }
                          ]}
                          compact
                        >
                          {getStatusText(billing.status)}
                        </Chip>
                      </View>
                      
                      <View style={styles.billingDetails}>
                        <Text style={styles.billingLocation}>
                          {billing.buildingName} {billing.unitNumber}
                        </Text>
                        <Text style={styles.billingAmount}>
                          {formatCurrency(billing.totalAmount)}
                        </Text>
                      </View>
                      
                      <View style={styles.billingMeta}>
                        <Text style={styles.billingDate}>
                          납부기한: {formatDate(billing.dueDate)}
                        </Text>
                        {billing.paidAt && (
                          <Text style={styles.billingPaidDate}>
                            납부완료: {formatDate(billing.paidAt)}
                          </Text>
                        )}
                      </View>
                      
                      {billing !== billings.slice(0, 3)[billings.slice(0, 3).length - 1] && (
                        <Divider style={styles.billingDivider} />
                      )}
                    </View>
                  ))}
                  
                  {billings.length > 3 && (
                    <Button
                      mode="text"
                      onPress={() => {/* 전체 청구서 목록 보기 */}}
                      style={styles.moreButton}
                    >
                      전체 청구서 보기
                    </Button>
                  )}
                </View>
              ) : (
                <View style={styles.noBillingContainer}>
                  <Text style={styles.noBillingText}>아직 청구서가 없습니다</Text>
                </View>
              )}
            </HanaCard>

            {/* 관리 버튼들 */}
            <HanaCard style={styles.section}>
              <Text style={styles.sectionTitle}>관리</Text>
              
              <View style={styles.buttonContainer}>
                <Button
                  mode="outlined"
                  onPress={handleSuspendResume}
                  disabled={loading}
                  style={[styles.actionButton, styles.suspendButton]}
                  labelStyle={styles.buttonLabel}
                >
                  {autoInfo.status === 'ACTIVE' ? '일시정지' : '재개'}
                </Button>
              </View>
              
              <Button
                mode="outlined"
                onPress={handleCancel}
                disabled={loading}
                style={[styles.actionButton, styles.cancelButton]}
                labelStyle={[styles.buttonLabel, { color: Colors.error }]}
              >
                자동납부 해지
              </Button>
            </HanaCard>
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
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
  section: {
    marginBottom: 16,
    padding: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
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
  billingList: {
    marginTop: 8,
  },
  billingItem: {
    paddingVertical: 12,
  },
  billingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billingMonth: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: 8,
  },
  billingStatusChip: {
    height: 24,
  },
  billingStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  billingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  billingLocation: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  billingAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  billingMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billingDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  billingPaidDate: {
    fontSize: 12,
    color: Colors.success,
  },
  billingDivider: {
    marginTop: 12,
  },
  moreButton: {
    marginTop: 8,
  },
  noBillingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noBillingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  buttonContainer: {
    marginBottom: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  suspendButton: {
    borderColor: '#f57c00',
  },
  cancelButton: {
    borderColor: Colors.error,
  },
  buttonLabel: {
    fontSize: 14,
  },
});