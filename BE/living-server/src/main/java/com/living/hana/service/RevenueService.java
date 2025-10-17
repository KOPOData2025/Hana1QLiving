package com.living.hana.service;

import com.living.hana.dto.RevenueResponse;
import com.living.hana.entity.Payment;
import com.living.hana.mapper.RevenueMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RevenueService {

    private final RevenueMapper revenueMapper;

    /**
     * 수익 목록 조회 (전체)
     */
    public List<Payment> getAllRevenues() {
        return revenueMapper.findAllRevenues();
    }

    /**
     * 수익 목록 조회 (건물별)
     */
    public List<Payment> getRevenuesByBuilding(Long buildingId) {
        return revenueMapper.findRevenuesByBuildingId(buildingId);
    }

    /**
     * 수익 목록 조회 (카테고리별)
     */
    public List<Payment> getRevenuesByCategory(String category) {
        return revenueMapper.findRevenuesByCategory(category);
    }

    /**
     * 수익 목록 조회 (기간별)
     */
    public List<Payment> getRevenuesByDateRange(String startDate, String endDate) {
        return revenueMapper.findRevenuesByDateRange(startDate, endDate);
    }

    /**
     * 수익 목록 조회 (복합 조건)
     */
    public List<Payment> getRevenuesByConditions(Long buildingId, String category, String startDate, String endDate) {
        return revenueMapper.findRevenuesByConditions(buildingId, category, startDate, endDate);
    }

    /**
     * 수익 통계 조회
     */
    public RevenueResponse.RevenueStatistics getRevenueStatistics(Long buildingId, String startDate, String endDate) {
        log.info("수익 통계 조회: buildingId={}, {} ~ {}", buildingId, startDate, endDate);

        try {
            // 총 금액 및 건수
            BigDecimal totalAmount;
            long totalCount;

            if (buildingId != null) {
                if (startDate != null && endDate != null) {
                    totalAmount = revenueMapper.getTotalRevenueAmountByBuildingIdAndDateRange(buildingId, startDate, endDate);
                    // 건물+기간별 count는 조건 조회로 처리
                    totalCount = revenueMapper.findRevenuesByBuildingIdAndDateRange(buildingId, startDate, endDate).size();
                } else {
                    totalAmount = revenueMapper.getTotalRevenueAmountByBuildingId(buildingId);
                    totalCount = revenueMapper.countRevenuesByBuildingId(buildingId);
                }
            } else {
                if (startDate != null && endDate != null) {
                    totalAmount = revenueMapper.getTotalRevenueAmountByDateRange(startDate, endDate);
                    totalCount = revenueMapper.findRevenuesByDateRange(startDate, endDate).size();
                } else {
                    totalAmount = revenueMapper.getTotalRevenueAmount();
                    totalCount = revenueMapper.countAllRevenues();
                }
            }

            // 카테고리별 통계
            var categories = revenueMapper.getRevenueCategorySummary(buildingId, startDate, endDate);

            // 비율 계산
            if (totalAmount.compareTo(BigDecimal.ZERO) > 0) {
                categories.forEach(category -> {
                    double percentage = category.getAmount()
                            .divide(totalAmount, 4, RoundingMode.HALF_UP)
                            .multiply(BigDecimal.valueOf(100))
                            .doubleValue();
                    category.setPercentage(percentage);
                });
            }

            // 월별 통계
            var monthly = revenueMapper.getRevenueMonthlySummary(buildingId, startDate, endDate);

            // 건물별 통계 (전체 조회시에만)
            var buildings = (buildingId == null) ?
                    revenueMapper.getRevenueBuildingSummary(startDate, endDate) : null;

            // 건물별 통계 비율 계산
            if (buildings != null && totalAmount.compareTo(BigDecimal.ZERO) > 0) {
                buildings.forEach(building -> {
                    double percentage = building.getAmount()
                            .divide(totalAmount, 4, RoundingMode.HALF_UP)
                            .multiply(BigDecimal.valueOf(100))
                            .doubleValue();
                    building.setPercentage(percentage);
                });
            }

            return RevenueResponse.RevenueStatistics.builder()
                    .totalAmount(totalAmount)
                    .totalCount(totalCount)
                    .categories(categories)
                    .monthly(monthly)
                    .buildings(buildings)
                    .build();

        } catch (Exception e) {
            log.error("수익 통계 조회 실패: error={}", e.getMessage(), e);
            throw new RuntimeException("수익 통계 조회에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 총 수익 금액 조회
     */
    public BigDecimal getTotalRevenueAmount() {
        return revenueMapper.getTotalRevenueAmount();
    }

    /**
     * 건물별 총 수익 금액 조회
     */
    public BigDecimal getTotalRevenueAmountByBuilding(Long buildingId) {
        return revenueMapper.getTotalRevenueAmountByBuildingId(buildingId);
    }

    /**
     * 기간별 총 수익 금액 조회
     */
    public BigDecimal getTotalRevenueAmountByDateRange(String startDate, String endDate) {
        return revenueMapper.getTotalRevenueAmountByDateRange(startDate, endDate);
    }

    /**
     * 전체 수익 건수
     */
    public long getTotalRevenueCount() {
        return revenueMapper.countAllRevenues();
    }

    /**
     * 건물별 수익 건수
     */
    public long getRevenueCountByBuilding(Long buildingId) {
        return revenueMapper.countRevenuesByBuildingId(buildingId);
    }

    /**
     * 카테고리별 수익 건수
     */
    public long getRevenueCountByCategory(String category) {
        return revenueMapper.countRevenuesByCategory(category);
    }

    /**
     * 월세 수익 조회
     */
    public List<Payment> getRentRevenues(Long buildingId, String startDate, String endDate) {
        if (buildingId != null && startDate != null && endDate != null) {
            return revenueMapper.findRevenuesByConditions(buildingId, "RENT", startDate, endDate);
        } else if (buildingId != null) {
            return revenueMapper.findRevenuesByConditions(buildingId, "RENT", null, null);
        } else if (startDate != null && endDate != null) {
            return revenueMapper.findRevenuesByCategoryAndDateRange("RENT", startDate, endDate);
        } else {
            return revenueMapper.findRevenuesByCategory("RENT");
        }
    }

    /**
     * 관리비 수익 조회
     */
    public List<Payment> getManagementFeeRevenues(Long buildingId, String startDate, String endDate) {
        if (buildingId != null && startDate != null && endDate != null) {
            return revenueMapper.findRevenuesByConditions(buildingId, "MANAGEMENT_FEE", startDate, endDate);
        } else if (buildingId != null) {
            return revenueMapper.findRevenuesByConditions(buildingId, "MANAGEMENT_FEE", null, null);
        } else if (startDate != null && endDate != null) {
            return revenueMapper.findRevenuesByCategoryAndDateRange("MANAGEMENT_FEE", startDate, endDate);
        } else {
            return revenueMapper.findRevenuesByCategory("MANAGEMENT_FEE");
        }
    }
}