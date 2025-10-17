import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { investmentApi, InvestmentProduct } from '@/services/investmentApi';
import { usePriceUpdates } from '@/hooks/useWebSocket';

export default function ProductsScreen() {
  const [products, setProducts] = useState<InvestmentProduct[]>([]);
  const [personalizedProducts, setPersonalizedProducts] = useState<InvestmentProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<InvestmentProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showPersonalized, setShowPersonalized] = useState(true);

  // 실시간 가격 업데이트
  const { priceUpdates, getPriceUpdate } = usePriceUpdates(products.map(p => p.productId));

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, personalizedProducts, searchText, showPersonalized]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const [response, personalizedResponse] = await Promise.allSettled([
        investmentApi.getInvestmentProducts(),
        investmentApi.getPersonalizedProducts()
      ]);

      if (response.status === 'fulfilled' && response.value.success && response.value.data) {
        setProducts(response.value.data);
      }

      if (personalizedResponse.status === 'fulfilled' && personalizedResponse.value.success) {
        setPersonalizedProducts(personalizedResponse.value.data || []);
      } else {
        setPersonalizedProducts([]);
      }
    } catch (error) {
      Alert.alert('오류', '상품 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    const personalizedIds = new Set(personalizedProducts.map(p => p.productId));
    const allProducts = showPersonalized && personalizedProducts.length > 0
      ? [...personalizedProducts, ...products.filter(p => !personalizedIds.has(p.productId))]
      : [...products];

    const filtered = searchText
      ? allProducts.filter(product =>
          product.productName.toLowerCase().includes(searchText.toLowerCase()) ||
          product.description.toLowerCase().includes(searchText.toLowerCase())
        )
      : allProducts;

    setFilteredProducts(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts().finally(() => setRefreshing(false));
  };


  const navigateToProductDetail = (productId: string) => router.push(`/investment/product-detail?productId=${productId}`);
  const formatCurrency = (amount: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  const formatRate = (rate?: number) => rate ? `${rate >= 0 ? '+' : ''}${rate.toFixed(2)}%` : '0.00%';

  const getCurrentPrice = (product: InvestmentProduct) => getPriceUpdate(product.productId)?.currentPrice ?? product.currentPrice;
  const getCurrentReturn = (product: InvestmentProduct) => {
    const update = getPriceUpdate(product.productId);
    return update ? product.totalReturn + update.changePercent : product.totalReturn;
  };


  const isPersonalizedProduct = (productId: string) => personalizedProducts.some(p => p.productId === productId);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>리츠 상품</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowPersonalized(!showPersonalized)}
            style={[styles.personalizedToggle, showPersonalized && styles.personalizedToggleActive]}
          >
            <MaterialIcons
              name="home"
              size={16}
              color={showPersonalized ? Colors.light.background : Colors.light.text}
            />
            <Text style={[
              styles.personalizedToggleText,
              showPersonalized && styles.personalizedToggleTextActive
            ]}>
              내 오피스텔
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 검색창 */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={Colors.light.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="상품명 또는 설명으로 검색"
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor={Colors.light.textSecondary}
        />
        {searchText && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <MaterialIcons name="close" size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        )}
      </View>


      {/* 상품 목록 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>상품 정보를 불러오는 중...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.productList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredProducts.length ? filteredProducts.map((product, index) => {
          const isPersonalized = isPersonalizedProduct(product.productId);
          return (
            <TouchableOpacity
              key={`${product.productId}-${index}`}
              style={[styles.simpleProductCard, isPersonalized && styles.personalizedProductCard]}
              onPress={() => navigateToProductDetail(product.productId)}
            >
              <View style={styles.simpleProductInfo}>
                <View style={styles.productNameRow}>
                  <Text style={styles.simpleProductName}>{product.productName}</Text>
                  {isPersonalized && (
                    <View style={styles.personalizedBadge}>
                      <MaterialIcons name="home" size={12} color={Colors.light.background} />
                      <Text style={styles.personalizedBadgeText}>내 오피스텔 투자</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.simpleProductId}>{product.productId}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          );
        }) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="search" size={64} color={Colors.light.textSecondary} />
            <Text style={styles.emptyStateTitle}>검색 결과가 없습니다</Text>
            <Text style={styles.emptyStateSubtitle}>다른 검색어나 필터 조건을 시도해보세요</Text>
          </View>
        )}
        </ScrollView>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 12,
    backgroundColor: Colors.light.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: Colors.light.text,
  },
  productList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  // 간단한 상품 카드 스타일
  simpleProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  personalizedProductCard: {
    borderColor: Colors.light.primary,
    borderWidth: 2,
    backgroundColor: `${Colors.light.primary}08`,
  },
  simpleProductInfo: {
    flex: 1,
  },
  productNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  simpleProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  simpleProductId: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  personalizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  personalizedBadgeText: {
    color: Colors.light.background,
    fontSize: 10,
    fontWeight: '600',
  },
  personalizedDescription: {
    fontSize: 12,
    color: Colors.light.primary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  personalizedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
    gap: 4,
  },
  personalizedToggleActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  personalizedToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  personalizedToggleTextActive: {
    color: Colors.light.background,
  },
  // 시뮬레이션 배너 스타일
  simulationBannerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  simulationBanner: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  simulationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  simulationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simulationText: {
    flex: 1,
  },
  simulationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.background,
    marginBottom: 4,
  },
  simulationSubtitle: {
    fontSize: 13,
    color: `${Colors.light.background}CC`,
  },
});