import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { buildingAPI, financialAPI, unitAPI } from '@/services/api';

const { width } = Dimensions.get('window');

export default function BuildingAnalysisScreen() {
  const { buildingId } = useLocalSearchParams<{ buildingId: string }>();

  const [building, setBuilding] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [financialData, setFinancialData] = useState<any>(null);
  const [occupancyData, setOccupancyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (buildingId) {
      loadAllData();
    }
  }, [buildingId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const buildingIdNum = parseInt(buildingId);

      const [buildingRes, monthlyRes, financialRes, unitsRes] = await Promise.all([
        buildingAPI.getBuildingDetail(buildingId).catch(() => null),
        financialAPI.getMonthlyTrend(buildingIdNum).catch(() => null),
        financialAPI.getFinancialDashboard(buildingIdNum).catch(() => null),
        unitAPI.getUnitsByBuilding(buildingIdNum).catch(() => null),
      ]);

      // 건물 정보
      setBuilding(buildingRes?.data?.data || null);

      // 월별 데이터
      const monthly = monthlyRes?.data?.data || [];
      setMonthlyData(Array.isArray(monthly) ? monthly : []);

      // 재무 데이터
      setFinancialData(financialRes?.data?.data || null);

      // 입주율 계산
      const units = unitsRes?.data?.data || [];
      const totalUnits = units.length;
      const occupiedUnits = units.filter((unit: any) =>
        unit.status === 'OCCUPIED' || unit.status === 'occupied'
      ).length;
      const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

      setOccupancyData({
        totalUnits,
        occupiedUnits,
        occupancyRate,
      });
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    if (!amount) return '0';
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatCurrencyShort = (amount: number | undefined | null): string => {
    if (!amount) return '0만';
    const man = Math.round(amount / 10000);
    return new Intl.NumberFormat('ko-KR').format(man) + '만';
  };

  const renderMonthlyChart = () => {
    if (!monthlyData || monthlyData.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>월별 데이터가 없습니다</Text>
        </View>
      );
    }

    // 최근 6개월 데이터만 표시
    const recentData = monthlyData.slice(-6);
    const maxRevenue = Math.max(...recentData.map((d: any) => d.revenue || 0));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>월별 수익 추이 (최근 6개월)</Text>
        <View style={styles.chartBars}>
          {recentData.map((data: any, index: number) => {
            const height = maxRevenue > 0 ? (data.revenue / maxRevenue) * 120 : 0;
            return (
              <View key={index} style={styles.barContainer}>
                <Text style={styles.barValue} numberOfLines={1}>
                  {formatCurrencyShort(data.revenue)}
                </Text>
                <View style={[styles.bar, { height }]} />
                <Text style={styles.barLabel}>{data.month || `${index + 1}월`}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>데이터 로딩 중...</Text>
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
        <Text style={styles.headerTitle}>오피스텔 분석</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* 건물 정보 */}
        {building && (
          <View style={styles.buildingInfoCard}>
            {building.imageUrls && building.imageUrls.length > 0 && (
              <Image
                source={{ uri: building.imageUrls[0] }}
                style={styles.buildingImage}
                resizeMode="cover"
              />
            )}
            <Text style={styles.buildingName}>{building.name}</Text>
            <Text style={styles.buildingAddress}>{building.address}</Text>
          </View>
        )}

        {/* 현재 운영 지표 */}
        <View style={styles.metricsCard}>
          <Text style={styles.sectionTitle}>현재 운영 지표</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <MaterialIcons name="home" size={32} color={Colors.light.primary} />
              <Text style={styles.metricValue}>
                {occupancyData?.occupancyRate.toFixed(1)}%
              </Text>
              <Text style={styles.metricLabel}>입주율</Text>
            </View>

            <View style={styles.metricItem}>
              <MaterialIcons name="apartment" size={32} color={Colors.light.primary} />
              <Text style={styles.metricValue}>{occupancyData?.totalUnits || 0}</Text>
              <Text style={styles.metricLabel}>총 세대</Text>
            </View>

            <View style={styles.metricItem}>
              <MaterialIcons name="attach-money" size={32} color={Colors.light.primary} />
              <Text style={styles.metricValue}>
                {formatCurrency(financialData?.totalRevenue)}원
              </Text>
              <Text style={styles.metricLabel}>월 수익</Text>
            </View>
          </View>
        </View>

        {/* 월별 수익 차트 */}
        <View style={styles.chartCard}>
          {renderMonthlyChart()}
        </View>

        {/* 재무 성과 */}
        {financialData && (
          <View style={styles.financialCard}>
            <Text style={styles.sectionTitle}>재무 성과</Text>
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>총 수익</Text>
              <Text style={styles.financialValue}>
                {formatCurrency(financialData.totalRevenue)}원
              </Text>
            </View>
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>총 비용</Text>
              <Text style={styles.financialValue}>
                {formatCurrency(financialData.totalExpense)}원
              </Text>
            </View>
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>순이익</Text>
              <Text style={[
                styles.financialValue,
                financialData.netProfit >= 0 ? styles.profitPositive : styles.profitNegative
              ]}>
                {formatCurrency(financialData.netProfit)}원
              </Text>
            </View>
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>수익률</Text>
              <Text style={[
                styles.financialValue,
                financialData.profitMargin >= 0 ? styles.profitPositive : styles.profitNegative
              ]}>
                {financialData.profitMargin.toFixed(2)}%
              </Text>
            </View>
          </View>
        )}

        {/* 입주 현황 */}
        {occupancyData && (
          <View style={styles.occupancyCard}>
            <Text style={styles.sectionTitle}>입주 현황</Text>
            <View style={styles.occupancyBar}>
              <View
                style={[
                  styles.occupancyFilled,
                  { width: `${occupancyData.occupancyRate}%` }
                ]}
              />
            </View>
            <View style={styles.occupancyStats}>
              <Text style={styles.occupancyStat}>
                입주: {occupancyData.occupiedUnits}실
              </Text>
              <Text style={styles.occupancyStat}>
                공실: {occupancyData.totalUnits - occupancyData.occupiedUnits}실
              </Text>
            </View>
          </View>
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
    marginTop: 12,
    fontSize: 14,
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
  content: {
    flex: 1,
    padding: 20,
  },
  buildingInfoCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buildingImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: Colors.light.border,
  },
  buildingName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
  },
  buildingAddress: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  metricsCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartContainer: {
    width: '100%',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 160,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  bar: {
    width: 30,
    backgroundColor: Colors.light.primary,
    borderRadius: 4,
    minHeight: 10,
  },
  barLabel: {
    fontSize: 11,
    color: Colors.light.text,
    marginTop: 8,
  },
  noDataContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  financialCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  financialLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  financialValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  profitPositive: {
    color: '#FF4444',
  },
  profitNegative: {
    color: '#0066CC',
  },
  occupancyCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  occupancyBar: {
    height: 24,
    backgroundColor: Colors.light.border,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  occupancyFilled: {
    height: '100%',
    backgroundColor: Colors.light.primary,
  },
  occupancyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  occupancyStat: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
});
