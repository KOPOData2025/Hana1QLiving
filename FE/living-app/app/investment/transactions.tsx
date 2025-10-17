import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { investmentApi, InvestmentTransaction } from '@/services/investmentApi';

const { width } = Dimensions.get('window');

type TransactionFilter = 'ALL' | 'BUY' | 'SELL' | 'DIVIDEND';

interface FilterOption {
  value: TransactionFilter;
  label: string;
  icon: string;
}

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<InvestmentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<TransactionFilter>('ALL');

  const filterOptions: FilterOption[] = [
    { value: 'ALL', label: '전체', icon: 'list' },
    { value: 'BUY', label: '매수', icon: 'arrow-upward' },
    { value: 'SELL', label: '매도', icon: 'arrow-downward' },
  ];

  const cycleFilter = () => {
    const currentIndex = filterOptions.findIndex(f => f.value === selectedFilter);
    const nextIndex = (currentIndex + 1) % filterOptions.length;
    setSelectedFilter(filterOptions[nextIndex].value);
  };

  const getCurrentFilterLabel = () => {
    return filterOptions.find(f => f.value === selectedFilter)?.label || '전체';
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, selectedFilter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await investmentApi.getTransactions();

      if (response.success && response.data) {
        const sortedTransactions = response.data.sort(
          (a: InvestmentTransaction, b: InvestmentTransaction) =>
            new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
        );
        setTransactions(sortedTransactions);
      } else {
        Alert.alert('오류', '거래내역을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '거래내역을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const filterTransactions = () => {
    if (selectedFilter === 'ALL') {
      setFilteredTransactions(transactions);
    } else {
      const filtered = transactions.filter(
        (transaction) => transaction.transactionType === selectedFilter
      );
      setFilteredTransactions(filtered);
    }
  };

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return '₩0';
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
  };

  const getTransactionIcon = (type: string): string => {
    switch (type) {
      case 'BUY':
        return 'arrow-upward';
      case 'SELL':
        return 'arrow-downward';
      case 'DIVIDEND':
        return 'monetization-on';
      default:
        return 'swap-horiz';
    }
  };

  const getTransactionColor = (type: string): string => {
    switch (type) {
      case 'BUY':
        return '#FF6B6B';
      case 'SELL':
        return '#007AFF';
      case 'DIVIDEND':
        return '#51CF66';
      default:
        return Colors.light.textSecondary;
    }
  };

  const getTransactionLabel = (type: string): string => {
    switch (type) {
      case 'BUY':
        return '매수';
      case 'SELL':
        return '매도';
      case 'DIVIDEND':
        return '배당';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'COMPLETED':
      case 'EXECUTED':
        return '#51CF66';
      case 'PENDING':
        return '#FFD43B';
      case 'CANCELLED':
        return '#FF6B6B';
      default:
        return Colors.light.textSecondary;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'COMPLETED':
        return '완료';
      case 'EXECUTED':
        return '체결완료';
      case 'PENDING':
        return '처리중';
      case 'CANCELLED':
        return '취소';
      default:
        return status;
    }
  };

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderText, styles.columnProduct]}>종목</Text>
      <Text style={[styles.tableHeaderText, styles.columnType]}>구분</Text>
      <Text style={[styles.tableHeaderText, styles.columnQuantity]}>수량</Text>
      <Text style={[styles.tableHeaderText, styles.columnPrice]}>단가</Text>
      <Text style={[styles.tableHeaderText, styles.columnAmount]}>거래대금</Text>
    </View>
  );

  const renderTransactionRow = (transaction: InvestmentTransaction) => (
    <TouchableOpacity key={transaction.transactionId} style={styles.tableRow}>
      {/* 종목명 */}
      <View style={[styles.tableCell, styles.columnProduct]}>
        <Text style={styles.productNameTable} numberOfLines={2}>
          {transaction.productName}
        </Text>
        <Text style={styles.timeTextTable}>
          {formatDateTime(transaction.transactionDate)}
        </Text>
      </View>
      
      {/* 거래구분 */}
      <View style={[styles.tableCell, styles.columnType]}>
        <View style={[
          styles.transactionTypeTableTag,
          { backgroundColor: getTransactionColor(transaction.transactionType) }
        ]}>
          <Text style={styles.transactionTypeTableText}>
            {getTransactionLabel(transaction.transactionType)}
          </Text>
        </View>
      </View>
      
      {/* 수량 */}
      <View style={[styles.tableCell, styles.columnQuantity]}>
        <Text style={styles.tableCellText}>
          {transaction.quantity ? transaction.quantity.toLocaleString() : '0'}주
        </Text>
      </View>
      
      {/* 단가 */}
      <View style={[styles.tableCell, styles.columnPrice]}>
        <Text style={styles.tableCellText}>
          {transaction.unitPrice ? formatCurrency(transaction.unitPrice) : '₩0'}
        </Text>
      </View>
      
      {/* 거래대금 */}
      <View style={[styles.tableCell, styles.columnAmount]}>
        <Text style={[
          styles.tableCellAmountText,
          { color: getTransactionColor(transaction.transactionType) }
        ]}>
          {formatCurrency(transaction.totalAmount)}
        </Text>
        {transaction.fees && transaction.fees > 0 && (
          <Text style={styles.feeText}>
            수수료: {formatCurrency(transaction.fees)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>거래내역을 불러오고 있습니다...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>거래내역</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 거래내역 리스트 */}
      {filteredTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="receipt" size={64} color={Colors.light.textSecondary} />
          <Text style={styles.emptyTitle}>거래내역이 없습니다</Text>
          <Text style={styles.emptyDescription}>
            {selectedFilter === 'ALL'
              ? '아직 거래한 내역이 없습니다.'
              : `${filterOptions.find(f => f.value === selectedFilter)?.label} 거래내역이 없습니다.`}
          </Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              총 {filteredTransactions.length}건의 거래내역
            </Text>
            <TouchableOpacity style={styles.filterToggleButton} onPress={cycleFilter}>
              <Text style={styles.filterToggleText}>{getCurrentFilterLabel()}</Text>
              <MaterialIcons name="keyboard-arrow-down" size={18} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          {renderTableHeader()}

          <ScrollView
            style={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {filteredTransactions.map(renderTransactionRow)}
          </ScrollView>
        </View>
      )}

      {/* 투자 홈으로 가기 버튼 */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={styles.investmentButton}
          onPress={() => router.push('/investment/')}
        >
          <Text style={styles.investmentButtonText}>투자 홈으로</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    gap: 4,
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  // 표 형식 스타일
  tableContainer: {
    backgroundColor: Colors.light.surface,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.border,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: Colors.light.surface,
    minHeight: 60,
  },
  tableCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  // 컬럼 너비 정의 (상태 컬럼 제거로 재조정)
  columnProduct: {
    flex: 3.2,
    alignItems: 'flex-start',
  },
  columnType: {
    flex: 1.3,
  },
  columnQuantity: {
    flex: 1.4,
  },
  columnPrice: {
    flex: 1.6,
  },
  columnAmount: {
    flex: 2,
  },
  productNameTable: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'left',
    marginBottom: 4,
  },
  timeTextTable: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    textAlign: 'left',
  },
  tableCellText: {
    fontSize: 12,
    color: Colors.light.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  tableCellAmountText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  feeText: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  transactionTypeTableTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 35,
    alignItems: 'center',
  },
  transactionTypeTableText: {
    color: Colors.light.background,
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomButtonContainer: {
    padding: 20,
    paddingBottom: 34, // Safe area 고려
    backgroundColor: Colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  investmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  investmentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
});