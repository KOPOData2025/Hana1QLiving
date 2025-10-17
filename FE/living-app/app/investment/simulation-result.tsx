import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { SimulationResult, ReitRanking } from '@/services/investmentApi';

export default function SimulationResultScreen() {
  const params = useLocalSearchParams();
  const result: SimulationResult = JSON.parse(params.resultData as string);
  const [selectedReit, setSelectedReit] = useState<ReitRanking | null>(null);

  const formatMoney = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '0';
    return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
  };

  const formatPercent = (value: number | null | undefined, decimals: number = 1): string => {
    if (value === null || value === undefined) return '0.0';
    return value.toFixed(decimals);
  };

  const formatPeriod = (period: string): string => {
    // "1년 0개월" -> "1년", "2년 3개월" -> "2년 3개월"
    return period.replace(/\s*0개월/g, '').trim();
  };

  const formatDateKorean = (dateString: string): string => {
    // "2024-01-02" -> "2024년 1월 2일"
    const parts = dateString.split('-');
    return `${parts[0]}년 ${parseInt(parts[1])}월 ${parseInt(parts[2])}일`;
  };

  const getRankIcon = (rank: number): string | null => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const renderRankingRow = ({ item }: { item: ReitRanking }) => {
    const rankIcon = getRankIcon(item.rank);
    const isPositive = item.profit >= 0;

    return (
      <TouchableOpacity
        style={styles.rankingRow}
        onPress={() => setSelectedReit(item)}
      >
        <View style={styles.rankColumn}>
          {rankIcon ? (
            <Text style={styles.rankIcon}>{rankIcon}</Text>
          ) : (
            <Text style={styles.rankNumber}>{item.rank}</Text>
          )}
        </View>

        <View style={styles.infoColumn}>
          <Text style={styles.reitName} numberOfLines={1}>
            {item.productName}
          </Text>
        </View>

        <View style={styles.resultColumn}>
          <Text style={styles.finalValue}>{formatMoney(item.finalValue)}원</Text>
          <Text style={[styles.profit, isPositive ? styles.profitPositive : styles.profitNegative]}>
            {isPositive ? '+' : ''}{formatMoney(item.profit)}원
          </Text>
          <Text style={styles.returnRate}>
            ({isPositive ? '+' : ''}{formatPercent(item.returnRate, 1)}%)
          </Text>
        </View>

        <MaterialIcons name="chevron-right" size={20} color={Colors.light.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>시뮬레이션 결과</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={result.rankings && result.rankings.length > 3 ? result.rankings.slice(3) : []}
        renderItem={renderRankingRow}
        keyExtractor={(item) => item.productCode}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>시뮬레이션 데이터가 없습니다</Text>
            <Text style={styles.emptyText}>
              선택한 기간의 가격 데이터가 없습니다.{'\n'}
              다른 기간으로 다시 시도해보세요.
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View>
            {/* Subtitle */}
            <Text style={styles.subtitle}>
              설정한 조건으로 6개 리츠 상품을 비교 분석한 결과입니다
            </Text>

            {/* 시뮬레이션 정보 간소화 섹션 */}
            <View style={styles.section}>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>시뮬레이션 정보</Text>
                <View style={styles.periodDivider} />
                <View style={styles.periodRow}>
                  <Text style={styles.periodLabel}>기간</Text>
                  <Text style={styles.periodValue}>
                    {result.inputSummary.startDate.replace(/-/g, '.')} ~ {result.inputSummary.endDate.replace(/-/g, '.')}
                  </Text>
                </View>
                <View style={styles.periodRow}>
                  <Text style={styles.periodLabel}>초기 투자금</Text>
                  <Text style={styles.periodValue}>
                    {formatMoney(result.inputSummary.initialInvestment)}원
                  </Text>
                </View>
                {result.inputSummary.recurringInvestment > 0 && (
                  <View style={styles.periodRow}>
                    <Text style={styles.periodLabel}>정기 투자금</Text>
                    <Text style={styles.periodValue}>
                      {formatMoney(result.inputSummary.recurringInvestment)}원
                    </Text>
                  </View>
                )}
                <View style={styles.periodDivider} />
                <View style={styles.periodRow}>
                  <Text style={styles.investmentTotalLabel}>총 투자금</Text>
                  <Text style={styles.investmentTotalValue}>
                    {formatMoney(result.inputSummary.totalInvestment)}원
                  </Text>
                </View>
              </View>
            </View>

            {/* 1/2/3등 카드 섹션 */}
            {result.rankings && result.rankings.length > 0 && (
              <View style={styles.section}>
                {/* 1등 카드 */}
                <TouchableOpacity
                  style={styles.firstPlaceCard}
                  onPress={() => setSelectedReit(result.rankings[0])}
                >
                  <Text style={styles.firstPlaceRank}>🥇 1등</Text>
                  <Text style={styles.firstPlaceName}>{result.rankings[0].productName}</Text>
                  <View style={styles.firstPlaceResults}>
                    <Text style={styles.firstPlaceValue}>
                      {formatMoney(result.rankings[0].finalValue)}원
                    </Text>
                    <Text style={styles.firstPlaceProfit}>
                      +{formatMoney(result.rankings[0].profit)}원 (+{formatPercent(result.rankings[0].returnRate, 1)}%)
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* 2등 카드 */}
                {result.rankings.length > 1 && (
                  <TouchableOpacity
                    style={styles.secondPlaceCard}
                    onPress={() => setSelectedReit(result.rankings[1])}
                  >
                    <View style={styles.placeHeader}>
                      <Text style={styles.secondPlaceRank}>🥈 2등</Text>
                      <Text style={styles.secondPlaceName}>{result.rankings[1].productName}</Text>
                    </View>
                    <Text style={styles.secondPlaceProfit}>
                      +{formatMoney(result.rankings[1].profit)}원 (+{formatPercent(result.rankings[1].returnRate, 1)}%)
                    </Text>
                  </TouchableOpacity>
                )}

                {/* 3등 카드 */}
                {result.rankings.length > 2 && (
                  <TouchableOpacity
                    style={styles.thirdPlaceCard}
                    onPress={() => setSelectedReit(result.rankings[2])}
                  >
                    <View style={styles.placeHeader}>
                      <Text style={styles.thirdPlaceRank}>🥉 3등</Text>
                      <Text style={styles.thirdPlaceName}>{result.rankings[2].productName}</Text>
                    </View>
                    <Text style={styles.thirdPlaceProfit}>
                      +{formatMoney(result.rankings[2].profit)}원 (+{formatPercent(result.rankings[2].returnRate, 1)}%)
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* 순위 섹션 헤더 */}
            {result.rankings && result.rankings.length > 3 && (
              <View style={styles.rankingSectionHeader}>
                <Text style={styles.rankingSectionTitle}>
                  나머지 순위
                </Text>
                <Text style={styles.rankingSectionSubtitle}>
                  수익률 순으로 정렬
                </Text>
              </View>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* 상세 모달 */}
      {selectedReit && (
        <DetailModal
          visible={!!selectedReit}
          reit={selectedReit}
          inputSummary={result.inputSummary}
          onClose={() => setSelectedReit(null)}
        />
      )}
    </View>
  );
}

// 상세 모달 컴포넌트
function DetailModal({
  visible,
  reit,
  inputSummary,
  onClose,
}: {
  visible: boolean;
  reit: ReitRanking;
  inputSummary: any;
  onClose: () => void;
}) {
  const formatMoney = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '0';
    return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
  };

  const formatPercent = (value: number | null | undefined, decimals: number = 1): string => {
    if (value === null || value === undefined) return '0.0';
    return value.toFixed(decimals);
  };

  const isPositive = reit.profit >= 0;
  const isDividendReinvested = reit.summary.dividendReinvestment.count > 0;
  const originalShares = reit.summary.initialPurchase.shares + reit.summary.recurringPurchase.shares;
  const dividendShares = reit.summary.dividendReinvestment.shares;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        {/* 모달 헤더 */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{reit.productName}</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={[{ key: 'content' }]}
          renderItem={() => (
            <View style={styles.modalContent}>
              {/* 투자 설정 정보 */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>투자 설정 정보</Text>
                <View style={styles.periodDivider} />
                <View style={styles.periodRow}>
                  <Text style={styles.periodLabel}>초기 투자금</Text>
                  <Text style={styles.periodValue}>
                    {formatMoney(reit.summary.initialPurchase.amount)}원
                  </Text>
                </View>
                {reit.summary.recurringPurchase.amount > 0 && (
                  <View style={styles.periodRow}>
                    <Text style={styles.periodLabel}>정기 투자금</Text>
                    <Text style={styles.periodValue}>
                      {formatMoney(reit.summary.recurringPurchase.amount)}원
                    </Text>
                  </View>
                )}
                <View style={styles.periodDivider} />
                <View style={styles.periodRow}>
                  <Text style={styles.investmentTotalLabel}>총 투자금</Text>
                  <Text style={styles.investmentTotalValue}>
                    {formatMoney(reit.totalInvestment)}원
                  </Text>
                </View>
              </View>

              <View style={styles.sectionDivider} />

              {/* 시뮬레이션 결과 */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>시뮬레이션 결과</Text>
                <View style={styles.periodDivider} />
                {!isDividendReinvested && reit.summary.dividends.count > 0 ? (
                  <>
                    <View style={styles.periodRow}>
                      <Text style={styles.periodLabel}>리츠 평가액</Text>
                      <Text style={styles.periodValue}>
                        {formatMoney(reit.summary.currentPrice * reit.summary.totalShares)}원
                      </Text>
                    </View>
                    <View style={styles.periodRow}>
                      <Text style={styles.periodLabel}>현금 배당금</Text>
                      <Text style={[styles.periodValue, styles.dividendValue]}>
                        +{formatMoney(reit.summary.dividends.totalAmount)}원
                      </Text>
                    </View>
                    <View style={styles.periodRow}>
                      <Text style={styles.periodLabel}>합계</Text>
                      <Text style={styles.periodValue}>
                        {formatMoney(reit.finalValue)}원
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.periodRow}>
                    <Text style={styles.periodLabel}>최종 가치</Text>
                    <Text style={styles.periodValue}>
                      {formatMoney(reit.finalValue)}원
                    </Text>
                  </View>
                )}
                <View style={styles.periodDivider} />
                <View style={styles.periodRow}>
                  <Text style={styles.investmentTotalLabel}>수익</Text>
                  <Text
                    style={[
                      styles.investmentTotalValue,
                      isPositive ? styles.profitPositive : styles.profitNegative,
                    ]}
                  >
                    {isPositive ? '+' : ''}{formatMoney(reit.profit)}원 ({isPositive ? '+' : ''}{formatPercent(reit.returnRate, 1)}%)
                  </Text>
                </View>
              </View>

              <View style={styles.sectionDivider} />

              {/* 투자 결과 상세 */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>투자 결과 상세</Text>

                {/* 보유 리츠 */}
                <View style={styles.subSection}>
                  <Text style={styles.subSectionTitle}>보유 리츠</Text>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>원금으로 매수한 리츠</Text>
                    <Text style={styles.detailValue}>{formatMoney(originalShares)}주</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>배당금으로 매수한 리츠</Text>
                    <Text style={styles.detailValue}>{formatMoney(dividendShares)}주</Text>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, styles.detailLabelBold]}>총 보유 리츠</Text>
                    <Text style={[styles.detailValue, styles.detailValueBold]}>
                      {formatMoney(reit.summary.totalShares)}주
                    </Text>
                  </View>
                </View>

                {/* 리츠 가격 */}
                <View style={styles.subSection}>
                  <Text style={styles.subSectionTitle}>리츠 가격</Text>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>평균 매수가</Text>
                    <Text style={styles.detailValue}>{formatMoney(reit.summary.averagePurchasePrice)}원</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>종료일 가격</Text>
                    <Text style={[styles.detailValue, styles.detailValueBold]}>
                      {formatMoney(reit.summary.currentPrice)}원
                    </Text>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>한 주당 가격 변동</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        reit.summary.currentPrice >= reit.summary.averagePurchasePrice
                          ? styles.profitPositive
                          : styles.profitNegative,
                      ]}
                    >
                      {reit.summary.currentPrice >= reit.summary.averagePurchasePrice ? '+' : ''}
                      {formatMoney(reit.summary.currentPrice - reit.summary.averagePurchasePrice)}원
                    </Text>
                  </View>
                </View>

                {/* 배당금 */}
                {reit.summary.dividends.count > 0 && (
                  <View style={styles.subSection}>
                    <Text style={styles.subSectionTitle}>
                      {isDividendReinvested ? '배당금 (모두 재투자됨)' : '배당금'}
                    </Text>
                    {isDividendReinvested ? (
                      <>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>받은 총 배당금</Text>
                          <Text style={[styles.detailValue, styles.dividendValue]}>
                            {formatMoney(reit.summary.dividends.totalAmount)}원
                          </Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>→ 재투자로 매수한 리츠</Text>
                          <Text style={styles.detailValue}>{formatMoney(dividendShares)}주</Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>통장에 들어온 돈</Text>
                        <Text style={[styles.detailValue, styles.dividendValue]}>
                          {formatMoney(reit.summary.dividends.totalAmount)}원
                        </Text>
                      </View>
                    )}
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>배당 받은 횟수</Text>
                      <Text style={styles.detailValue}>{reit.summary.dividends.count}회</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>평균 배당률</Text>
                      <Text style={styles.detailValue}>
                        연 {formatPercent(reit.summary.dividends.avgYield, 1)}%
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* 투자하러가기 버튼 */}
              <TouchableOpacity
                style={styles.investButton}
                onPress={() => {
                  onClose();
                  router.push(`/investment/product-detail?productId=${reit.productCode}`);
                }}
              >
                <Text style={styles.investButtonText}>하나원큐리츠 투자하러가기</Text>
                <MaterialIcons name="arrow-forward" size={20} color={Colors.light.background} />
              </TouchableOpacity>
            </View>
          )}
          keyExtractor={(item) => item.key}
        />
      </View>
    </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 24,
    marginTop: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionCard: {
    backgroundColor: Colors.light.surface,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  sectionGap: {
    height: 20,
  },
  periodDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 8,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  periodLabel: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: '500',
  },
  periodValue: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: '600',
  },
  periodDuration: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 4,
  },
  investmentTotalLabel: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '700',
  },
  investmentTotalValue: {
    fontSize: 16,
    color: Colors.light.primary,
    fontWeight: '700',
  },
  bestReitCard: {
    backgroundColor: `${Colors.light.primary}10`,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    alignItems: 'center',
  },
  bestReitLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  bestReitName: {
    fontSize: 15,
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  bestReitResult: {
    gap: 4,
    alignItems: 'center',
  },
  bestReitValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.primary,
    textAlign: 'center',
  },
  bestReitProfit: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  statisticsCard: {
    backgroundColor: Colors.light.surface,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.light.border,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  statValuePositive: {
    color: Colors.light.error,
  },
  rankingSectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  rankingSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  rankingSectionSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  rankColumn: {
    width: 48,
    alignItems: 'center',
  },
  rankIcon: {
    fontSize: 24,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  infoColumn: {
    flex: 1,
    marginLeft: 12,
  },
  reitName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  reitType: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  resultColumn: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  finalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },
  profit: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  profitPositive: {
    color: Colors.light.error,
  },
  profitNegative: {
    color: Colors.light.info,
  },
  returnRate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  // 모달 스타일
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 20,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  modalContent: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  resultSummaryCard: {
    backgroundColor: Colors.light.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  resultValueLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  resultArrow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resultArrowText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  resultDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 12,
  },
  resultProfit: {
    fontSize: 18,
    fontWeight: '700',
  },
  messageCard: {
    backgroundColor: `${Colors.light.primary}10`,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  messageCardNegative: {
    backgroundColor: `${Colors.light.info}10`,
  },
  messageIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
  },
  detailSection: {
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  detailLabelBold: {
    fontWeight: '600',
    color: Colors.light.text,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  detailValueBold: {
    fontSize: 16,
    fontWeight: '700',
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 8,
  },
  detailHint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    marginTop: -4,
    marginBottom: 8,
  },
  dividendValue: {
    color: '#059669',
    fontWeight: '700',
  },
  riskValue: {
    color: Colors.light.info,
    fontWeight: '700',
  },
  // 새로운 Before & After 스타일
  periodCard: {
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
  },
  sectionDivider: {
    height: 2,
    backgroundColor: Colors.light.border,
    marginVertical: 20,
  },
  beforeAfterSection: {
    marginBottom: 20,
  },
  beforeAfterLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
  },
  beforeAfterContent: {
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderRadius: 12,
  },
  beforeAfterText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  afterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  afterItemLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  afterItemLabelBold: {
    fontWeight: '700',
    color: Colors.light.text,
  },
  afterItemValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  afterItemValueLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  afterDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 12,
  },
  profitLabel: {
    fontWeight: '700',
    fontSize: 15,
  },
  profitValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  subSection: {
    marginBottom: 20,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  investButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  investButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.background,
  },
  // 1등 카드 스타일
  firstPlaceCard: {
    backgroundColor: `${Colors.light.primary}10`,
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    marginBottom: 12,
    minHeight: 140,
  },
  firstPlaceRank: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.primary,
    marginBottom: 8,
  },
  firstPlaceName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
  },
  firstPlaceResults: {
    gap: 6,
  },
  firstPlaceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  firstPlaceProfit: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.light.text,
  },
  // 2등 카드 스타일
  secondPlaceCard: {
    backgroundColor: `${Colors.light.primary}08`,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: `${Colors.light.primary}80`,
    marginBottom: 12,
    minHeight: 100,
  },
  placeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  secondPlaceRank: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  secondPlaceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  secondPlaceProfit: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  // 3등 카드 스타일
  thirdPlaceCard: {
    backgroundColor: `${Colors.light.primary}05`,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.light.primary}60`,
    marginBottom: 4,
    minHeight: 80,
  },
  thirdPlaceRank: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  thirdPlaceName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  thirdPlaceProfit: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
});
