package com.living.hana.service;

import com.living.hana.dto.FinancialResponse;
import com.living.hana.dto.RevenueResponse;
import com.living.hana.dto.ExpenseResponse;
import com.living.hana.entity.Building;
import com.living.hana.mapper.BuildingMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FinancialService {

    private final RevenueService revenueService;
    private final ExpenseService expenseService;
    private final BuildingMapper buildingMapper;

    /**
     * 통합 재무 대시보드 데이터 조회
     */
    public FinancialResponse.FinancialDashboard getFinancialDashboard(Long buildingId, String startDate, String endDate) {
        log.info("재무 대시보드 조회: buildingId={}, startDate={}, endDate={}",
            buildingId != null ? buildingId : "전체",
            startDate != null ? startDate : "전체기간",
            endDate != null ? endDate : "전체기간");

        try {
            // 수익 및 지출 통계 조회
            var revenueStats = revenueService.getRevenueStatistics(buildingId, startDate, endDate);
            var expenseStats = expenseService.getExpenseStatistics(buildingId, startDate, endDate);

            // 기본 계산
            BigDecimal totalRevenue = revenueStats.getTotalAmount();
            BigDecimal totalExpense = expenseStats.getTotalAmount();
            BigDecimal netProfit = totalRevenue.subtract(totalExpense);

            // 수익률 계산 (순이익 / 총수익 * 100)
            Double profitMargin = totalRevenue.compareTo(BigDecimal.ZERO) > 0 ?
                    netProfit.divide(totalRevenue, 4, RoundingMode.HALF_UP)
                            .multiply(BigDecimal.valueOf(100)).doubleValue() : 0.0;

            // 월별 데이터 생성
            List<FinancialResponse.MonthlySummary> monthlyData = generateMonthlySummary(
                    revenueStats.getMonthly(), expenseStats.getMonthly());

            // 건물별 데이터 생성 (전체 조회시에만)
            List<FinancialResponse.BuildingSummary> buildingData = null;
            if (buildingId == null) {
                buildingData = generateBuildingSummary(startDate, endDate);
            }

            // 카테고리별 데이터 변환
            List<FinancialResponse.CategorySummary> revenueByCategory =
                    convertToCategorySummary(revenueStats.getCategories());
            List<FinancialResponse.CategorySummary> expenseByCategory =
                    convertToCategorySummary(expenseStats.getCategories());

            return FinancialResponse.FinancialDashboard.builder()
                    .totalRevenue(totalRevenue)
                    .totalExpense(totalExpense)
                    .netProfit(netProfit)
                    .profitMargin(profitMargin)
                    .totalRevenueCount(revenueStats.getTotalCount())
                    .totalExpenseCount(expenseStats.getTotalCount())
                    .monthlyData(monthlyData)
                    .revenueByCategory(revenueByCategory)
                    .expenseByCategory(expenseByCategory)
                    .buildingData(buildingData)
                    .build();

        } catch (Exception e) {
            log.error("재무 대시보드 조회 실패: error={}", e.getMessage(), e);
            throw new RuntimeException("재무 대시보드 조회에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 간단한 재무 요약 정보 조회
     */
    public FinancialResponse.FinancialSummary getFinancialSummary(Long buildingId, String startDate, String endDate) {
        log.info("재무 요약 조회: buildingId={}, {} ~ {}", buildingId, startDate, endDate);

        try {
            // 수익 및 지출 총액 조회
            BigDecimal totalRevenue;
            BigDecimal totalExpense;

            if (buildingId != null) {
                totalRevenue = revenueService.getTotalRevenueAmountByBuilding(buildingId);
                totalExpense = expenseService.getExpenseStatistics(buildingId, startDate, endDate).getTotalAmount();
            } else if (startDate != null && endDate != null) {
                totalRevenue = revenueService.getTotalRevenueAmountByDateRange(startDate, endDate);
                totalExpense = expenseService.getExpenseStatistics(null, startDate, endDate).getTotalAmount();
            } else {
                totalRevenue = revenueService.getTotalRevenueAmount();
                totalExpense = expenseService.getExpenseStatistics(null, null, null).getTotalAmount();
            }

            BigDecimal netProfit = totalRevenue.subtract(totalExpense);
            Double profitMargin = totalRevenue.compareTo(BigDecimal.ZERO) > 0 ?
                    netProfit.divide(totalRevenue, 4, RoundingMode.HALF_UP)
                            .multiply(BigDecimal.valueOf(100)).doubleValue() : 0.0;

            return FinancialResponse.FinancialSummary.builder()
                    .totalRevenue(totalRevenue)
                    .totalExpense(totalExpense)
                    .netProfit(netProfit)
                    .profitMargin(profitMargin)
                    .build();

        } catch (Exception e) {
            log.error("재무 요약 조회 실패: error={}", e.getMessage(), e);
            throw new RuntimeException("재무 요약 조회에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 월별 손익 요약 생성
     */
    private List<FinancialResponse.MonthlySummary> generateMonthlySummary(
            List<RevenueResponse.MonthlySummary> revenueMonthly,
            List<ExpenseResponse.MonthlySummary> expenseMonthly) {

        // 월별 데이터를 Map으로 변환
        Map<String, BigDecimal> revenueMap = revenueMonthly.stream()
                .collect(Collectors.toMap(
                        RevenueResponse.MonthlySummary::getMonth,
                        RevenueResponse.MonthlySummary::getAmount));

        Map<String, Long> revenueCountMap = revenueMonthly.stream()
                .collect(Collectors.toMap(
                        RevenueResponse.MonthlySummary::getMonth,
                        RevenueResponse.MonthlySummary::getCount));

        Map<String, BigDecimal> expenseMap = expenseMonthly.stream()
                .collect(Collectors.toMap(
                        ExpenseResponse.MonthlySummary::getMonth,
                        ExpenseResponse.MonthlySummary::getAmount));

        Map<String, Long> expenseCountMap = expenseMonthly.stream()
                .collect(Collectors.toMap(
                        ExpenseResponse.MonthlySummary::getMonth,
                        ExpenseResponse.MonthlySummary::getCount));

        // 전체 월 목록 생성 (수익과 지출 모두 포함)
        Set<String> allMonths = new HashSet<>();
        allMonths.addAll(revenueMap.keySet());
        allMonths.addAll(expenseMap.keySet());

        return allMonths.stream()
                .sorted(Collections.reverseOrder()) // 최신 월부터
                .map(month -> {
                    BigDecimal revenue = revenueMap.getOrDefault(month, BigDecimal.ZERO);
                    BigDecimal expense = expenseMap.getOrDefault(month, BigDecimal.ZERO);
                    BigDecimal profit = revenue.subtract(expense);

                    return FinancialResponse.MonthlySummary.builder()
                            .month(month)
                            .revenue(revenue)
                            .expense(expense)
                            .profit(profit)
                            .revenueCount(revenueCountMap.getOrDefault(month, 0L))
                            .expenseCount(expenseCountMap.getOrDefault(month, 0L))
                            .build();
                })
                .collect(Collectors.toList());
    }

    /**
     * 건물별 손익 요약 생성
     */
    private List<FinancialResponse.BuildingSummary> generateBuildingSummary(String startDate, String endDate) {
        try {
            // 전체 건물 목록 조회
            List<Building> buildings = buildingMapper.findAll();

            return buildings.stream()
                    .map(building -> {
                        // 건물별 수익 및 지출 조회
                        var revenueStats = revenueService.getRevenueStatistics(building.getId(), startDate, endDate);
                        var expenseStats = expenseService.getExpenseStatistics(building.getId(), startDate, endDate);

                        BigDecimal revenue = revenueStats.getTotalAmount();
                        BigDecimal expense = expenseStats.getTotalAmount();
                        BigDecimal profit = revenue.subtract(expense);

                        return FinancialResponse.BuildingSummary.builder()
                                .buildingId(building.getId())
                                .buildingName(building.getName())
                                .revenue(revenue)
                                .expense(expense)
                                .profit(profit)
                                .revenueCount(revenueStats.getTotalCount())
                                .expenseCount(expenseStats.getTotalCount())
                                .build();
                    })
                    .sorted((a, b) -> b.getProfit().compareTo(a.getProfit())) // 순이익 순으로 정렬
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("건물별 요약 생성 실패: error={}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    /**
     * 카테고리 요약 변환
     */
    private List<FinancialResponse.CategorySummary> convertToCategorySummary(List<?> categories) {
        if (categories == null) return Collections.emptyList();

        return categories.stream()
                .map(category -> {
                    if (category instanceof RevenueResponse.CategorySummary revCat) {
                        return FinancialResponse.CategorySummary.builder()
                                .category(revCat.getCategory())
                                .amount(revCat.getAmount())
                                .count(revCat.getCount())
                                .percentage(revCat.getPercentage())
                                .build();
                    } else if (category instanceof ExpenseResponse.CategorySummary expCat) {
                        return FinancialResponse.CategorySummary.builder()
                                .category(expCat.getCategory())
                                .amount(expCat.getAmount())
                                .count(expCat.getCount())
                                .percentage(expCat.getPercentage())
                                .build();
                    }
                    return null;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    /**
     * 수익률 분석
     */
    public Map<String, Object> getProfitabilityAnalysis(Long buildingId, String startDate, String endDate) {
        log.info("수익률 분석: buildingId={}, {} ~ {}", buildingId, startDate, endDate);

        try {
            var summary = getFinancialSummary(buildingId, startDate, endDate);

            Map<String, Object> analysis = new HashMap<>();
            analysis.put("profitMargin", summary.getProfitMargin());
            analysis.put("totalRevenue", summary.getTotalRevenue());
            analysis.put("totalExpense", summary.getTotalExpense());
            analysis.put("netProfit", summary.getNetProfit());

            // 수익률 등급 판정
            String profitGrade;
            if (summary.getProfitMargin() >= 20) {
                profitGrade = "EXCELLENT";
            } else if (summary.getProfitMargin() >= 15) {
                profitGrade = "GOOD";
            } else if (summary.getProfitMargin() >= 10) {
                profitGrade = "AVERAGE";
            } else if (summary.getProfitMargin() >= 5) {
                profitGrade = "POOR";
            } else {
                profitGrade = "LOSS";
            }
            analysis.put("profitGrade", profitGrade);

            return analysis;

        } catch (Exception e) {
            log.error("수익률 분석 실패: error={}", e.getMessage(), e);
            throw new RuntimeException("수익률 분석에 실패했습니다: " + e.getMessage());
        }
    }
}