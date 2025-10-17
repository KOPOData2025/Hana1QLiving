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
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useTabBar } from '@/contexts/TabBarContext';
import { investmentApi } from '@/services/investmentApi';
import { mobileApi } from '@/services/mobileApi';
import { useInvestmentData } from '@/hooks/useWebSocket';
import { HanaHeader } from '@/components/HanaHeader';
import { HanaCard } from '@/components/HanaCard';

const { width } = Dimensions.get('window');

interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  profitRate: number;
  productCount: number;
}


export default function InvestmentScreen() {
  const { user } = useAuth();
  const { setTabBarVisible } = useTabBar();
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [securitiesAccounts, setSecuritiesAccounts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedRankingType, setSelectedRankingType] = useState<'dividend' | 'marketCap' | 'return'>('dividend');
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]); // 전체 상품 캐시
  const [rankingLoading, setRankingLoading] = useState(false);
  const scrollY = React.useRef(0);
  const lastScrollY = React.useRef(0);

  // 실시간 데이터 연결 (임시 비활성화 - 백엔드 WebSocket 구현 필요)
  const {
    websocket,
    portfolio: realtimePortfolio,
    orders: realtimeOrders
  } = useInvestmentData({
    includePortfolio: true, // 실시간 포트폴리오 업데이트 활성화
    includeOrders: true // 실시간 주문 상태 업데이트 활성화
  });

  useEffect(() => {
    loadData();

    // WebSocket 강제 연결 시도
    websocket.connect().then(() => {
    }).catch((error) => {
    });

    // 화면 진입 시 탭바 보이기
    setTabBarVisible(true);

    // 화면 나갈 때 탭바 보이기
    return () => {
      setTabBarVisible(true);
    };
  }, []);

  // 실시간 포트폴리오 업데이트 처리
  useEffect(() => {
    if (realtimePortfolio?.portfolioUpdate) {
      const update = realtimePortfolio.portfolioUpdate;
      setPortfolioSummary({
        totalValue: update.totalValue,
        totalCost: update.totalValue - update.totalProfitLoss,
        totalProfit: update.totalProfitLoss,
        profitRate: update.totalProfitLossRate,
        productCount: update.positions.length,
      });
    }
  }, [realtimePortfolio?.portfolioUpdate]);

  // 순위 타입 변경 시 캐시된 데이터 재정렬
  useEffect(() => {
    if (allProducts.length > 0) {
      setRankingLoading(true);
      // 캐시된 데이터를 재정렬만 수행
      sortAndSetTopProducts(allProducts, selectedRankingType);
      setRankingLoading(false);
    }
  }, [selectedRankingType]);


  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPortfolioSummary(),
        loadSecuritiesAccounts(),
        loadTopProducts(),
      ]);
    } catch (error) {
      Alert.alert('오류', '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadSecuritiesAccounts = async () => {
    try {
      const response = await mobileApi.getMyAccounts(user?.id);
      if (response && response.success) {
        setSecuritiesAccounts(response.securitiesAccounts || []);
      } else {
        setSecuritiesAccounts([]);
      }
    } catch (error) {
      setSecuritiesAccounts([]);
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
        setPortfolioSummary(mappedData);
        setLoadError(false);
      } else {
        // 데이터가 없을 때 기본값 설정
        setPortfolioSummary(null);
        setLoadError(false);
      }
    } catch (error) {
      // 에러 시 에러 상태 설정
      setPortfolioSummary(null);
      setLoadError(true);
    }
  };

  const loadTopProducts = async () => {
    try {
      setRankingLoading(true);
      const response = await investmentApi.getInvestmentProducts();

      if (response && response.success && response.data) {
        // 각 상품별 배당 정보 조회 및 병합 (병렬 처리로 성능 향상)
        const enrichedProducts = await Promise.all(
          response.data.map(async (product: any) => {
            try {
              const dividendsResponse = await investmentApi.getProductDividends(product.productCode);

              if (dividendsResponse && dividendsResponse.success && dividendsResponse.data && dividendsResponse.data.length > 0) {
                const latestDividend = dividendsResponse.data[0];
                return {
                  ...product,
                  dividendYield: latestDividend.CALCULATED_YIELD_PERCENT || 0,
                };
              }

              return product;
            } catch (error) {
              return product;
            }
          })
        );

        // 전체 상품 데이터를 캐시에 저장
        setAllProducts(enrichedProducts);
        // 초기 순위 정렬
        sortAndSetTopProducts(enrichedProducts, selectedRankingType);
      } else {
        setAllProducts([]);
        setTopProducts([]);
      }
    } catch (error) {
      Alert.alert('알림', '리츠 순위 정보를 불러올 수 없습니다.');
      setAllProducts([]);
      setTopProducts([]);
    } finally {
      setRankingLoading(false);
    }
  };

  const sortAndSetTopProducts = (products: any[], rankingType: 'dividend' | 'marketCap' | 'return') => {
    if (!products || products.length === 0) {
      setTopProducts([]);
      return;
    }

    let sorted = [...products];

    // 실제 데이터가 있는 상품만 필터링
    if (rankingType === 'dividend') {
      sorted = sorted.filter(p => p.dividendYield && p.dividendYield > 0);
      sorted.sort((a, b) => b.dividendYield - a.dividendYield);
    } else if (rankingType === 'marketCap') {
      sorted = sorted.filter(p => p.currentPrice && p.currentPrice > 0 && p.marketCap && p.marketCap > 0);
      sorted.sort((a, b) => b.marketCap - a.marketCap);
    } else if (rankingType === 'return') {
      sorted = sorted.filter(p => p.totalReturn && p.totalReturn !== 0);
      sorted.sort((a, b) => b.totalReturn - a.totalReturn);
    }

    const top5 = sorted.slice(0, 5);
    setTopProducts(top5);
  };


  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0원';
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const formatRate = (rate: number | undefined): string => {
    if (rate === undefined || rate === null || isNaN(rate)) return '0.00%';
    const sign = rate >= 0 ? '+' : '';
    return `${sign}${rate.toFixed(2)}%`;
  };

  const formatMarketCap = (marketCap: number | undefined): string => {
    if (marketCap === undefined || marketCap === null || isNaN(marketCap) || marketCap === 0) return '0조';

    const trillion = Math.floor(marketCap / 1000000000000); // 조 단위
    const billion = Math.floor((marketCap % 1000000000000) / 100000000); // 억 단위

    if (trillion > 0 && billion > 0) {
      return `${trillion}조${billion}억`;
    } else if (trillion > 0) {
      return `${trillion}조`;
    } else {
      return `${billion}억`;
    }
  };

  const navigateToProducts = () => {
    router.push('/investment/products');
  };

  const navigateToPortfolio = () => {
    router.push('/investment/portfolio');
  };

  const navigateToTransactions = () => {
    router.push('/investment/transactions');
  };

  const navigateToOrders = () => {
    router.push('/investment/orders');
  };

  const navigateToMap = () => {
    router.push('/investment/map');
  };

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

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#c8e6c9"
        translucent={false}
      />

      {/* 상단 헤더 - 녹색 배경 */}
      <HanaHeader
        title="투자"
      />

      <View style={styles.whiteBackground}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loadingText}>로딩 중...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            bounces={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {/* 총 자산 요약 */}
            {portfolioSummary && (
              <View>
                <Text style={styles.assetsSectionTitle}>내 자산 현황</Text>
                <View style={styles.totalAssetsCard}>
                  <View style={styles.totalAssetsHeader}>
                    <Text style={styles.totalAssetsTitle}>{user?.name || '사용자'}님의 총자산</Text>
                    <View style={styles.hideBadge}>
                      <Text style={styles.hideBadgeText}>숨김</Text>
                    </View>
                  </View>

                  <View style={styles.totalAssetsContent}>
                    <View style={styles.totalAssetsLeft}>
                      <Text style={styles.totalAssetsValue}>
                        {formatCurrency((() => {
                          const securitiesBalance = securitiesAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
                          const investmentValue = portfolioSummary.totalValue || 0;
                          return securitiesBalance + investmentValue;
                        })())}
                      </Text>
                      <View style={styles.assetBreakdown}>
                        <View style={styles.assetBreakdownItem}>
                          <View style={styles.assetBreakdownLabel}>
                            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                            <Text style={styles.assetBreakdownText}>국내리츠</Text>
                          </View>
                          <Text style={styles.assetBreakdownAmount}>{formatCurrency(portfolioSummary.totalValue || 0)}</Text>
                        </View>
                        <View style={styles.assetBreakdownItem}>
                          <View style={styles.assetBreakdownLabel}>
                            <View style={[styles.legendDot, { backgroundColor: '#E5E7EB' }]} />
                            <Text style={styles.assetBreakdownText}>예수금</Text>
                          </View>
                          <Text style={styles.assetBreakdownAmount}>{formatCurrency(securitiesAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0))}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.chartContainer}>
                      <View style={styles.donutChartContainer}>
                        <View style={styles.donutRingBackground} />
                        {Array.from({ length: 360 }).map((_, index) => {
                          const securitiesBalance = securitiesAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
                          const investmentValue = portfolioSummary.totalValue || 0;
                          const totalAssets = securitiesBalance + investmentValue;
                          const investmentRatio = totalAssets > 0 ? investmentValue / totalAssets : 0;
                          const investmentPercent = Math.round(investmentRatio * 100);
                          const percent = (index / 360) * 100;
                          const isActive = percent < investmentPercent;
                          const angle = index - 90;
                          const radius = 32.5;
                          const x = 40 + radius * Math.cos((angle * Math.PI) / 180);
                          const y = 40 + radius * Math.sin((angle * Math.PI) / 180);

                          return (
                            <View
                              key={index}
                              style={[
                                styles.thinSegment,
                                {
                                  backgroundColor: isActive ? '#10B981' : '#E5E7EB',
                                  left: x,
                                  top: y,
                                  transform: [
                                    { translateX: -0.75 },
                                    { translateY: -7.5 },
                                    { rotate: `${angle + 90}deg` }
                                  ],
                                }
                              ]}
                            />
                          );
                        })}
                        <View style={styles.donutCenter}>
                          <Text style={styles.donutPercentText}>
                            {(() => {
                              const securitiesBalance = securitiesAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
                              const investmentValue = portfolioSummary.totalValue || 0;
                              const totalAssets = securitiesBalance + investmentValue;
                              const investmentRatio = totalAssets > 0 ? investmentValue / totalAssets : 0;
                              return Math.round(investmentRatio * 100);
                            })()}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}

          {/* 나머지 콘텐츠 */}
          <View>
          {portfolioSummary && (
            <>
            {/* 포트폴리오 요약 */}
            <View style={styles.portfolioSection}>
              <Text style={styles.portfolioSectionTitle}>내 리츠 포트폴리오</Text>

              {loadError ? (
                <View style={styles.portfolioSummaryCard}>
                  <View style={styles.errorCard}>
                    <MaterialIcons name="error-outline" size={48} color={Colors.light.error} />
                    <Text style={styles.errorTitle}>데이터를 불러올 수 없습니다</Text>
                    <Text style={styles.errorSubtitle}>
                      잠시 후 다시 시도해주세요
                    </Text>
                    <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                      <Text style={styles.retryButtonText}>다시 시도</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : portfolioSummary ? (
                <TouchableOpacity style={styles.portfolioSummaryCard} onPress={navigateToPortfolio}>
                  <View style={styles.portfolioHeader}>
                    <Text style={styles.portfolioLabel}>총 평가금액</Text>
                    <MaterialIcons name="chevron-right" size={24} color={Colors.light.textSecondary} />
                  </View>

                  <Text style={styles.portfolioValue}>
                    {formatCurrency(portfolioSummary.totalValue)}
                  </Text>

                  <View style={styles.portfolioDetails}>
                    <View style={styles.portfolioDetailRow}>
                      <Text style={styles.portfolioDetailLabel}>투자원금</Text>
                      <Text style={styles.portfolioDetailValue}>
                        {formatCurrency(portfolioSummary.totalCost)}
                      </Text>
                    </View>

                    <View style={styles.portfolioDetailRow}>
                      <Text style={styles.portfolioDetailLabel}>평가손익</Text>
                      <Text style={[
                        styles.portfolioDetailValue,
                        (portfolioSummary.totalProfit || 0) >= 0 ? styles.profitText : styles.lossText
                      ]}>
                        {formatCurrency(portfolioSummary.totalProfit)} ({formatRate(portfolioSummary.profitRate)})
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.portfolioSummaryCard}>
                  <TouchableOpacity style={styles.emptyPortfolioContent} onPress={navigateToProducts}>
                    <MaterialIcons name="trending-up" size={48} color={Colors.light.primary} />
                    <Text style={styles.emptyPortfolioTitle}>투자를 시작해보세요</Text>
                    <Text style={styles.emptyPortfolioSubtitle}>
                      하나원큐리빙 REITs 상품으로 안정적인 투자를 시작하세요
                    </Text>
                    <View style={styles.startButton}>
                      <Text style={styles.startButtonText}>투자 상품 보기</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 리츠 투자 시뮬레이션 배너 */}
            <View style={styles.simulationBannerContainer}>
              <TouchableOpacity
                style={styles.simulationBanner}
                onPress={() => router.push('/investment/simulation-input')}
              >
                <View style={styles.simulationContent}>
                  <View style={styles.simulationIcon}>
                    <MaterialIcons name="timeline" size={32} color={Colors.light.background} />
                  </View>
                  <View style={styles.simulationText}>
                    <Text style={styles.simulationTitle}>
                      이때 투자했더라면 지금은?
                    </Text>
                    <Text style={styles.simulationSubtitle}>
                      과거 투자 결과를 시뮬레이션해보세요
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color={Colors.light.background} />
                </View>
              </TouchableOpacity>
            </View>

            {/* 리츠 순위 섹션 */}
            <View style={styles.rankingSection}>
              <Text style={styles.rankingSectionTitle}>리츠 순위</Text>

              {/* 순위 타입 필터 */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.rankingFilterScroll}
                contentContainerStyle={styles.rankingFilterContainer}
              >
                <TouchableOpacity
                  style={[styles.rankingFilterButton, selectedRankingType === 'dividend' && styles.rankingFilterButtonActive]}
                  onPress={() => setSelectedRankingType('dividend')}
                >
                  <Text style={[styles.rankingFilterText, selectedRankingType === 'dividend' && styles.rankingFilterTextActive]}>
                    배당
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rankingFilterButton, selectedRankingType === 'marketCap' && styles.rankingFilterButtonActive]}
                  onPress={() => setSelectedRankingType('marketCap')}
                >
                  <Text style={[styles.rankingFilterText, selectedRankingType === 'marketCap' && styles.rankingFilterTextActive]}>
                    시가총액
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rankingFilterButton, selectedRankingType === 'return' && styles.rankingFilterButtonActive]}
                  onPress={() => setSelectedRankingType('return')}
                >
                  <Text style={[styles.rankingFilterText, selectedRankingType === 'return' && styles.rankingFilterTextActive]}>
                    상승
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* 순위 카드 */}
              <View style={styles.rankingCard}>
                {/* 카드 헤더 */}
                <View style={styles.rankingCardHeader}>
                  <Text style={styles.rankingCardTitle}>
                    {selectedRankingType === 'dividend' && '배당 많이 주는 종목 순위'}
                    {selectedRankingType === 'marketCap' && '시가총액이 큰 종목 순위'}
                    {selectedRankingType === 'return' && '상승률이 높은 종목 순위'}
                  </Text>
                </View>
                {rankingLoading ? (
                  <View style={styles.rankingLoadingContainer}>
                    <ActivityIndicator size="large" color="#2c3e50" />
                    <Text style={styles.rankingLoadingText}>순위를 불러오는 중...</Text>
                  </View>
                ) : topProducts.length > 0 ? (
                  <>
                    <View style={styles.rankingListContainer}>
                      {topProducts.map((product, index) => {
                      const rank = index + 1;

                      // 전일대비 색상 결정 (1:상승, 2:보합, 3:하락, 4:상한, 5:하한)
                      const priceChangeSign = product.priceChangeSign || '0';
                      let changeColor = Colors.light.textSecondary;
                      if (priceChangeSign === '1' || priceChangeSign === '2' || priceChangeSign === '4') {
                        changeColor = '#d32f2f'; // 상승/보합/상한: 빨간색
                      } else if (priceChangeSign === '3' || priceChangeSign === '5') {
                        changeColor = '#1976d2'; // 하락/하한: 파란색
                      }

                      // 전일대비 변화량 포맷
                      const priceChange = product.priceChange || 0;
                      const totalReturn = product.totalReturn || 0;
                      const changeText = `${priceChange >= 0 ? '+' : ''}${priceChange.toLocaleString('ko-KR')} (${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%)`;

                      return (
                        <TouchableOpacity
                          key={product.productId}
                          style={styles.rankingListItem}
                          onPress={() => router.push(`/investment/product-detail?productId=${product.productId}`)}
                        >
                          <Text style={styles.rankingNumber}>{rank}</Text>
                          <View style={styles.rankingLeftContent}>
                            <Text style={styles.rankingProductName} numberOfLines={1}>
                              {product.productName}
                            </Text>
                            {selectedRankingType === 'dividend' && (
                              <Text style={styles.rankingDividendText}>
                                배당수익률 {(product.dividendYield || 0).toFixed(2)}%
                              </Text>
                            )}
                            {selectedRankingType === 'marketCap' && (
                              <Text style={styles.rankingDividendText}>
                                시가총액 {formatMarketCap(product.marketCap)}
                              </Text>
                            )}
                          </View>
                          <View style={styles.rankingRightContent}>
                            <Text style={styles.rankingPrice}>
                              {(product.currentPrice || 0).toLocaleString('ko-KR')}
                            </Text>
                            <Text style={[styles.rankingChange, { color: changeColor }]}>
                              {changeText}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    </View>

                    {/* 더보기 버튼 */}
                    <TouchableOpacity style={styles.moreButton}>
                      <Text style={styles.moreButtonText}>더보기</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.emptyRankingContainer}>
                    <MaterialIcons name="trending-up" size={48} color={Colors.light.textSecondary} />
                    <Text style={styles.emptyRankingText}>리츠 순위 정보를 불러오는 중입니다</Text>
                    <Text style={styles.emptyRankingSubtext}>잠시만 기다려주세요</Text>
                  </View>
                )}
              </View>
            </View>
            </>
          )}
          </View>

          {/* 메뉴 섹션 */}
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>투자 메뉴</Text>
            <View style={styles.menuListCard}>
              <TouchableOpacity
                style={styles.menuListItem}
                onPress={navigateToProducts}
              >
                <Text style={styles.menuListItemText}>투자상품</Text>
                <MaterialIcons name="chevron-right" size={24} color={Colors.light.textSecondary} />
              </TouchableOpacity>

              <View style={styles.menuListDivider} />

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={navigateToMap}
              >
                <Text style={styles.menuListItemText}>지역투자</Text>
                <MaterialIcons name="chevron-right" size={24} color={Colors.light.textSecondary} />
              </TouchableOpacity>

              <View style={styles.menuListDivider} />

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={navigateToOrders}
              >
                <Text style={styles.menuListItemText}>주문현황</Text>
                <MaterialIcons name="chevron-right" size={24} color={Colors.light.textSecondary} />
              </TouchableOpacity>

              <View style={styles.menuListDivider} />

              <TouchableOpacity
                style={styles.menuListItem}
                onPress={navigateToTransactions}
              >
                <Text style={styles.menuListItemText}>거래내역</Text>
                <MaterialIcons name="chevron-right" size={24} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          </ScrollView>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    padding: 16,
    paddingBottom: 0,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  portfolioCard: {
    backgroundColor: 'transparent',
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  portfolioLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
  },
  portfolioValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 20,
    letterSpacing: -1,
  },
  portfolioDetails: {
    gap: 12,
  },
  portfolioDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portfolioDetailLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  portfolioDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  emptyPortfolioCard: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 40,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  emptyPortfolioTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyPortfolioSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  profitText: {
    color: '#d32f2f', // 플러스일 때 빨간색
  },
  lossText: {
    color: '#0066CC', // 마이너스일 때 파란색
  },
  errorCard: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  assetsSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  totalAssetsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  totalAssetsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalAssetsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  hideBadge: {
    backgroundColor: Colors.light.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hideBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  totalAssetsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalAssetsLeft: {
    flex: 1,
  },
  totalAssetsValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
    letterSpacing: -1,
  },
  assetBreakdown: {
    gap: 8,
  },
  assetBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assetBreakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 80,
  },
  assetBreakdownText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  assetBreakdownAmount: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  totalAssetsChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalAssetsChangeText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: -4,
  },
  chartContainer: {
    marginLeft: 20,
  },
  donutChartContainer: {
    width: 80,
    height: 80,
    marginBottom: 12,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutRingBackground: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 15,
    borderColor: 'transparent',
  },
  thinSegment: {
    position: 'absolute',
    width: 1.5,
    height: 15,
  },
  donutCenter: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  donutPercentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  chartInfo: {
    gap: 8,
  },
  chartInfoItem: {
    flexDirection: 'column',
    gap: 2,
  },
  chartInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  chartAmountText: {
    fontSize: 10,
    color: Colors.light.text,
    fontWeight: '500',
    marginLeft: 12,
  },

  // 포트폴리오 섹션
  portfolioSection: {
    marginTop: 16,
    marginBottom: 12,
  },
  portfolioSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  portfolioSummaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyPortfolioContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  // 리츠 순위 섹션
  rankingSection: {
    marginTop: 16,
    marginBottom: 12,
  },
  rankingSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
    marginHorizontal: 16,
  },
  rankingSectionSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.light.textSecondary,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  rankingFilterScroll: {
    marginVertical: 6,
    marginBottom: 13,
  },
  rankingFilterContainer: {
    gap: 8,
    paddingHorizontal: 16,
  },
  rankingFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  rankingFilterButtonActive: {
    backgroundColor: '#2c3e50',
  },
  rankingFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  rankingFilterTextActive: {
    color: 'white',
  },
  rankingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  rankingCardHeader: {
    marginBottom: 16,
  },
  rankingCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  rankingLoadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankingLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  rankingListContainer: {
    gap: 0,
  },
  moreButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  moreButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#757575',
  },
  rankingListItem: {
    flexDirection: 'row',
    padding: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  rankingNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    width: 24,
    marginRight: 16,
  },
  rankingLeftContent: {
    flex: 1,
    gap: 4,
  },
  rankingProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  rankingDividendText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  rankingRightContent: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rankingPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  rankingChange: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyRankingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyRankingText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyRankingSubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  // 메뉴 섹션
  menuSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  menuSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginHorizontal: 16,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  menuListCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  menuListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 12,
  },
  menuListItemText: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '500',
  },
  menuListDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 18,
  },
  // 시뮬레이션 배너 스타일
  simulationBannerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 4,
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