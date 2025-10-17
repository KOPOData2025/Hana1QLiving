import { HanaButton } from '@/components/HanaButton';
import { HanaCard } from '@/components/HanaCard';
import { HanaHeader } from '@/components/HanaHeader';
import { Colors } from '@/constants/Colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface TransferSuccessParams {
  contractNumber?: string;
  transferAmount?: string;
  landlordAccount?: string;
  landlordName?: string;
  transactionId?: string;
  type?: string;
}

export default function TransferSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<TransferSuccessParams>();

  const handleGoHome = () => {
    // 마이페이지로 이동하면서 새로고침 신호를 보냄
    router.push({
      pathname: '/(tabs)/mypage',
      params: { 
        refresh: 'true',
        timestamp: Date.now().toString() 
      }
    });
  };

  const handleViewTransactions = () => {
    // 마이페이지로 이동해서 대출 관련 정보 확인
    router.push({
      pathname: '/(tabs)/mypage',
      params: { 
        refresh: 'true',
        scrollTo: 'loans',
        timestamp: Date.now().toString() 
      }
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      
      {/* 상단 헤더 */}
      <HanaHeader
        title="송금 완료"
        subtitle="대출금 송금이 완료되었습니다"
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
          <Text style={styles.successTitle}>송금이 완료되었습니다!</Text>
          <Text style={styles.successSubtitle}>
            대출금이 성공적으로 임대인에게 송금되었습니다.
          </Text>
        </View>

        {/* 송금 정보 카드 */}
        <HanaCard variant="elevated" style={styles.transferCard}>
          <Text style={styles.cardTitle}>송금 정보</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>거래번호</Text>
            <Text style={styles.infoValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{params.transactionId || 'TXN-001'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>계약번호</Text>
            <Text style={styles.infoValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{params.contractNumber || ''}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>송금 금액</Text>
            <Text style={styles.infoValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {params.transferAmount ?
                `${(parseInt(params.transferAmount) / 10000).toLocaleString()}만원` :
                '조회 중'
              }
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>받는 계좌</Text>
            <Text style={styles.infoValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{params.landlordAccount || ''}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>받는 분</Text>
            <Text style={styles.infoValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{params.landlordName || ''}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>송금 일시</Text>
            <Text style={styles.infoValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {new Date().toLocaleString('ko-KR', {
                year: '2-digit',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }).replace(/\. /g, '.')}
            </Text>
          </View>
        </HanaCard>

        {/* 다음 단계 안내 */}
        <HanaCard variant="elevated" style={styles.nextStepsCard}>
          <Text style={styles.cardTitle}>다음 단계</Text>
          
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>송금 확인</Text>
              <Text style={styles.stepDescription}>
                임대인이 대출금을 정상적으로 수령했는지 확인해주세요.
              </Text>
            </View>
          </View>
          
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>임대차 계약</Text>
              <Text style={styles.stepDescription}>
                임대인과 임대차 계약을 체결해주세요.
              </Text>
            </View>
          </View>
          
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>대출 상환</Text>
              <Text style={styles.stepDescription}>
                매월 약정된 날짜에 대출금을 상환해주세요.
              </Text>
            </View>
          </View>
        </HanaCard>

        {/* 중요 안내사항 */}
        <HanaCard variant="elevated" style={styles.noticeCard}>
          <Text style={styles.cardTitle}>중요 안내사항</Text>
          
          <View style={styles.noticeItem}>
            <Text style={styles.noticeText}>• 송금 확인증은 마이페이지 {'>'} 대출 정보에서 확인하실 수 있습니다.</Text>
          </View>
          <View style={styles.noticeItem}>
            <Text style={styles.noticeText}>• 대출 이용에 문제가 있으시면 고객센터로 연락해주세요.</Text>
          </View>
          <View style={styles.noticeItem}>
            <Text style={styles.noticeText}>• 대출 상환일정은 계약서에 명시된 대로 진행됩니다.</Text>
          </View>
          <View style={styles.noticeItem}>
            <Text style={styles.noticeText}>• 고객센터: 1588-1234 (평일 9:00~18:00)</Text>
          </View>
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
            title="대출 정보 보기"
            onPress={handleViewTransactions}
            variant="outline"
            size="large"
            style={styles.transactionsButton}
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
  transferCard: {
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
  
  // 송금 정보 스타일
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
    flex: 2,
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
  transactionsButton: {
    width: '100%',
  },
});