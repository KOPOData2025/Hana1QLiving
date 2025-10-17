import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { investmentApi, InvestmentOrder } from '@/services/investmentApi';

type OrderFilter = 'ALL' | 'PENDING' | 'COMPLETED' | 'CANCELLED';

interface FilterOption {
  value: OrderFilter;
  label: string;
  color: string;
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<InvestmentOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<InvestmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<OrderFilter>('ALL');

  const filterOptions: FilterOption[] = [
    { value: 'ALL', label: '전체', color: Colors.light.primary },
    { value: 'PENDING', label: '대기중', color: '#FFD43B' },
    { value: 'COMPLETED', label: '완료', color: '#51CF66' },
    { value: 'CANCELLED', label: '취소', color: '#FF6B6B' },
  ];

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, selectedFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await investmentApi.getOrders();
      if (response.success && response.data) {
        const sortedOrders = response.data.sort(
          (a: InvestmentOrder, b: InvestmentOrder) =>
            new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
        );
        setOrders(sortedOrders);
      } else {
        Alert.alert('오류', '주문내역을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '주문내역을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const filterOrders = () => {
    if (selectedFilter === 'ALL') {
      setFilteredOrders(orders);
    } else {
      const filtered = orders.filter((order) => order.status === selectedFilter);
      setFilteredOrders(filtered);
    }
  };

  const cancelOrder = async (orderId: string) => {
    Alert.alert(
      '주문 취소',
      '정말로 이 주문을 취소하시겠습니까?',
      [
        { text: '아니오', style: 'cancel' },
        {
          text: '예',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await investmentApi.cancelOrder(orderId);
              if (response.success) {
                Alert.alert('완료', '주문이 취소되었습니다.');
                loadOrders();
              } else {
                Alert.alert('오류', response.message || '주문 취소에 실패했습니다.');
              }
            } catch (error) {
              Alert.alert('오류', '주문 취소 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return '₩0';
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getFullYear()}`;
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOrderTypeIcon = (type: string): string => {
    return type === 'BUY' ? 'arrow-upward' : 'arrow-downward';
  };

  const getOrderTypeColor = (type: string): string => {
    return type === 'BUY' ? '#FF6B6B' : '#4DABF7';
  };

  const getOrderTypeLabel = (type: string): string => {
    return type === 'BUY' ? '매수' : '매도';
  };

  const getStatusColor = (status: string): string => {
    const option = filterOptions.find(opt => opt.value === status);
    return option?.color || Colors.light.textSecondary;
  };

  const getStatusLabel = (status: string): string => {
    const option = filterOptions.find(opt => opt.value === status);
    return option?.label || status;
  };

  const renderOrderItem = (order: InvestmentOrder) => (
    <View key={order.orderId} style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <View style={[
            styles.orderTypeIcon,
            { backgroundColor: getOrderTypeColor(order.orderType) }
          ]}>
            <MaterialIcons
              name={getOrderTypeIcon(order.orderType) as any}
              size={20}
              color={Colors.light.background}
            />
          </View>
          <View style={styles.orderDetails}>
            <Text style={styles.productName}>{order.productName}</Text>
            <Text style={styles.orderType}>
              {getOrderTypeLabel(order.orderType)}
            </Text>
          </View>
        </View>
        
        <View style={styles.orderStatus}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(order.status) }
          ]}>
            <Text style={styles.statusText}>
              {getStatusLabel(order.status)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.orderAmount}>
        <Text style={styles.amountLabel}>주문금액</Text>
        <Text style={styles.amountValue}>
          {formatCurrency(order.totalAmount)}
        </Text>
      </View>

      <View style={styles.orderMeta}>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MaterialIcons name="format-list-numbered" size={16} color={Colors.light.textSecondary} />
            <Text style={styles.metaText}>
              {order.quantity.toLocaleString()}주
            </Text>
          </View>
          
          <View style={styles.metaItem}>
            <MaterialIcons name="attach-money" size={16} color={Colors.light.textSecondary} />
            <Text style={styles.metaText}>
              {formatCurrency(order.unitPrice)}/주
            </Text>
          </View>
        </View>
        
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MaterialIcons name="schedule" size={16} color={Colors.light.textSecondary} />
            <Text style={styles.metaText}>
              {formatDate(order.orderDate)} {formatTime(order.orderDate)}
            </Text>
          </View>
        </View>
      </View>

      {order.status === 'PENDING' && (
        <View style={styles.orderActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => cancelOrder(order.orderId)}
          >
            <Text style={styles.cancelButtonText}>취소</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>주문내역을 불러오고 있습니다...</Text>
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
        <Text style={styles.headerTitle}>주문내역</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 필터 버튼 */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {filterOptions.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterButton,
                selectedFilter === filter.value && styles.filterButtonActive
              ]}
              onPress={() => setSelectedFilter(filter.value)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedFilter === filter.value && styles.filterButtonTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 주문내역 리스트 */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="assignment" size={64} color={Colors.light.textSecondary} />
            <Text style={styles.emptyTitle}>주문내역이 없습니다</Text>
            <Text style={styles.emptyDescription}>
              {selectedFilter === 'ALL' 
                ? '아직 주문한 내역이 없습니다.' 
                : `${filterOptions.find(f => f.value === selectedFilter)?.label} 주문이 없습니다.`}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>
                총 {filteredOrders.length}건의 주문내역
              </Text>
            </View>
            
            {filteredOrders.map((order) => renderOrderItem(order))}
            
            <View style={styles.bottomSpacing} />
          </>
        )}
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  filterContainer: {
    backgroundColor: Colors.light.background,
    paddingTop: 12,
    paddingBottom: 20,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#2c3e50',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
  summaryContainer: {
    padding: 20,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  orderItem: {
    backgroundColor: Colors.light.surface,
    marginTop: 8,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  orderTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  orderType: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  orderStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: '600',
  },
  orderAmount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  amountLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  orderMeta: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 6,
  },
  cancelButtonText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600',
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
  bottomSpacing: {
    height: 40,
  },
});