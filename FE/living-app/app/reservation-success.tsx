import { HanaButton } from '@/components/HanaButton';
import { HanaCard } from '@/components/HanaCard';
import { HanaHeader } from '@/components/HanaHeader';
import { Colors } from '@/constants/Colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ScrollView, StatusBar, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { mobileApi } from '../services/mobileApi';

interface ReservationSuccessParams {
  buildingName?: string;
  buildingAddress?: string;
  reservationId?: string;
  name?: string;
  email?: string;
  phone?: string;
  moveInDate?: string;
  residencePeriod?: string;
  contractNumber?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  type?: string;
}

export default function ReservationSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<ReservationSuccessParams>();

  // 실제 계약 정보 상태
  const [contractInfo, setContractInfo] = useState({
    contractNumber: '',
    loanAmount: 0,
    loanPurpose: '',
    scheduledDate: '',
    status: '',
    loading: false,
    error: null as string | null
  });

  // 계약 정보 가져오기
  useEffect(() => {
    const fetchContractInfo = async () => {
      if (params.type === 'contract' && params.contractNumber) {
        setContractInfo(prev => ({ ...prev, loading: true, error: null }));
        
        try {
          const response = await mobileApi.get(`/loans/contracts/${params.contractNumber}`);
          const data = response.data || response;
          
          setContractInfo({
            contractNumber: data.contractNumber || params.contractNumber,
            loanAmount: data.loanAmount || 0,
            loanPurpose: data.loanPurpose || '전월세대출',
            scheduledDate: data.scheduledDate || params.scheduledDate || '',
            status: data.status || 'SCHEDULED',
            loading: false,
            error: null
          });
        } catch (error) {
          // 에러 시 params 데이터 사용
          setContractInfo({
            contractNumber: params.contractNumber || '',
            loanAmount: 0,
            loanPurpose: '전월세대출',
            scheduledDate: params.scheduledDate || '',
            status: 'SCHEDULED',
            loading: false,
            error: '계약 정보를 불러오지 못했습니다'
          });
        }
      }
    };

    fetchContractInfo();
  }, [params.type, params.contractNumber]);

  const handleGoHome = () => {
    router.push('/');
  };

  const handleViewReservations = () => {
    // 예약 목록 페이지로 이동 (추후 구현)
    router.push('/');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      
      {/* 상단 헤더 */}
      <HanaHeader
        title={params.type === 'contract' ? "계약서 생성 완료" : "예약 완료"}
        subtitle={params.type === 'contract' ? "대출 계약서 생성이 완료되었습니다" : "입주 투어 예약이 완료되었습니다"}
        leftIcon="arrow-left"
        onLeftPress={() => router.back()}
      />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 성공 아이콘 */}
        <View style={styles.successIconContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>
            {params.type === 'contract' ? '계약서 생성 완료!' : '예약이 완료되었습니다!'}
          </Text>
          <Text style={styles.successSubtitle}>
            {params.type === 'contract' 
              ? '계약서가 생성되어 하나은행으로 전송되었습니다.' 
              : '입력해주신 연락처로 예약 확인 안내를 드리겠습니다.'
            }
          </Text>
        </View>

        {/* 예약/계약 정보 카드 */}
        <HanaCard variant="elevated" style={styles.reservationCard}>
          <Text style={styles.cardTitle}>
            {params.type === 'contract' ? '계약 정보' : '예약 정보'}
          </Text>
          
          {contractInfo.loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>계약 정보 조회 중...</Text>
            </View>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {params.type === 'contract' ? '계약번호' : '예약 번호'}
                </Text>
                <Text style={styles.infoValue}>
                  {params.type === 'contract'
                    ? contractInfo.contractNumber || params.contractNumber
                    : params.reservationId || '-'
                  }
                </Text>
              </View>
              
              {params.type === 'contract' ? (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>대출 목적</Text>
                    <Text style={styles.infoValue}>
                      {contractInfo.loanPurpose || '전월세대출'}
                    </Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>대출 금액</Text>
                    <Text style={styles.infoValue}>
                      {contractInfo.loanAmount ? `${(contractInfo.loanAmount / 10000).toLocaleString()}만원` : '조회 중'}
                    </Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>실행 예정일</Text>
                    <Text style={styles.infoValue}>
                      {contractInfo.scheduledDate || params.scheduledDate || '미정'}
                    </Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>계약 상태</Text>
                    <Text style={styles.infoValue}>
                      {contractInfo.status === 'SCHEDULED' ? '예약 완료' : 
                       contractInfo.status === 'COMPLETED' ? '완료' : '처리 중'}
                    </Text>
                  </View>
                  
                  
                  {contractInfo.error && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{contractInfo.error}</Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>건물명</Text>
                    <Text style={styles.infoValue}>{params.buildingName || '-'}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>주소</Text>
                    <Text style={styles.infoValue}>{params.buildingAddress || '-'}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>예약자명</Text>
                    <Text style={styles.infoValue}>{params.name || '-'}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>연락처</Text>
                    <Text style={styles.infoValue}>{params.phone || '-'}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>이메일</Text>
                    <Text style={styles.infoValue}>{params.email || '-'}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>희망 입주일</Text>
                    <Text style={styles.infoValue}>{params.moveInDate || '1개월 이내'}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>희망 거주기간</Text>
                    <Text style={styles.infoValue}>{params.residencePeriod || '1년'}</Text>
                  </View>
                </>
              )}
            </>
          )}
        </HanaCard>

        {/* 다음 단계 안내 */}
        <HanaCard variant="elevated" style={styles.nextStepsCard}>
          <Text style={styles.cardTitle}>다음 단계</Text>

          {params.type === 'contract' ? (
            <>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>계약서 검토</Text>
                  <Text style={styles.stepDescription}>
                    하나은행에서 계약서를 검토하고 승인 처리합니다.
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>대출 실행 준비</Text>
                  <Text style={styles.stepDescription}>
                    계약서 승인 후 대출 실행을 위한 준비가 진행됩니다.
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>대출금 송금</Text>
                  <Text style={styles.stepDescription}>
                    마이페이지에서 대출금 송금하기 버튼을 통해 실행할 수 있습니다.
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>예약 확인</Text>
                  <Text style={styles.stepDescription}>
                    24시간 이내에 입력하신 연락처로 예약 확인 안내를 드립니다.
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>투어 일정 조율</Text>
                  <Text style={styles.stepDescription}>
                    담당자가 연락하여 투어 가능한 일정을 조율합니다.
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>입주 투어</Text>
                  <Text style={styles.stepDescription}>
                    약속된 일정에 맞춰 건물 투어를 진행합니다.
                  </Text>
                </View>
              </View>
            </>
          )}
        </HanaCard>

        {/* 주의사항 */}
        <HanaCard variant="elevated" style={styles.noticeCard}>
          <Text style={styles.cardTitle}>주의사항</Text>

          {params.type === 'contract' ? (
            <>
              <View style={styles.noticeItem}>
                <Text style={styles.noticeText}>• 계약서 검토 완료까지 1-2 영업일이 소요됩니다.</Text>
              </View>
              <View style={styles.noticeItem}>
                <Text style={styles.noticeText}>• 대출 실행은 마이페이지에서 직접 진행할 수 있습니다.</Text>
              </View>
              <View style={styles.noticeItem}>
                <Text style={styles.noticeText}>• 계약 관련 문의사항이 있으시면 하나은행 고객센터로 연락해주세요.</Text>
              </View>
              <View style={styles.noticeItem}>
                <Text style={styles.noticeText}>• 하나은행 고객센터: 1599-1111</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.noticeItem}>
                <Text style={styles.noticeText}>• 예약 확인 전까지는 확정되지 않습니다.</Text>
              </View>
              <View style={styles.noticeItem}>
                <Text style={styles.noticeText}>• 투어 일정은 담당자와 협의 후 결정됩니다.</Text>
              </View>
              <View style={styles.noticeItem}>
                <Text style={styles.noticeText}>• 문의사항이 있으시면 고객센터로 연락해주세요.</Text>
              </View>
              <View style={styles.noticeItem}>
                <Text style={styles.noticeText}>• 고객센터: 1588-1234</Text>
              </View>
            </>
          )}
        </HanaCard>

        {/* 액션 버튼 */}
        <View style={styles.actionContainer}>
          <HanaButton
            title="홈으로 돌아가기"
            onPress={handleGoHome}
            variant="primary"
            size="large"
            style={styles.homeButton}
          />
          <HanaButton
            title={params.type === 'contract' ? "대출 현황 보기" : "예약 내역 보기"}
            onPress={handleViewReservations}
            variant="outline"
            size="large"
            style={styles.reservationsButton}
          />
        </View>
      </ScrollView>
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
  
  // 성공 아이콘 섹션
  successIconContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconText: {
    fontSize: 40,
    color: Colors.light.background,
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // 카드 공통 스타일
  reservationCard: {
    marginBottom: 20,
  },
  nextStepsCard: {
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
  
  // 예약 정보 스타일
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
  
  // 다음 단계 스타일
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.background,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  
  // 주의사항 스타일
  noticeItem: {
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  
  // 액션 버튼 스타일
  actionContainer: {
    marginTop: 20,
    gap: 12,
  },
  homeButton: {
    width: '100%',
  },
  reservationsButton: {
    width: '100%',
  },
  
  // 로딩 및 에러 스타일
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  errorContainer: {
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#E53E3E',
    textAlign: 'center',
  },
});
