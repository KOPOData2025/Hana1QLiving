import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { HanaHeader } from '@/components/HanaHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useTabBar } from '@/contexts/TabBarContext';
import { contractAPI, paymentAPI } from '@/services/mobileApi';
import { Colors } from '@/constants/Colors';

// 정적 데이터
const DEFAULT_ROOM_IMAGE = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=300&h=200&fit=crop&crop=center';

const FILTERS = [
  { label: '전체', value: 'all' },
  { label: '진행중', value: 'ACTIVE' },
  { label: '만료', value: 'EXPIRED' },
  { label: '종료', value: 'TERMINATED' },
];

// 유틸리티 함수들
const getUnitImage = (unitImages?: string[] | string | null) => {
  // 배열인 경우
  if (Array.isArray(unitImages) && unitImages.length > 0) {
    return unitImages[0]; // 첫 번째 이미지 사용
  }

  // 문자열인 경우 (JSON 파싱 시도)
  if (typeof unitImages === 'string' && unitImages.trim() !== '') {
    try {
      const parsed = JSON.parse(unitImages);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0];
      }
    } catch {
      // JSON 파싱 실패 시 그대로 URL로 사용
      return unitImages;
    }
  }

  // 기본 이미지 반환
  return DEFAULT_ROOM_IMAGE;
};

const getUnitTypeText = (type: string) => {
  switch (type) {
    case 'ONE_BEDROOM':
      return '원룸';
    case 'TWO_BEDROOM':
      return '투룸';
    case 'THREE_BEDROOM':
      return '쓰리룸';
    case 'STUDIO':
      return '스튜디오';
    case 'OFFICETEL':
      return '오피스텔';
    default:
      return type;
  }
};

