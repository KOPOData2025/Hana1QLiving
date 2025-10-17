import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { investmentApi, Portfolio } from '@/services/investmentApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import api from '../../services/api';

const { width } = Dimensions.get('window');

interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  profitRate: number;
  productCount: number;
}

interface TradingProfitLoss {
  realizedProfits: {
    transactionId: string;
    productName: string;
    sellDate: string;
    sellPrice: number;
    buyPrice: number;
    quantity: number;
    profit: number;
    profitRate: number;
    fees: number;
    netProfit: number;
  }[];
  totalRealizedProfit: number;
  totalRealizedProfitRate: number;
  totalFees: number;
  totalNetProfit: number;
}

interface DividendTransaction {
  productCode: string;
  productName?: string;
  amount: number;
  dividendAmount?: number;
  description: string;
  transactionDate: string;
  paymentDate?: string;
  year?: number;
  month?: number;
  day?: number;
}

interface DividendSummary {
  totalDividendAmount: number;
  totalTransactionCount: number;
  thisYearDividend: number;
  thisMonthDividend: number;
}

export default function PortfolioScreen() {
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [tradingProfitLoss, setTradingProfitLoss] = useState<TradingProfitLoss | null>(null);
  const [dividends, setDividends] = useState<DividendTransaction[]>([]);
  const [dividendSummary, setDividendSummary] = useState<DividendSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'holdings' | 'profit-loss' | 'dividends'>('holdings');
  const [userCi, setUserCi] = useState<string | null>(null);

  useEffect(() => {
    initializeUserData();
  }, []);


  const initializeUserData = async () => {
    try {
      const storedUserCi = await AsyncStorage.getItem('userCi');
      setUserCi(storedUserCi);
      await loadPortfolioData();
    } catch (error) {
      console.error('사용자 데이터 초기화 실패:', error);
      await loadPortfolioData();
    }
  };

  const loadPortfolioData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPortfolio(),
        loadPortfolioSummary(),
        loadTradingProfitLoss(),
        loadDividendData(),
      ]);
    } catch (error) {
      console.error('포트폴리오 데이터 로딩 전체 실패:', error);
      Alert.alert('오류', '포트폴리오 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolio = async () => {
    try {
      const response = await investmentApi.getPortfolio();
      if (response.success && response.data) {
        setPortfolio(response.data);

        // 응답에서 userCi를 추출해서 저장
        if (response.userCi && !userCi) {
          setUserCi(response.userCi);
          // AsyncStorage에도 저장
          await AsyncStorage.setItem('userCi', response.userCi);
        }
      }
    } catch (error) {
      console.error('포트폴리오 로딩 실패:', error);
    }
  };

  const loadPortfolioSummary = async () => {
    try {
      const response = await investmentApi.getPortfolioSummary();

      if (response.success && response.data) {
        // 백엔드 응답 구조를 프론트엔드 구조로 변환
        const backendData = response.data;

        const mappedData: PortfolioSummary = {
          totalValue: Number(backendData.totalCurrentValue) || 0,
          totalCost: Number(backendData.totalInvestedAmount) || 0,
          totalProfit: Number(backendData.totalGainLoss) || 0,
          profitRate: Number(backendData.totalReturnRate) || 0,
          productCount: Number(backendData.productCount) || 0,
        };
        setSummary(mappedData);
      } else {
        // 데이터가 없을 때는 null 유지 (로딩 상태 표시)
        setSummary(null);
      }
    } catch (error) {
      console.error('포트폴리오 요약 로딩 실패:', error);
      // 에러 시에도 null 유지 (로딩 상태 표시)
      setSummary(null);
    }
  };

  const loadTradingProfitLoss = async () => {
    try {
      const response = await investmentApi.getTradingProfitLoss();

      if (response.success && response.data) {
        setTradingProfitLoss(response.data);
      } else {
        // 데이터가 없을 때는 null 유지 (로딩 상태 표시)
        setTradingProfitLoss(null);
      }
    } catch (error) {
      console.error('매매 손익 로딩 실패:', error);
      // 에러 시에도 null 유지 (로딩 상태 표시)
      setTradingProfitLoss(null);
    }
  };

  const loadDividendData = async () => {
    try {
      // 연동된 증권계좌 정보를 백엔드 API에서 조회
      let accountNumber = null;

      try {
        const accountsResponse = await api.get('/api/securities-accounts/linked');

        if (accountsResponse.data && accountsResponse.data.length > 0) {
          accountNumber = accountsResponse.data[0].accountNumber;
        }
      } catch (apiError: any) {
        console.error('계좌 조회 API 실패:', apiError);
      }

      // API 호출이 실패하거나 계좌가 없으면 userCi를 대신 사용
      if (!accountNumber && userCi) {
        accountNumber = userCi;
      }

      if (!accountNumber) {
        setDividends([]);
        setDividendSummary(null);
        return;
      }

      const response = await investmentApi.getDividends();

      if (response.success && response.data) {
        const rawDividendData = response.data;

        // 백엔드 데이터를 프론트엔드 인터페이스에 맞게 변환
        const dividendData = rawDividendData.map((item: any) => {
          // paymentDate가 있으면 사용, 없으면 year/month/day로 구성
          let transactionDate = '';
          if (item.paymentDate) {
            transactionDate = item.paymentDate;
          } else if (item.year && item.month && item.day) {
            transactionDate = `${item.year}-${String(item.month).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
          } else {
            transactionDate = new Date().toISOString();
          }

          const transformedItem: DividendTransaction = {
            productCode: item.PRODUCT_CODE || item.productCode || '',
            productName: item.PRODUCT_NAME || item.productName || '상품명 없음',
            amount: item.dividendAmount || item.AMOUNT || 0, // dividendAmount를 amount로 매핑
            dividendAmount: item.dividendAmount || item.AMOUNT,
            description: item.PRODUCT_NAME || item.productName || '배당금 지급',
            transactionDate: transactionDate,
            paymentDate: item.paymentDate,
            year: item.year,
            month: item.month,
            day: item.day
          };

          return transformedItem;
        });

        setDividends(dividendData);

        // 배당 요약 정보 계산
        calculateDividendSummary(dividendData);
      } else {
        setDividends([]);
        // 데이터가 없을 때는 null 유지 (로딩 상태 표시)
        setDividendSummary(null);
      }
    } catch (error: any) {
      console.error('배당 로딩 실패:', error);

      // 에러 시에도 null 유지 (로딩 상태 표시)
      setDividends([]);
      setDividendSummary(null);
    }
  };

  const calculateDividendSummary = (dividendData: DividendTransaction[]) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const totalAmount = dividendData.reduce((sum, dividend) => sum + dividend.amount, 0);
    const thisYearAmount = dividendData
      .filter(dividend => new Date(dividend.transactionDate).getFullYear() === currentYear)
      .reduce((sum, dividend) => sum + dividend.amount, 0);
    const thisMonthAmount = dividendData
      .filter(dividend => {
        const date = new Date(dividend.transactionDate);
        return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
      })
      .reduce((sum, dividend) => sum + dividend.amount, 0);

    setDividendSummary({
      totalDividendAmount: totalAmount,
      totalTransactionCount: dividendData.length,
      thisYearDividend: thisYearAmount,
      thisMonthDividend: thisMonthAmount,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPortfolioData();
    setRefreshing(false);
  };

  const navigateToProductDetail = (productId: string) => {
    router.push(`/investment/product-detail?productId=${productId}`);
  };

  const navigateToSellOrder = (productId: string, quantity: number) => {
    router.push(`/investment/order?productId=${productId}&orderType=SELL&maxQuantity=${quantity}`);
  };


  const formatCurrency = (amount: number | undefined | null): string => {
    const safeAmount = Number(amount) || 0;
    if (isNaN(safeAmount)) return '0원';
    return new Intl.NumberFormat('ko-KR').format(safeAmount) + '원';
  };

  const formatRate = (rate: number | undefined | null): string => {
    const safeRate = Number(rate) || 0;
    if (isNaN(safeRate)) return '0.00%';
    const sign = safeRate >= 0 ? '+' : '';
    return `${sign}${safeRate.toFixed(2)}%`;
  };

  const getRiskLevelColor = (level: number): string => {
    switch (level) {
      case 1: return '#4DABF7';
      case 2: return '#51CF66';
      case 3: return '#FFD43B';
      case 4: return '#FF8787';
      case 5: return '#FF6B6B';
      default: return '#FFD43B';
    }
  };

  const getRiskLevelText = (level: number): string => {
    switch (level) {
      case 1: return '매우낮음';
      case 2: return '낮음';
      case 3: return '보통';
      case 4: return '높음';
      case 5: return '매우높음';
      default: return '보통';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}년 ${month}월 ${day}일`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>거래내역 기반 포트폴리오를 불러오는 중...</Text>
        <Text style={styles.loadingSubtext}>실제 거래 데이터를 분석하여 포트폴리오를 구성합니다</Text>
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
        <Text style={styles.headerTitle}>내 자산</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 포트폴리오 요약 */}
        <View style={styles.summarySection}>
          {summary ? (
            <>
              <View style={styles.summaryMainRow}>
                <Text style={styles.totalValueLabel}>총 평가금액</Text>
                <Text style={styles.totalValue}>{formatCurrency(summary.totalValue)}</Text>
                <View style={styles.profitInfo}>
                  <Text style={[
                    styles.profitValue,
                    summary.totalProfit >= 0 ? styles.profitText : styles.lossText
                  ]}>
                    {formatCurrency(summary.totalProfit)}
                  </Text>
                  <Text style={[
                    styles.profitValue,
                    summary.profitRate >= 0 ? styles.profitText : styles.lossText
                  ]}>
                    {formatRate(summary.profitRate)}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryBottomRow}>
                <View style={styles.summaryBottomItem}>
                  <Text style={styles.summaryBottomLabel}>투자원금</Text>
                  <Text style={styles.summaryBottomValue}>{formatCurrency(summary.totalCost)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryBottomItem}>
                  <Text style={styles.summaryBottomLabel}>보유상품</Text>
                  <Text style={styles.summaryBottomValue}>{summary.productCount}개</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.loadingSection}>
                <ActivityIndicator size="small" color={Colors.light.primary} />
                <Text style={styles.loadingText}>자산 정보를 불러오는 중...</Text>
              </View>
            </>
          )}
        </View>

        {/* 탭 선택 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'holdings' && styles.activeTab]}
            onPress={() => setSelectedTab('holdings')}
          >
            <Text style={[
              styles.tabText,
              selectedTab === 'holdings' && styles.activeTabText
            ]}>
              보유현황
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'profit-loss' && styles.activeTab]}
            onPress={() => setSelectedTab('profit-loss')}
          >
            <Text style={[
              styles.tabText,
              selectedTab === 'profit-loss' && styles.activeTabText
            ]}>
              실현 손익
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'dividends' && styles.activeTab]}
            onPress={() => setSelectedTab('dividends')}
          >
            <Text style={[
              styles.tabText,
              selectedTab === 'dividends' && styles.activeTabText
            ]}>
              배당 수익
            </Text>
          </TouchableOpacity>
        </View>

        {selectedTab === 'holdings' ? (
          /* 보유현황 탭 */
          <View style={styles.holdingsSection}>
            {portfolio.length > 0 ? (
              portfolio.map((holding) => (
                <TouchableOpacity
                  key={holding.id}
                  style={styles.holdingCard}
                  onPress={() => navigateToProductDetail(holding.productId)}
                >
                  <View style={styles.holdingHeader}>
                    <View style={styles.holdingInfo}>
                      <Text style={styles.holdingName}>{holding.productName}</Text>
                      <Text style={styles.holdingQuantity}>
                        {holding.quantity.toLocaleString()}주
                      </Text>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.sellButton}
                      onPress={() => navigateToSellOrder(holding.productId, holding.quantity)}
                    >
                      <Text style={styles.sellButtonText}>매도</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.holdingMetrics}>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>평균단가</Text>
                      <Text style={styles.metricValue}>
                        {formatCurrency(holding.averagePrice)}
                      </Text>
                    </View>
                    
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>현재가</Text>
                      <Text style={styles.metricValue}>
                        {formatCurrency(holding.currentPrice)}
                      </Text>
                    </View>
                    
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>평가금액</Text>
                      <Text style={styles.metricValue}>
                        {formatCurrency(holding.currentValue)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.holdingFooter}>
                    <View style={styles.profitLoss}>
                      <Text style={styles.profitLossLabel}>평가손익</Text>
                      <Text style={[
                        styles.profitLossValue,
                        holding.unrealizedProfitLoss >= 0 ? styles.profitText : styles.lossText
                      ]}>
                        {formatCurrency(holding.unrealizedProfitLoss)} ({formatRate(holding.profitLossRate)})
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="pie-chart" size={64} color={Colors.light.textSecondary} />
                <Text style={styles.emptyStateTitle}>보유 중인 상품이 없습니다</Text>
                <Text style={styles.emptyStateSubtitle}>
                  투자 상품을 구매하여 포트폴리오를 구성해보세요
                </Text>
                <TouchableOpacity
                  style={styles.investButton}
                  onPress={() => router.push('/investment/products')}
                >
                  <Text style={styles.investButtonText}>투자하기</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : selectedTab === 'profit-loss' ? (
          /* 매매 손익 탭 */
          <View style={styles.profitLossSection}>
            {tradingProfitLoss ? (
              <>
                {/* 전체 손익 요약 */}
                <View style={styles.profitLossSummary}>
                  <View style={styles.realizedSummaryTop}>
                    <Text style={styles.realizedSummaryLabel}>순 손익</Text>
                    <Text style={[
                      styles.realizedSummaryValue,
                      tradingProfitLoss.totalNetProfit >= 0 ? styles.profitText : styles.lossText
                    ]}>
                      {formatCurrency(tradingProfitLoss.totalNetProfit)}
                    </Text>
                  </View>

                  <View style={styles.realizedSummaryBottom}>
                    <View style={styles.realizedSummaryItem}>
                      <Text style={styles.realizedBottomLabel}>실현 손익</Text>
                      <Text style={[
                        styles.realizedBottomValue,
                        tradingProfitLoss.totalRealizedProfit >= 0 ? styles.profitText : styles.lossText
                      ]}>
                        {formatCurrency(tradingProfitLoss.totalRealizedProfit)}
                      </Text>
                    </View>
                    <View style={styles.realizedSummaryDivider} />
                    <View style={styles.realizedSummaryItem}>
                      <Text style={styles.realizedBottomLabel}>수익률</Text>
                      <Text style={[
                        styles.realizedBottomValue,
                        tradingProfitLoss.totalRealizedProfitRate >= 0 ? styles.profitText : styles.lossText
                      ]}>
                        {formatRate(tradingProfitLoss.totalRealizedProfitRate)}
                      </Text>
                    </View>
                    <View style={styles.realizedSummaryDivider} />
                    <View style={styles.realizedSummaryItem}>
                      <Text style={styles.realizedBottomLabel}>수수료</Text>
                      <Text style={[styles.realizedBottomValue, styles.feeText]}>
                        {formatCurrency(tradingProfitLoss.totalFees)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 개별 거래 손익 리스트 */}
                <View style={styles.profitLossCard}>
                  <Text style={styles.profitLossTitle}>거래별 손익</Text>
                  {tradingProfitLoss.realizedProfits.length > 0 ? (
                    <View style={styles.profitLossList}>
                      {tradingProfitLoss.realizedProfits.map((profit) => (
                        <View key={profit.transactionId} style={styles.profitLossItem}>
                          <View style={styles.profitLossHeader}>
                            <Text style={styles.productName}>{profit.productName}</Text>
                            <Text style={styles.sellDate}>{formatDate(profit.sellDate)}</Text>
                          </View>
                          <View style={styles.profitLossDetails}>
                            <View style={styles.priceRow}>
                              <Text style={styles.priceLabel}>매수가: {formatCurrency(profit.buyPrice)}</Text>
                              <Text style={styles.priceLabel}>매도가: {formatCurrency(profit.sellPrice)}</Text>
                            </View>
                            <View style={styles.profitRow}>
                              <Text style={styles.quantityLabel}>수량: {profit.quantity}주</Text>
                              <Text style={[
                                styles.profitValue,
                                profit.netProfit >= 0 ? styles.profitText : styles.lossText
                              ]}>
                                {formatCurrency(profit.netProfit)} ({formatRate(profit.profitRate)})
                              </Text>
                            </View>
                            {profit.fees > 0 && (
                              <Text style={styles.feeLabel}>수수료: {formatCurrency(profit.fees)}</Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyProfitLoss}>
                      <MaterialIcons name="trending-up" size={48} color={Colors.light.textSecondary} />
                      <Text style={styles.emptyTitle}>매매 기록이 없습니다</Text>
                      <Text style={styles.emptyDescription}>매도 거래가 완료되면 손익이 표시됩니다.</Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
                <Text style={styles.loadingText}>매매 손익을 계산하고 있습니다...</Text>
              </View>
            )}
          </View>
        ) : (
          /* 배당 수익 탭 */
          <View style={styles.dividendsSection}>
            {dividendSummary ? (
              <View style={styles.dividendSummaryCard}>
                <View style={styles.dividendSummaryTop}>
                  <Text style={styles.dividendTotalLabel}>총 배당수익</Text>
                  <Text style={styles.dividendTotalValue}>
                    {formatCurrency(dividendSummary.totalDividendAmount)}
                  </Text>
                </View>

                <View style={styles.dividendSummaryBottom}>
                  <View style={styles.dividendSummaryItem}>
                    <Text style={styles.dividendBottomLabel}>올해 배당</Text>
                    <Text style={styles.dividendBottomValue}>
                      {formatCurrency(dividendSummary.thisYearDividend)}
                    </Text>
                  </View>
                  <View style={styles.dividendSummaryDivider} />
                  <View style={styles.dividendSummaryItem}>
                    <Text style={styles.dividendBottomLabel}>이번달 배당</Text>
                    <Text style={styles.dividendBottomValue}>
                      {formatCurrency(dividendSummary.thisMonthDividend)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.dividendSummaryCard}>
                <View style={styles.loadingSection}>
                  <ActivityIndicator size="small" color={Colors.light.primary} />
                  <Text style={styles.loadingText}>배당 정보를 불러오는 중...</Text>
                </View>
              </View>
            )}

            <View style={styles.dividendHistoryCard}>
              <Text style={styles.dividendHistoryTitle}>배당 지급 내역</Text>

              {dividends.length > 0 ? (
                <View style={styles.dividendList}>
                  {dividends.map((dividend, index) => (
                    <View key={index} style={styles.dividendItem}>
                      <View style={styles.dividendItemInfo}>
                        <Text style={styles.dividendProductName}>
                          {dividend.productName || dividend.productCode}
                        </Text>
                        <Text style={styles.dividendDate}>
                          {formatDate(dividend.transactionDate)}
                        </Text>
                      </View>
                      <Text style={styles.dividendAmount}>
                        +{formatCurrency(dividend.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : dividendSummary === null ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.light.primary} />
                  <Text style={styles.loadingText}>배당 내역을 불러오는 중...</Text>
                </View>
              ) : (
                <View style={styles.emptyDividend}>
                  <MaterialIcons name="monetization-on" size={48} color={Colors.light.textSecondary} />
                  <Text style={styles.emptyDividendTitle}>배당 지급 내역이 없습니다</Text>
                  <Text style={styles.emptyDividendSubtitle}>
                    배당금을 지급하는 상품에 투자해보세요
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 하단 여백 */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.text,
    marginTop: 16,
    fontWeight: '600',
  },
  loadingSubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
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
  content: {
    flex: 1,
    backgroundColor: Colors.light.surface,
  },
  summarySection: {
    backgroundColor: Colors.light.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  summaryMainRow: {
    marginBottom: 20,
  },
  totalValueLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  profitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profitValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  summaryBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  summaryBottomItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryBottomLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 6,
  },
  summaryBottomValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.light.border,
  },
  summaryDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: 16,
  },
  summaryItem: {
    alignItems: 'center',
    width: (width - 72) / 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surface,
    marginTop: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  activeTabText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  holdingsSection: {
    backgroundColor: Colors.light.background,
  },
  holdingCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  holdingInfo: {
    flex: 1,
  },
  holdingName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  holdingQuantity: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  sellButton: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.info,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sellButtonText: {
    color: Colors.light.info,
    fontSize: 12,
    fontWeight: '600',
  },
  holdingMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  holdingFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 12,
  },
  profitLoss: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profitLossLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  profitLossValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
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
    marginBottom: 16,
  },
  investButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  investButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  // 매매 손익 스타일
  profitLossSection: {
    backgroundColor: Colors.light.background,
  },
  profitLossSummary: {
    backgroundColor: Colors.light.background,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  realizedSummaryTop: {
    alignItems: 'center',
    marginBottom: 20,
  },
  realizedSummaryLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  realizedSummaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  realizedSummaryBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  realizedSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  realizedBottomLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 6,
  },
  realizedBottomValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  realizedSummaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.light.border,
  },
  profitLossCard: {
    backgroundColor: Colors.light.background,
    padding: 16,
  },
  profitLossTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    minWidth: '40%',
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  profitLossList: {
  },
  profitLossItem: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  profitLossHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sellDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  profitLossDetails: {
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceLabel: {
    fontSize: 12,
    color: Colors.light.text,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  profitValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  feeLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    textAlign: 'right',
  },
  emptyProfitLoss: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  profitText: {
    color: Colors.light.error,
  },
  lossText: {
    color: Colors.light.info,
  },
  feeText: {
    color: Colors.light.textSecondary,
  },
  // 배당 수익 스타일
  dividendsSection: {
    backgroundColor: Colors.light.background,
  },
  dividendSummaryCard: {
    backgroundColor: Colors.light.background,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  dividendSummaryTop: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dividendTotalLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  dividendTotalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#059669',
  },
  dividendSummaryBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  dividendSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  dividendBottomLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 6,
  },
  dividendBottomValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  dividendSummaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.light.border,
  },
  dividendHistoryCard: {
    backgroundColor: Colors.light.background,
    padding: 20,
    paddingTop: 16,
  },
  dividendHistoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  dividendList: {
  },
  dividendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  dividendItemInfo: {
    flex: 1,
  },
  dividendProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  dividendDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  dividendAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  dividendMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  dividendMoreText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  emptyDividend: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyDividendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyDividendSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 20,
  },
  loadingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  loadingValue: {
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});