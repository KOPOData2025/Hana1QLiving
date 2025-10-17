import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/Colors';
import { HanaButton } from '../components/HanaButton';

export default function LoanConfirmationScreen() {
  const { applicationNumber, requestedAmount, paymentDate } = useLocalSearchParams();

  const formatAmount = (amount: string | string[]) => {
    const numAmount = typeof amount === 'string' ? parseInt(amount) : parseInt(amount[0]);
    return (numAmount / 10000).toLocaleString() + '만원';
  };

  const formatDate = (dateStr: string | string[]) => {
    const date = typeof dateStr === 'string' ? dateStr : dateStr[0];
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>
        <Text style={styles.title}>대출 신청이 완료되었습니다</Text>
        <Text style={styles.subtitle}>신청하신 내용으로 대출이 진행됩니다</Text>
      </View>

      {/* 신청 정보 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>신청 정보</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>신청번호</Text>
            <Text style={styles.infoValue}>{applicationNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>대출금액</Text>
            <Text style={styles.infoValue}>{formatAmount(requestedAmount || '0')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>집주인 입금일</Text>
            <Text style={styles.infoValue}>{formatDate(paymentDate || new Date().toISOString())}</Text>
          </View>
        </View>
      </View>

      {/* 다음 단계 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>다음 단계</Text>
        
        <View style={styles.stepContainer}>
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>계약서 작성</Text>
              <Text style={styles.stepDescription}>하나원큐리빙에서 대출 계약서를 작성해주세요</Text>
            </View>
          </View>
          
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>하나은행 방문</Text>
              <Text style={styles.stepDescription}>예약된 날짜에 하나은행을 방문하여 최종 계약을 진행하세요</Text>
            </View>
          </View>
          
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>자동 송금</Text>
              <Text style={styles.stepDescription}>입금 예정일에 집주인 계좌로 자동 송금됩니다</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 중요 안내 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>중요 안내</Text>
        
        <View style={styles.noticeCard}>
          <View style={styles.noticeItem}>
            <Text style={styles.noticeText}>
              • 계약서 작성은 입금일 3일 전까지 완료해주세요
            </Text>
          </View>
          <View style={styles.noticeItem}>
            <Text style={styles.noticeText}>
              • 하나은행 방문 시 신분증을 반드시 지참해주세요
            </Text>
          </View>
          <View style={styles.noticeItem}>
            <Text style={styles.noticeText}>
              • 집주인 계좌 정보 변경 시 즉시 연락주세요
            </Text>
          </View>
          <View style={styles.noticeItem}>
            <Text style={styles.noticeText}>
              • 문의사항: 1588-1111 (하나은행 콜센터)
            </Text>
          </View>
        </View>
      </View>

      {/* 버튼 영역 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.contractButton}
          onPress={() => router.push('/loan-contract')}
        >
          <Text style={styles.contractButtonText}>계약서 작성하기</Text>
        </TouchableOpacity>
        
        <HanaButton
          title="확인"
          onPress={() => router.push('/(tabs)')}
          style={styles.confirmButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8f9fa',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successIconText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  stepContainer: {
    gap: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  noticeCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  noticeItem: {
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  buttonContainer: {
    padding: 20,
    gap: 12,
  },
  contractButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Colors.light.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  contractButtonText: {
    fontSize: 16,
    color: Colors.light.primary,
    fontWeight: 'bold',
  },
  confirmButton: {
    marginTop: 0,
  },
});