const formatCurrency = (amount: number | null | undefined) => {
  if (amount == null) return '-';

  if (amount >= 100000000) {
    const 억 = Math.floor(amount / 100000000);
    const 남은금액 = amount % 100000000;

    if (남은금액 === 0) {
      return `${억.toLocaleString()}억원`;
    } else if (남은금액 >= 10000) {
      const 만 = Math.floor(남은금액 / 10000);
      return `${억.toLocaleString()}억 ${만.toLocaleString()}만원`;
    } else {
      return `${억.toLocaleString()}억 ${남은금액.toLocaleString()}원`;
    }
  } else if (amount >= 10000) {
    const 만 = Math.floor(amount / 10000);
    const 남은금액 = amount % 10000;

    if (남은금액 === 0) {
      return `${만.toLocaleString()}만원`;
    } else {
      return `${만.toLocaleString()}만 ${남은금액.toLocaleString()}원`;
    }
  } else {
    return `${amount.toLocaleString()}원`;
  }
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

// API 응답 데이터 인터페이스
interface ContractData {
  id: number;
  userId: number;
  unitId: number;
  contractNumber: string | null;
  startDate: string | null;
  endDate: string | null;
  deposit: number | null;
  monthlyRent: number | null;
  maintenanceFee: number | null;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  autoTransfer: 'Y' | 'N' | null;
  createdAt: string | null;
  updatedAt: string | null;

  // 사용자 정보
  userName: string | null;
  userEmail: string | null;
  userPhone: string | null;

  // 호실 정보
  unitNumber: string | null;
  floor: number | null;
  unitType: string | null;
  unitArea: number | null;
  unitMonthlyRent: number | null;
  unitDeposit: number | null;
  unitStatus: string | null;
  unitImages?: string[] | string | null; // 호실 이미지 배열 또는 JSON 문자열

  // 건물 정보
  buildingId: number;
  buildingName: string | null;
  buildingAddress: string | null;

  // 계약서 이미지
  contractImageUrl: string | null;
}


const TABS = [
  { label: '계약내용', value: 'officetel' },
  { label: '계약서', value: 'document' },
  { label: '이체내역', value: 'payment' },
];

export default function ContractsScreen() {
  const { user } = useAuth();
  const { setTabBarVisible } = useTabBar();
  const [selectedTab, setSelectedTab] = useState('officetel');
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 월세/관리비 결제 이력 상태 추가
  const [paymentHistory, setPaymentHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 스크롤 관련 상태
  const lastScrollY = React.useRef(0);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // 스크롤 핸들러
  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const delta = currentScrollY - lastScrollY.current;

    // 스크롤이 50 이상일 때만 동작 (상단에선 항상 보임)
    if (currentScrollY > 50) {
      if (delta > 5) {
        // 아래로 스크롤
        setTabBarVisible(false);
      } else if (delta < -5) {
        // 위로 스크롤
        setTabBarVisible(true);
      }
    } else {
      // 상단에선 항상 보임
      setTabBarVisible(true);
    }

    lastScrollY.current = currentScrollY;
  };

  // 관리비/월세 결제 이력 조회 함수 (HanaBank ACCOUNT_TRANSACTIONS 기반)
  const fetchPaymentHistory = useCallback(async () => {
    try {
      setHistoryError(null);
      setHistoryLoading(true);
      const response = await paymentAPI.getByUserId(user?.id);

      if (response && response.success) {
        setPaymentHistory(response.data);
      } else {
        setHistoryError(response?.message || '이체 이력 조회 실패');
        setPaymentHistory(null);
      }
    } catch (err) {
      setHistoryError('이체 이력을 불러오는데 실패했습니다.');
      setPaymentHistory(null);
    } finally {
      setHistoryLoading(false);
    }
  }, [user?.id]);

  // API 데이터 로드
  useEffect(() => {
    if (user) {
      fetchContracts();
      fetchPaymentHistory();
    }
  }, [user, fetchPaymentHistory]);


  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await contractAPI.getByUserId(user!.id);

      const contractsData = response?.data || response || [];

      setContracts(Array.isArray(contractsData) ? contractsData : []);

    } catch (error: any) {
      setError('계약 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchContracts(), fetchPaymentHistory()]);
    setRefreshing(false);
  };



  // 월세/관리비 결제 이력 렌더링 함수 (통합)
  const renderPaymentHistorySection = () => {
    if (historyLoading) {
      return (
        <View style={styles.paymentList}>
          <Text style={[styles.paymentEmpty, { color: Colors.light.text }]}>
            이체 이력을 불러오는 중...
          </Text>
        </View>
      );
    }

    if (historyError) {
      return (
        <View style={styles.paymentList}>
          <Text style={[styles.paymentEmpty, { color: Colors.light.error }]}>
            {historyError}
          </Text>
        </View>
      );
    }

    // 모든 결제 이력을 통합하고 시간순으로 정렬
    const allPayments: any[] = [];

    // 결제 이력 처리 (API에서 반환된 데이터 직접 사용)
    if (paymentHistory && Array.isArray(paymentHistory) && paymentHistory.length > 0) {
      paymentHistory.forEach((payment: any) => {
        // paymentType이나 description에서 월세/관리비 구분
        let typeLabel = '결제';
        let paymentType = payment.paymentType || 'PAYMENT';

        if (payment.description) {
          if (payment.description.includes('관리비') || payment.description.includes('MANAGEMENT_FEE')) {
            typeLabel = '관리비';
            paymentType = 'MANAGEMENT_FEE';
          } else if (payment.description.includes('월세') || payment.description.includes('RENT')) {
            typeLabel = '월세';
            paymentType = 'RENT';
          } else if (payment.description.includes('자동이체')) {
            // 자동이체 설명에서 유형 추출
            if (payment.description.includes('관리비')) {
              typeLabel = '관리비';
              paymentType = 'MANAGEMENT_FEE';
            } else {
              typeLabel = '월세';
              paymentType = 'RENT';
            }
          }
        } else if (payment.paymentType) {
          if (payment.paymentType === 'MANAGEMENT_FEE') {
            typeLabel = '관리비';
          } else if (payment.paymentType === 'RENT') {
            typeLabel = '월세';
          }
        }

        allPayments.push({
          ...payment,
          type: paymentType,
          typeLabel: typeLabel,
          sortDate: new Date(payment.paymentDate || payment.createdAt || Date.now()),
        });
      });
    } else if (paymentHistory?.managementFeeTransactions?.length > 0 || paymentHistory?.rentTransactions?.length > 0) {
      // 기존 구조 지원 (혹시 API가 이런 구조로 반환할 경우)
      if (paymentHistory?.managementFeeTransactions?.length > 0) {
        paymentHistory.managementFeeTransactions.forEach((payment: any) => {
          allPayments.push({
            ...payment,
            type: 'MANAGEMENT_FEE',
            typeLabel: '관리비',
            sortDate: new Date(payment.paymentDate || payment.chargeDate),
          });
        });
      }

      if (paymentHistory?.rentTransactions?.length > 0) {
        paymentHistory.rentTransactions.forEach((payment: any) => {
          allPayments.push({
            ...payment,
            type: 'RENT',
            typeLabel: '월세',
            sortDate: new Date(payment.paymentDate),
          });
        });
      }
    }

    // 시간순으로 정렬 (최신순)
    allPayments.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

    if (allPayments.length === 0) {
      return (
        <View style={styles.paymentList}>
          <Text style={[styles.paymentEmpty, { color: Colors.light.text }]}>
            이체 이력이 없습니다.
          </Text>
        </View>
      );
    }

    // 날짜별로 그룹핑
    const groupedByDate = allPayments.reduce((groups: any, payment: any) => {
      const month = payment.sortDate.getMonth() + 1;
      const day = payment.sortDate.getDate();
      const dateKey = `${month}월 ${day}일`;
      const sortKey = `${payment.sortDate.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      if (!groups[sortKey]) {
        groups[sortKey] = {
          displayDate: dateKey,
          payments: []
        };
      }
      groups[sortKey].payments.push(payment);
      return groups;
    }, {});

    // 날짜별로 정렬된 키 배열 (최신순)
    const sortedDateKeys = Object.keys(groupedByDate).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB.getTime() - dateA.getTime();
    });

    return (
      <View style={styles.paymentList}>
        {sortedDateKeys.map((sortKey) => (
          <View key={sortKey}>
            {/* 날짜 헤더 */}
            <View style={styles.dateHeader}>
              <Text style={styles.dateHeaderText}>{groupedByDate[sortKey].displayDate}</Text>
            </View>

            {/* 해당 날짜의 거래 목록 */}
            {groupedByDate[sortKey].payments.map((payment: any, index: number) => (
              <TouchableOpacity key={`payment-${payment.type}-${sortKey}-${index}`} style={styles.paymentItem}>
                <View style={styles.paymentMainInfo}>
                  <View style={styles.paymentLeftInfo}>
                    <Text style={styles.paymentTypeText}>{payment.typeLabel}</Text>
                    <Text style={styles.paymentTimeText}>
                      {`${String(payment.sortDate.getHours()).padStart(2, '0')}:${String(payment.sortDate.getMinutes()).padStart(2, '0')}`}
                    </Text>
                  </View>
                  <View style={styles.paymentRightInfo}>
                    <Text style={styles.paymentAmountText}>
                      -{payment.amount?.toLocaleString()}원
                    </Text>
                    <Text style={[styles.paymentStatusText, {
                      color: (payment.status === 'PAID' || payment.status === 'COMPLETED')
                        ? Colors.light.primary
                        : payment.status === 'PENDING'
                        ? '#FF9800'
                        : '#F44336'
                    }]}>
                      {payment.status === 'PAID' || payment.status === 'COMPLETED' ? '이체완료' :
                       payment.status === 'PENDING' ? '대기' :
                       payment.status === 'OVERDUE' ? '연체' :
                       payment.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const filteredContracts = contracts || [];

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* 상단 헤더 */}
      <HanaHeader
        title="계약관리"
        showBackButton={false}
      />

      <View style={styles.whiteBackground}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#009178']}
              tintColor="#009178"
            />
          }
        >
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#009178" />
            <Text style={styles.loadingText}>계약 정보를 불러오는 중...</Text>
          </View>
        )}

        {error && !loading && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchContracts}>
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && (
          <>
            {/* 카드형 탭 버튼 */}
            <View style={styles.stickyFilterContainer}>
              <View style={styles.filterContainer}>
                {TABS.map((tab) => (
                  <TouchableOpacity
                    key={tab.value}
                    style={[
                      styles.filterButton,
                      selectedTab === tab.value && styles.filterButtonActive
                    ]}
                    onPress={() => setSelectedTab(tab.value)}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      selectedTab === tab.value && styles.filterButtonTextActive
                    ]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 오피스텔 섹션 */}
            {selectedTab === 'officetel' && (
            <View style={styles.contractsSection}>
              {filteredContracts && filteredContracts.length > 0 ? (
                filteredContracts.map((contract) => (
                    <View key={contract.id} style={styles.serviceInfoSection}>
                      <TouchableOpacity
                        style={styles.contractCard}
                        onPress={() => {/* 계약 상세 보기 */}}
                      >
                        <Image
                          source={{
                            uri: getUnitImage(contract.unitImages)
                          }}
                          style={styles.contractImage}
                          onError={() => {}}
                        />
                        <View style={styles.contractInfo}>
                          <View style={styles.contractHeader}>
                            <Text style={styles.buildingName}>{contract.buildingName || '미지정 건물'}</Text>
                            <View style={styles.contractStatusContainer}>
                              <Text style={styles.contractStatus}>
                                {contract.status === 'ACTIVE' ? '진행중' :
                                 contract.status === 'EXPIRED' ? '만료' :
                                 contract.status === 'TERMINATED' ? '종료' : '기타'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.unitInfo}>
                            {contract.unitNumber ? `${contract.unitNumber}호` : '-'}
                            {(contract.unitType || contract.unitArea) ? ` (${contract.unitType ? getUnitTypeText(contract.unitType) : ''}${contract.unitType && contract.unitArea ? ', ' : ''}${contract.unitArea ? `${contract.unitArea}㎡` : ''})` : ''}
                          </Text>
                          <Text style={styles.addressText}>{contract.buildingAddress || '-'}</Text>
                          <View style={styles.contractPricing}>
                            <Text style={styles.monthlyRent}>{formatCurrency(contract.monthlyRent)}</Text>
                            <Text style={styles.deposit}>보증금 {formatCurrency(contract.deposit)}</Text>
                          </View>
                          <View style={styles.contractPeriod}>
                            <Text style={styles.periodText}>
                              {formatDate(contract.startDate)} ~ {formatDate(contract.endDate)}
                            </Text>
                            {contract.autoTransfer === 'Y' && (
                              <Text style={styles.autoTransferText}>자동이체</Text>
                            )}
                          </View>
                        </View>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconContainer}>
                    <MaterialIcons name="description" size={80} color="#d1d5db" />
                  </View>
                  <Text style={styles.emptyTitle}>
                    아직 등록된 계약이 없습니다
                  </Text>
                  <Text style={styles.emptySubtext}>
                    새로운 계약을 체결하시면\n이곳에서 한눈에 관리할 수 있습니다
                  </Text>
                  <TouchableOpacity style={styles.emptyActionButton}>
                    <MaterialIcons name="add" size={20} color="white" />
                    <Text style={styles.emptyActionText}>계약 추가하기</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            )}

            {/* 계약서 섹션 */}
            {selectedTab === 'document' && (
              <View style={styles.contractDocumentSection}>
                {(() => {
                  const contractData = filteredContracts.length > 0 ? filteredContracts[0] : null;

                  return contractData?.contractImageUrl ? (
                    <View style={styles.fullImageContainer}>
                      <Image
                        source={{ uri: contractData.contractImageUrl }}
                        style={styles.fullContractImage}
                        resizeMode="contain"
                      />
                    </View>
                  ) : (
                    <View style={styles.noImageFullContainer}>
                      <MaterialIcons name="image-not-supported" size={64} color={Colors.light.textSecondary} />
                      <Text style={styles.noImageFullText}>등록된 계약서 이미지가 없습니다</Text>
                    </View>
                  );
                })()}
              </View>
            )}

            {/* 이체내역 섹션 */}
            {selectedTab === 'payment' && (
              <View style={styles.serviceInfoSection}>
                <View style={styles.paymentHistoryCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionSubtitle}>이체 내역</Text>
                    <TouchableOpacity
                      style={styles.refreshButton}
                      onPress={fetchPaymentHistory}
                      disabled={historyLoading}
                    >
                      <MaterialIcons
                        name="refresh"
                        size={20}
                        color={historyLoading ? '#ccc' : '#009178'}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.paymentHistoryContainer}>
                    {renderPaymentHistorySection()}
                  </View>
                </View>
              </View>
            )}
          </>
        )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  whiteBackground: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  errorText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 22,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#009178',
    borderRadius: 6,
    marginTop: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },

  // 언더라인 탭 스타일
  stickyFilterContainer: {
    backgroundColor: Colors.light.background,
    paddingTop: 0,
    paddingBottom: 0,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterButtonActive: {
    borderBottomColor: Colors.light.primary,
  },
  filterButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.light.textSecondary,
  },
  filterButtonTextActive: {
    color: Colors.light.primary,
    fontWeight: '700',
  },

  // 계약 목록
  contractsSection: {
    paddingTop: 0,
  },
  serviceInfoSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  contractImage: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.light.border,
  },
  contractInfo: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  buildingName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
    marginRight: 8,
  },
  contractStatusContainer: {
    backgroundColor: `${Colors.light.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  contractStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  unitInfo: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  contractPricing: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  monthlyRent: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 6,
  },
  deposit: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  contractPeriod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    flex: 1,
  },
  autoTransferText: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '600',
    backgroundColor: `${Colors.light.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  // 빈 상태
  emptyContainer: {
    flex: 1,
    paddingVertical: 80,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#f3f4f6',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    maxWidth: 260,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#009178',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  // 추천 타이틀
  recommendTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
    marginLeft: 16,
    marginBottom: 12,
    marginTop: 8,
  },

  // 계약서 섹션 스타일
  contractDocumentSection: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  fullImageContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.light.background,
  },
  fullContractImage: {
    width: '100%',
    height: '100%',
    minHeight: 500,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  noImageFullContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  noImageFullText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  contractDocumentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  documentItemLast: {
    borderBottomWidth: 0,
  },
  contractImageContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  contractDocumentImage: {
    width: '100%',
    height: 400,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  noImageContainer: {
    marginTop: 16,
    padding: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  documentIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: `${Colors.light.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  documentSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },

  // 결제 이력 관련 스타일
  paymentHistoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  refreshButton: {
    padding: 4,
  },
  paymentHistoryContainer: {
    padding: 0,
  },
  paymentEmpty: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
  // 금융앱 스타일
  paymentList: {
    backgroundColor: '#fff',
  },
  paymentItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  paymentMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLeftInfo: {
    flex: 1,
  },
  paymentTypeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  paymentTimeText: {
    fontSize: 13,
    color: '#888',
  },
  paymentRightInfo: {
    alignItems: 'flex-end',
  },
  paymentAmountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // 날짜 헤더 스타일
  dateHeader: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
});
