import { HanaHeader } from '@/components/HanaHeader';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useTabBar } from '@/contexts/TabBarContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { mobileApi, loanAPI } from '@/services/mobileApi';
import { LoanApplication } from '@/types/loan';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View, Dimensions, Animated, ActivityIndicator } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { formatKoreanCurrency } from '@/utils/formatUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

// 대출금 보내기 버튼 컴포넌트 (AsyncStorage 확인 포함)
const LoanTransferButton = ({ application, router, loanPayments }: { application: any, router: any, loanPayments: any[] }) => {
  const [isContractCompleted, setIsContractCompleted] = useState(false);

  useEffect(() => {
    const checkCompletion = async () => {
      try {
        const contractInfo = await AsyncStorage.getItem(`contract_completed_${application.id}`);
        setIsContractCompleted(contractInfo !== null);
      } catch (error) {
        setIsContractCompleted(false);
      }
    };
    checkCompletion();
  }, [application.id]);

  // 송금 완료 여부 확인
  const hasTransferHistory = loanPayments.some(payment =>
    payment.applicationId === application.id ||
    payment.loanId === application.id ||
    payment.contractNumber === application.id.split(':')[1]
  );

  if (hasTransferHistory) {
    return null;
  }

  const shouldShowButton =
    application.status === '송금가능' ||
    application.status === '계약생성완료' ||
    application.status === '계약완료' ||
    application.status === 'CONTRACT_CREATED' ||
    application.currentStep === 6 ||
    application.currentStep === 7 ||
    application.id.includes(':') ||
    isContractCompleted ||
    (application.currentStep >= 4 &&
     (application.status === 'APPROVED' ||
      application.status === '승인완료' ||
      application.status === 'DECISION')) ||
    (application.currentStep >= 5);

  if (!shouldShowButton) return null;

  return (
    <View style={styles.actionButtonContainer}>
      <TouchableOpacity
        style={styles.sendMoneyButton}
        onPress={() => {
          router.push({
            pathname: '/loan-transfer',
            params: {
              applicationId: application.id,
              loanAmount: application.maxAmount,
              loanType: application.loanType,
              contractNumber: application.id.includes(':') ? application.id.split(':')[1] : ''
            }
          });
        }}
      >
        <Text style={styles.sendMoneyButtonText}>대출금 보내기</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function MyPageScreen() {
  const { user, logout } = useAuth();
  const { setTabBarVisible } = useTabBar();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  // 계좌 목록 상태 추가
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [securitiesAccounts, setSecuritiesAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 스크롤 관련 상태
  const lastScrollY = useRef(0);
  const [error, setError] = useState<string | null>(null);

  // 카드 덱 애니메이션 관련
  const [currentTopCardIndex, setCurrentTopCardIndex] = useState(0);
  const flipAnimation = useRef(new Animated.Value(0)).current;

  // 대출 상황 상태 추가
  const [loanApplications, setLoanApplications] = useState<LoanApplication[]>([]);
  const [loanLoading, setLoanLoading] = useState(false);
  const [loanError, setLoanError] = useState<string | null>(null);
  const [contractCompletedMap, setContractCompletedMap] = useState<{[key: string]: any}>({});

  // 대출 송금 내역 상태 추가
  const [loanPayments, setLoanPayments] = useState<any[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // 대출 섹션 확장 상태
  const [isLoanStatusExpanded, setIsLoanStatusExpanded] = useState(false);
  const [isLoanPaymentExpanded, setIsLoanPaymentExpanded] = useState(false);
  // 각 대출 카드의 단계 확장 상태
  const [expandedLoanSteps, setExpandedLoanSteps] = useState<{ [key: string]: boolean }>({});

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

  // 모든 계좌 정보 조회 함수 (은행계좌 + 증권계좌)
  const fetchAllAccounts = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await mobileApi.getMyAccounts(user?.id);

      if (response && response.success) {
        setBankAccounts(response.bankAccounts || []);
        setSecuritiesAccounts(response.securitiesAccounts || []);
      } else {
        setError(response?.message || '계좌 조회에 실패했습니다.');
        setBankAccounts([]);
        setSecuritiesAccounts([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`계좌 정보 로드 실패: ${errorMessage}`);
      setBankAccounts([]);
      setSecuritiesAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // 대출 상황 조회 함수
  const fetchLoanStatus = useCallback(async () => {
    try {
      setLoanError(null);
      setLoanLoading(true);

      let response;
      try {
        response = await mobileApi.getLoanStatus();
      } catch (firstError) {
        try {
          response = await loanAPI.getByUserId(user?.id);
        } catch (secondError) {
          try {
            response = await mobileApi.get(`/api/loans/user/${user?.id}`);
          } catch (thirdError) {
            throw firstError;
          }
        }
      }

      if (response && response.success) {
        setLoanApplications(response.applications || []);
      } else if (response && Array.isArray(response)) {
        setLoanApplications(response);
      } else {
        setLoanError(response?.message || '대출 정보가 없습니다.');
        setLoanApplications([]);
      }
    } catch (err) {
      setLoanError('대출 상황을 불러오는데 실패했습니다.');
      setLoanApplications([]);
    } finally {
      setLoanLoading(false);
    }
  }, []);

  // 대출 송금 내역 조회 함수
  const fetchLoanPayments = useCallback(async () => {
    try {
      setPaymentError(null);
      setPaymentLoading(true);
      const response = await mobileApi.getLoanPaymentHistory();

      // API 응답 처리 (mobileApi가 전체 응답 객체를 반환)
      if (response && response.success === true && response.data) {
        setLoanPayments(response.data);
      } else if (Array.isArray(response)) {
        // 직접 배열로 반환된 경우
        setLoanPayments(response);
      } else {
        setPaymentError(response?.message || '대출 송금 내역 조회 실패');
        setLoanPayments([]);
      }
    } catch (err) {
      setPaymentError('대출 송금 내역을 불러오는데 실패했습니다.');
      setLoanPayments([]);
    } finally {
      setPaymentLoading(false);
    }
  }, []);





  // 새로고침 함수
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchAllAccounts(), fetchLoanStatus(), fetchLoanPayments()]);
    setRefreshing(false);
  }, [fetchAllAccounts, fetchLoanStatus, fetchLoanPayments]);


  // 카드를 뒤로 넘기는 함수
  const handleCardPress = useCallback(() => {
    const totalCards = bankAccounts.length + securitiesAccounts.length + 1; // +1 for add account card
    if (totalCards <= 1) return;

    // 다음 카드 인덱스 계산
    const nextIndex = (currentTopCardIndex + 1) % totalCards;

    // 카드 슬라이드 애니메이션
    Animated.timing(flipAnimation, {
      toValue: nextIndex,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // 상태 업데이트
    setCurrentTopCardIndex(nextIndex);
  }, [bankAccounts.length, securitiesAccounts.length, flipAnimation, currentTopCardIndex]);

  // 컴포넌트 마운트 시 데이터 조회
  useEffect(() => {
    fetchAllAccounts();
    fetchLoanStatus();
    fetchLoanPayments();
  }, [fetchAllAccounts, fetchLoanStatus, fetchLoanPayments]);

  // 파라미터 변경 감지해서 자동 새로고침
  useEffect(() => {
    if (params.refresh === 'true' && params.timestamp) {
      handleRefresh();
    }
  }, [params.refresh, params.timestamp, handleRefresh]);

  // 계좌 데이터 변경시 현재 카드 인덱스 및 애니메이션 리셋
  useEffect(() => {
    setCurrentTopCardIndex(0);
    flipAnimation.setValue(0);
  }, [bankAccounts.length, securitiesAccounts.length, flipAnimation]);


  // 대출 송금 내역 렌더링 함수
  const renderLoanPaymentSection = () => {
    if (paymentLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>대출 송금 내역을 불러오는 중...</Text>
        </View>
      );
    }

    if (paymentError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{paymentError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLoanPayments}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (loanPayments.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>대출 송금 내역이 없습니다</Text>
          <Text style={styles.emptySubText}>대출금을 송금하면 내역이 표시됩니다</Text>
        </View>
      );
    }

    return (
      <View>
        {loanPayments.map((payment) => (
          <View key={payment.paymentId} style={styles.paymentCard}>
            {/* 헤더: 제목 + 상태 */}
            <View style={styles.paymentCardHeader}>
              <View style={styles.paymentHeaderLeft}>
                <Text style={styles.paymentTitle}>대출금 송금</Text>
                <View style={[
                  styles.paymentStatusBadge,
                  { backgroundColor: payment.status === 'COMPLETED' ? Colors.light.success + '15' : Colors.light.warning + '15' }
                ]}>
                  <Text style={[
                    styles.paymentStatusText,
                    { color: payment.status === 'COMPLETED' ? Colors.light.success : Colors.light.warning }
                  ]}>
                    {payment.status === 'COMPLETED' ? '송금완료' : payment.status}
                  </Text>
                </View>
              </View>
            </View>

            {/* 송금 금액 */}
            <View style={styles.paymentAmountRow}>
              <Text style={styles.paymentAmountLabel}>송금금액</Text>
              <Text style={styles.paymentAmount}>
                {(payment.paymentAmount / 10000).toLocaleString()}만원
              </Text>
            </View>

            {/* 송금 정보 */}
            <View style={styles.paymentInfoSection}>
              <View style={styles.paymentInfoRow}>
                <Text style={styles.paymentInfoLabel}>받는 분</Text>
                <Text style={styles.paymentInfoValue}>{payment.landlordName}</Text>
              </View>
              <View style={styles.paymentInfoRow}>
                <Text style={styles.paymentInfoLabel}>계좌번호</Text>
                <Text style={styles.paymentInfoValue}>{payment.landlordAccount}</Text>
              </View>
              <View style={styles.paymentInfoRow}>
                <Text style={styles.paymentInfoLabel}>송금일시</Text>
                <Text style={styles.paymentInfoValue}>
                  {new Date(payment.executedAt || payment.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  }).replace(/\.$/, '')}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };



  // 대출 상태에 따른 진행률 계산
  const getProgressPercentage = (application: LoanApplication): number => {
    // currentStep 기반으로 정확한 진행률 계산
    const totalSteps = 5;
    const currentStep = application.currentStep || 1;

    // 디버깅용 로그

    // 각 단계별 진행률 (20%씩 증가)
    return Math.min((currentStep / totalSteps) * 100, 100);
  };

  // 대출 상태에 따른 색상
  const getStatusColor = (status: string): string => {
    switch (status) {
      case '서류제출': return Colors.light.primary;
      case 'SUBMITTED': return Colors.light.primary;
      case '서류심사': return '#FFD700';
      case '승인대기': return '#FF9800';
      case '승인완료': return Colors.light.success;
      case '계약완료': return Colors.light.success;
      case '대출실행': return Colors.light.success;
      case '반려': return Colors.light.error;
      // 영어 상태값들 추가
      case 'APPROVED': return Colors.light.success;
      case 'DECISION': return Colors.light.success;
      case 'PENDING': return '#FF9800';
      case 'REJECTED': return Colors.light.error;
      default: return Colors.light.textSecondary;
    }
  };

  // 대출 상태 텍스트 변환
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'SUBMITTED': return '서류제출 완료';
      case 'APPROVED': return '승인 완료';
      default: return status;
    }
  };


  // 대출 단계 렌더링
  const renderLoanSteps = (application: LoanApplication, isExpanded: boolean) => {
    const currentStep = application.currentStep || 1;

    const steps = [
      { title: '한도/금리 조회', completed: currentStep > 1 },
      { title: '필요서류 제출', completed: currentStep >= 2 },
      { title: '서류심사', completed: currentStep > 2 },
      { title: '대출 계약서 작성 및 희망일 예약', completed: currentStep > 3 },
      { title: '대출 실행', completed: currentStep > 4 }
    ];

    // 접혀있을 때는 현재 단계만 표시
    if (!isExpanded) {
      const currentStepInfo = steps[currentStep];
      return (
        <View style={styles.currentStepOnly}>
          <View style={styles.currentStepIndicator}>
            <View style={[styles.stepIconSmall, styles.stepCurrent]}>
              <Text style={styles.stepIconTextSmall}>⋯</Text>
            </View>
            <Text style={styles.currentStepText}>{currentStepInfo?.title || steps[0].title}</Text>
          </View>
          <Text style={styles.expandHint}>전체 단계 보기 ▼</Text>
        </View>
      );
    }

    // 펼쳐졌을 때는 타임라인 스타일로 전체 표시
    return (
      <View style={styles.loanSteps}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const isCurrent = index === currentStep;

          return (
            <View key={index} style={styles.timelineStepItem}>
              <View style={styles.timelineIconContainer}>
                <View style={[
                  styles.timelineIcon,
                  step.completed ? styles.stepCompleted :
                  isCurrent ? styles.stepCurrent : styles.stepPending
                ]}>
                  <Text style={styles.stepIconText}>
                    {step.completed ? '✓' : isCurrent ? '⋯' : index + 1}
                  </Text>
                </View>
                {!isLast && (
                  <View style={[
                    styles.timelineLine,
                    (step.completed || isCurrent) ? styles.timelineLineActive : styles.timelineLineInactive
                  ]} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={[
                  styles.stepText,
                  isCurrent && styles.stepTextCurrent
                ]}>{step.title}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // 대출 상황 섹션 렌더링
  const renderLoanSection = () => {
    if (loanLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>대출 상황을 불러오는 중...</Text>
        </View>
      );
    }

    if (loanError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{loanError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLoanStatus}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const activeLoanApplications = loanApplications.filter(application => {
      const hasTransferHistory = loanPayments.some(payment =>
        payment.applicationId === application.id ||
        payment.loanId === application.id ||
        payment.contractNumber === application.id.split(':')[1]
      );

      // 송금 완료된 대출은 제외, 완전히 완료된 대출도 제외
      const isFullyCompleted = application.status === 'COMPLETED' ||
                              application.status === '완료';

      return !isFullyCompleted && !hasTransferHistory;
    });

    // 진행 중인 대출이 없으면 메시지 표시
    if (activeLoanApplications.length === 0) {
      return (
        <View style={styles.noLoanContainer}>
          <Text style={styles.noLoanText}>진행 중인 대출이 없습니다.</Text>
        </View>
      );
    }

    return (
      <View>

        {activeLoanApplications.map((application) => {
          const isStepsExpanded = expandedLoanSteps[application.id] || false;

          return (
            <View key={application.id} style={styles.loanCard}>
              {/* 헤더: 대출 타입 + 상태 + 금액 + 진행률 */}
              <View style={styles.loanCardHeader}>
                <View style={styles.loanHeaderRow}>
                  <View style={styles.loanHeaderLeft}>
                    <Text style={styles.loanTitle}>{application.loanType}</Text>
                    <View style={[styles.loanStatusBadge, { backgroundColor: getStatusColor(application.status) + '15' }]}>
                      <Text style={[styles.loanStatusText, { color: getStatusColor(application.status) }]}>
                        {getStatusText(application.status)}
                      </Text>
                    </View>
                  </View>
                </View>

                {!(application.status === 'SUBMITTED' && application.maxAmount === 0) && (
                  <View style={styles.loanAmountRow}>
                    <Text style={styles.loanAmountLabel}>대출한도</Text>
                    <Text style={styles.loanAmount}>{formatKoreanCurrency(application.maxAmount)}</Text>
                  </View>
                )}

                {/* 진행률 바 + 퍼센트 */}
                <View style={styles.progressSection}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${getProgressPercentage(application)}%` }]} />
                  </View>
                  <Text style={styles.progressPercent}>{getProgressPercentage(application)}%</Text>
                </View>
              </View>

              {/* 대출 단계 - 토글 가능 */}
              <TouchableOpacity
                style={styles.loanStepsSection}
                onPress={() => setExpandedLoanSteps(prev => ({
                  ...prev,
                  [application.id]: !prev[application.id]
                }))}
                activeOpacity={0.7}
              >
                {renderLoanSteps(application, isStepsExpanded)}
              </TouchableOpacity>
            
            {/* 대출 단계별 액션 버튼 */}
            {application.currentStep === 5 && application.status === '계약완료' && (
              <View style={styles.actionButtonContainer}>
                <TouchableOpacity 
                  style={styles.executionButton}
                  onPress={() => router.push({
                    pathname: '/loan-execution',
                    params: {
                      loanId: application.id,
                      loanAmount: application.maxAmount,
                      loanType: application.loanType
                    }
                  })}
                >
                  <Text style={styles.executionButtonText}>대출 실행하기</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* 서류심사 완료 후 계약서 작성 버튼 (계약서 생성 완료 전까지만) */}
            {application.currentStep >= 3 &&
             (application.status === '승인완료' || application.status === '서류심사' || application.status === '심사완료' ||
              application.status === 'APPROVED' || application.status === 'DECISION') &&
             application.currentStep < 6 &&
             !(application.status === '계약생성완료' || application.status === '계약완료' || application.status === 'CONTRACT_CREATED' || application.id.includes(':')) && (
              <View style={styles.actionButtonContainer}>
                <TouchableOpacity
                  style={styles.contractButton}
                  onPress={() => router.push({
                    pathname: '/loan-contract',
                    params: {
                      applicationId: application.id,
                      approvedLimit: application.maxAmount,
                      approvedRate: application.interestRate || 3.5,
                      approvedTerm: application.loanTerm || 24
                    }
                  })}
                >
                  <Text style={styles.contractButtonText}>계약서 작성하기</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 대출금 보내기 버튼 */}
            <LoanTransferButton application={application} router={router} loanPayments={loanPayments} />

              <View style={styles.expectedDateContainer}>
                <Text style={styles.expectedDateLabel}>예상 완료일</Text>
                <Text style={styles.expectedDateValue}>
                  {(() => {
                    const today = new Date();
                    const expectedDate = new Date(today);
                    expectedDate.setDate(today.getDate() + 3); // 오늘로부터 3일 뒤
                    return expectedDate.toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    });
                  })()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: logout }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: '#c8e6c9' }]}>
      <StatusBar style="dark" />

      {/* 상단 헤더 */}
      <HanaHeader
        title=""
        variant="compact"
      />

      <LinearGradient
        colors={['#c8e6c9', '#e8f5e8', '#f0f8f0', '#ffffff']}
        style={styles.gradientContent}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loadingText}>로딩 중...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
        {/* 사용자 정보 카드 */}
        <View style={[styles.sectionTight, { paddingHorizontal: 0, paddingTop: 0, marginTop: 20 }]}>
          <View style={styles.userCard}>
          <View style={styles.userInfoHeader}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                안녕하세요, {user?.name || '사용자'}님!
              </Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>로그아웃</Text>
              <IconButton
                icon="chevron-right"
                size={20}
                iconColor={Colors.light.textSecondary}
                style={styles.logoutIcon}
              />
            </TouchableOpacity>
          </View>

          {/* 인증/보안, 영업점, 고객센터 메뉴 */}
          <View style={styles.quickMenuContainer}>
            <TouchableOpacity style={styles.quickMenuItem}>
              <IconButton
                icon="shield-check"
                size={24}
                iconColor={Colors.light.primary}
                style={styles.quickMenuIcon}
              />
              <Text style={styles.quickMenuText}>인증/보안</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickMenuItem}>
              <IconButton
                icon="map-marker"
                size={24}
                iconColor={Colors.light.primary}
                style={styles.quickMenuIcon}
              />
              <Text style={styles.quickMenuText}>영업점</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickMenuItem}>
              <IconButton
                icon="help-circle"
                size={24}
                iconColor={Colors.light.primary}
                style={styles.quickMenuIcon}
              />
              <Text style={styles.quickMenuText}>고객센터</Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>

        {/* 내 계좌 섹션 */}
        <View style={[styles.sectionTight, { paddingHorizontal: 16 }]}>
        {loading ? (
          <View style={styles.cardDeckContainer}>
            <View style={[styles.cardSliderItem, styles.firstCardSliderItem]}>
              <View style={styles.accountSlideCard}>
                <Text style={styles.bankBookLoadingText}>계좌 정보를 불러오는 중...</Text>
              </View>
            </View>
          </View>
        ) : error ? (
          <View style={styles.bankBookContainer}>
            <View style={styles.bankBookErrorCard}>
              <Text style={styles.bankBookErrorText}>{error}</Text>
              <TouchableOpacity style={styles.bankBookRetryButton} onPress={fetchAllAccounts}>
                <Text style={styles.bankBookRetryText}>다시 시도</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (bankAccounts.length === 0 && securitiesAccounts.length === 0) ? (
          <View style={styles.bankBookContainer}>
            <View style={styles.bankBookEmptyCard}>
              <Text style={styles.bankBookEmptyTitle}>등록된 계좌가 없습니다</Text>
              <Text style={styles.bankBookEmptySubtext}>하나금융 계좌를 연결하여 편리하게 관리해보세요</Text>
              <TouchableOpacity
                style={styles.bankBookEmptyButton}
                onPress={() => router.push('/bank-account-link')}
              >
                <Text style={styles.bankBookEmptyButtonText}>계좌 연결하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.bankBookContainer}>

                  {/* 카드 슬라이더 컨테이너 */}
                  <View style={styles.cardDeckContainer}>
                    {(() => {
                      const allAccounts = [...bankAccounts, ...securitiesAccounts];
                      const totalCards = allAccounts.length;

                      if (totalCards === 0) return null;

                      return (
                        <ScrollView
                          horizontal
                          pagingEnabled={false}
                          snapToInterval={screenWidth - 16}
                          decelerationRate="fast"
                          showsHorizontalScrollIndicator={false}
                          onScroll={(event) => {
                            const newIndex = Math.round(event.nativeEvent.contentOffset.x / (screenWidth - 16));
                            setCurrentTopCardIndex(newIndex);
                          }}
                          scrollEventThrottle={16}
                          style={styles.cardSlider}
                        >
                          {allAccounts.map((account, index) => {
                            const isBank = index < bankAccounts.length;
                            return (
                              <View key={`${account.accountNumber}-${index}`} style={[
                                styles.cardSliderItem,
                                index === 0 && styles.firstCardSliderItem
                              ]}>
                                <View style={styles.accountSlideCard}>
                                  <View style={styles.topSection}>
                                    <View style={styles.accountCardHeader}>
                                      <View style={styles.leftSection}>
                                        <Text style={styles.assetLabel}>내 자산</Text>
                                        <Text style={styles.accountNumber}>
                                          {account?.accountNumber?.replace(/(\d{3})(\d{4})(\d{4})(\d{3})/, '$1-$2-$3-$4') || ''}
                                        </Text>
                                      </View>
                                      <Text style={styles.bankName}>
                                        {isBank ? '하나은행' : '하나증권'}
                                      </Text>
                                    </View>

                                    <View style={styles.balanceSection}>
                                      <Text style={styles.balanceAmount}>
                                        {(account?.balance || 0).toLocaleString()} 원
                                      </Text>
                                      <Image
                                        source={require('@/assets/images/money_icon.png')}
                                        style={styles.moneyIcon}
                                        resizeMode="contain"
                                      />
                                    </View>
                                  </View>
                                </View>
                              </View>
                            );
                          })}

                          {/* 자산 연결 카드 */}
                          <View style={styles.cardSliderItem}>
                            <TouchableOpacity
                              style={styles.addAccountCard}
                              onPress={() => router.push('/bank-account-link')}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.addAccountIcon}>+</Text>
                              <Text style={styles.addAccountText}>자산 연결</Text>
                            </TouchableOpacity>
                          </View>
                        </ScrollView>
                      );
                    })()}
                  </View>

                  {/* 페이지 인디케이터 - 점 형태 (카드 밖) */}
                  {(() => {
                    const allAccounts = [...bankAccounts, ...securitiesAccounts];
                    const totalCards = allAccounts.length + 1; // +1 for add account card

                    if (totalCards > 1) {
                      return (
                        <View style={styles.accountPageIndicator}>
                          {Array.from({ length: totalCards }).map((_, index) => (
                            <View
                              key={index}
                              style={[
                                styles.accountIndicatorDot,
                                index === currentTopCardIndex && styles.accountIndicatorDotActive
                              ]}
                            />
                          ))}
                        </View>
                      );
                    }
                    return null;
                  })()}
          </View>
        )}
        </View>

        {/* 내 대출 상황 섹션 - 진행중인 대출이 있거나 송금 내역이 있을 때 표시 */}
        {(() => {
          // 진행중인 대출 개수 확인
          const activeLoanCount = loanApplications.filter(application => {
            const hasTransferHistory = loanPayments.some(payment =>
              payment.applicationId === application.id ||
              payment.loanId === application.id ||
              payment.contractNumber === application.id.split(':')[1]
            );
            const isFullyCompleted = application.status === 'COMPLETED' ||
                                    application.status === '완료';
            return !isFullyCompleted && !hasTransferHistory;
          }).length;

          // 진행중인 대출이 있거나 송금 내역이 있으면 섹션 표시
          if (activeLoanCount > 0 || loanPayments.length > 0) {
            return (
              <View style={[styles.section, { paddingHorizontal: 0 }]}>
                <View style={styles.loanMainCard}>
                  <View style={styles.loanHeaderSection}>
                    <Image
                      source={require('@/assets/images/loan_icon6.png')}
                      style={styles.loanHeaderIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.loanMainTitle}>대출</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.loanMenuItem, { borderTopWidth: 1, borderTopColor: '#e0e0e0' }]}
                    onPress={() => router.push('/(tabs)/loans')}
                  >
                    <Text style={styles.loanMenuText}>대출신청</Text>
                    <View style={{ width: 48, height: 48 }} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.loanMenuItem}
                    onPress={() => setIsLoanStatusExpanded(!isLoanStatusExpanded)}
                  >
                    <Text style={styles.loanMenuText}>내 대출 상황</Text>
                    <IconButton
                      icon={isLoanStatusExpanded ? "minus" : "plus"}
                      size={24}
                      iconColor={Colors.light.textSecondary}
                      style={styles.loanMenuIcon}
                    />
                  </TouchableOpacity>

                  {isLoanStatusExpanded && (
                    <View style={styles.expandedContent}>
                      {renderLoanSection()}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.loanMenuItem}
                    onPress={() => setIsLoanPaymentExpanded(!isLoanPaymentExpanded)}
                  >
                    <Text style={styles.loanMenuText}>대출금 송금</Text>
                    <IconButton
                      icon={isLoanPaymentExpanded ? "minus" : "plus"}
                      size={24}
                      iconColor={Colors.light.textSecondary}
                      style={styles.loanMenuIcon}
                    />
                  </TouchableOpacity>

                  {isLoanPaymentExpanded && loanPayments.length > 0 && (
                    <View style={styles.expandedContent}>
                      {renderLoanPaymentSection()}
                    </View>
                  )}
                </View>
              </View>
            );
          }
          return null;
        })()}

        {/* 자동이체 관리 섹션 */}
        <View style={[styles.section, { paddingHorizontal: 0 }]}>
        <View style={styles.transparentCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>자동이체 관리</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            월세 자동결제를 설정하고 관리할 수 있습니다
          </Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/auto-payment-manage')}
          >
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuItemText}>자동이체 관리</Text>
            </View>
            <IconButton
              icon="chevron-right"
              size={20}
              iconColor={Colors.light.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/auto-payment-setup')}
          >
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuItemText}>자동이체 설정</Text>
            </View>
            <IconButton
              icon="chevron-right"
              size={20}
              iconColor={Colors.light.textSecondary}
            />
          </TouchableOpacity>
        </View>
        </View>

        {/* 추가 마이페이지 기능들 */}
        <View style={[styles.section, { paddingHorizontal: 0 }]}>
        <View style={styles.transparentCard}>
          <Text style={styles.menuTitle}>설정</Text>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>개인정보 수정</Text>
            <IconButton icon="chevron-right" size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>알림 설정</Text>
            <IconButton icon="chevron-right" size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>보안 설정</Text>
            <IconButton icon="chevron-right" size={20} />
          </TouchableOpacity>
        </View>
        </View>
        </ScrollView>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#c8e6c9',
  },
  gradientContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 24,
  },
  sectionTight: {
    marginBottom: -8,
  },
  userCard: {
    marginBottom: 4,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  transparentCard: {
    backgroundColor: 'transparent',
    padding: 16,
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  myIconContainer: {
    alignItems: 'center',
    marginRight: 4,
  },
  personIcon: {
    margin: 0,
  },
  myText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: -8,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 0,
  },
  logoutText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginRight: -8,
  },
  logoutIcon: {
    margin: 0,
  },
  quickMenuContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 16,
    gap: 28,
  },
  quickMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickMenuIcon: {
    margin: 0,
    marginRight: -4,
  },
  quickMenuText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  loanMainCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loanHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  loanHeaderIcon: {
    width: 28,
    height: 28,
    marginRight: 12,
  },
  loanMainTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.light.text,
  },
  loanDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 0,
  },
  loanMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  loanMenuText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
  },
  loanMenuIcon: {
    margin: 0,
  },
  expandedContent: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.light.text,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    paddingHorizontal: 16,
    paddingBottom: 16,
    lineHeight: 20,
  },

  // 추가 스타일
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  errorContainer: {
    padding: 32,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.light.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 20,
  },
  accountCountText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: 16,
    paddingHorizontal: 16,
  },

  // 투명한 섹션 카드 (배경 없음)
  transparentSectionCard: {
    backgroundColor: 'transparent',
    padding: 0,
    marginBottom: 24,
  },

  // 대출 상황 섹션 스타일
  loanStatusContainer: {
    paddingHorizontal: 16,
    paddingBottom: 0,
    backgroundColor: 'transparent', // 배경 제거
  },

  // 대출 카드 스타일 - 심플 리스트 스타일
  loanCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  loanCardHeader: {
    marginBottom: 16,
  },
  loanHeaderRow: {
    marginBottom: 12,
  },
  loanHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loanTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.light.text,
  },
  loanStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  loanStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  loanAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  loanAmountLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  loanAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.primary,
    minWidth: 42,
    textAlign: 'right',
  },
  loanStepsSection: {
    marginTop: 8,
  },
  // 접힌 상태 - 현재 단계만 표시
  currentStepOnly: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  currentStepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepIconSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepIconTextSmall: {
    fontSize: 12,
    color: 'white',
    fontWeight: '700',
  },
  currentStepText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  expandHint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },

  // 타임라인 스타일 - 펼쳐진 상태
  loanSteps: {
    paddingVertical: 8,
  },
  timelineStepItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: 12,
    width: 32,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: -4,
  },
  timelineLineActive: {
    backgroundColor: Colors.light.primary,
  },
  timelineLineInactive: {
    backgroundColor: '#e0e0e0',
  },
  timelineContent: {
    flex: 1,
    paddingTop: 6,
    paddingBottom: 16,
  },
  stepCompleted: {
    backgroundColor: Colors.light.primary,
  },
  stepCurrent: {
    backgroundColor: Colors.light.primary,
  },
  stepPending: {
    backgroundColor: '#e0e0e0',
  },
  stepIconText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '700',
  },
  stepText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  stepTextCurrent: {
    fontWeight: '600',
    color: Colors.light.primary,
  },
  expectedDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  expectedDateLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  expectedDateValue: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '600',
  },
  
  // 액션 버튼 컨테이너
  actionButtonContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  
  // 계약서 작성 버튼
  contractButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  contractButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  sendMoneyButton: {
    backgroundColor: Colors.light.success,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.light.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sendMoneyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  executionButton: {
    backgroundColor: '#FF6B35', // 실행 단계를 표시하는 주황색
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  executionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  paymentHistoryContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  // 대출금 송금 카드 스타일 - 대출 카드와 통일
  paymentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  paymentCardHeader: {
    marginBottom: 12,
  },
  paymentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.light.text,
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  paymentAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  paymentAmountLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  paymentInfoSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  paymentInfoLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  paymentInfoValue: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },

  // 대출 없음 표시 스타일
  noLoanContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noLoanText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: 10,
  },

  // 카드 덱 컨테이너
  cardDeckContainer: {
    height: 180, // 카드 높이에 맞춰 조정
    marginBottom: 0,
    paddingHorizontal: 0, // 패딩 제거하여 전체 폭 사용
    position: 'relative',
    overflow: 'hidden', // 넘치는 카드 숨기기
  },

  // 카드 슬라이더 컨테이너
  cardSlider: {
    flexDirection: 'row',
    height: '100%',
  },

  // 카드 슬라이더 개별 아이템
  cardSliderItem: {
    width: screenWidth - 32, // 화면 너비에서 양쪽 여백 제외
    marginLeft: 16,
  },

  firstCardSliderItem: {
    marginLeft: 0,
  },

  accountSlideCard: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 0,
    backgroundColor: '#009178',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },

  addAccountCard: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#009178',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },

  addAccountIcon: {
    fontSize: 48,
    fontWeight: '300',
    color: '#009178',
    marginBottom: 8,
  },

  addAccountText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#009178',
  },

  topSection: {
    paddingBottom: 0,
  },
  accountCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leftSection: {
    flex: 1,
  },
  assetLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  accountNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  bankName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  moneyIcon: {
    width: 85,
    height: 85,
    marginRight: -24,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  linkButtonSection: {
    padding: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  linkButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  accountPageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  accountIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  accountIndicatorDotActive: {
    backgroundColor: '#009178',
    width: 20,
  },

  // 통장 스타일 UI
  bankBookContainer: {
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  bankBookLoadingCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bankBookLoadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  bankBookErrorCard: {
    backgroundColor: '#fff3f3',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bankBookErrorText: {
    fontSize: 16,
    color: Colors.light.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  bankBookRetryButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bankBookRetryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bankBookEmptyCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bankBookEmptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  bankBookEmptySubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  bankBookEmptyButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bankBookEmptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // 페이지 인디케이터 스타일 (홈화면과 동일)
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  indicatorDotActive: {
    backgroundColor: '#009178',
    width: 20,
  },

});
