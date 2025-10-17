package com.living.hana.mapper;

import com.living.hana.entity.Payment;
import com.living.hana.dto.RevenueResponse.CategorySummary;
import com.living.hana.dto.RevenueResponse.MonthlySummary;
import com.living.hana.dto.RevenueResponse.BuildingSummary;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;
import java.util.List;

@Mapper
public interface RevenueMapper {

    // 수익 목록 조회 (전체)
    List<Payment> findAllRevenues();

    // 수익 목록 조회 (건물별)
    List<Payment> findRevenuesByBuildingId(Long buildingId);

    // 수익 목록 조회 (카테고리별)
    List<Payment> findRevenuesByCategory(String paymentCategory);

    // 수익 목록 조회 (기간별)
    List<Payment> findRevenuesByDateRange(@Param("startDate") String startDate,
                                          @Param("endDate") String endDate);

    // 수익 목록 조회 (건물 + 기간)
    List<Payment> findRevenuesByBuildingIdAndDateRange(@Param("buildingId") Long buildingId,
                                                       @Param("startDate") String startDate,
                                                       @Param("endDate") String endDate);

    // 수익 목록 조회 (카테고리 + 기간)
    List<Payment> findRevenuesByCategoryAndDateRange(@Param("category") String paymentCategory,
                                                     @Param("startDate") String startDate,
                                                     @Param("endDate") String endDate);

    // 수익 목록 조회 (복합 조건)
    List<Payment> findRevenuesByConditions(@Param("buildingId") Long buildingId,
                                           @Param("category") String paymentCategory,
                                           @Param("startDate") String startDate,
                                           @Param("endDate") String endDate);

    // 수익 개수 조회
    long countAllRevenues();

    // 건물별 수익 개수
    long countRevenuesByBuildingId(Long buildingId);

    // 카테고리별 수익 개수
    long countRevenuesByCategory(String paymentCategory);

    // 총 수익 금액
    BigDecimal getTotalRevenueAmount();

    // 건물별 총 수익 금액
    BigDecimal getTotalRevenueAmountByBuildingId(Long buildingId);

    // 기간별 총 수익 금액
    BigDecimal getTotalRevenueAmountByDateRange(@Param("startDate") String startDate,
                                                @Param("endDate") String endDate);

    // 건물+기간별 총 수익 금액
    BigDecimal getTotalRevenueAmountByBuildingIdAndDateRange(@Param("buildingId") Long buildingId,
                                                             @Param("startDate") String startDate,
                                                             @Param("endDate") String endDate);

    // 카테고리별 수익 통계
    List<CategorySummary> getRevenueCategorySummary(@Param("buildingId") Long buildingId,
                                                    @Param("startDate") String startDate,
                                                    @Param("endDate") String endDate);

    // 월별 수익 통계
    List<MonthlySummary> getRevenueMonthlySummary(@Param("buildingId") Long buildingId,
                                                  @Param("startDate") String startDate,
                                                  @Param("endDate") String endDate);

    // 건물별 수익 통계
    List<BuildingSummary> getRevenueBuildingSummary(@Param("startDate") String startDate,
                                                    @Param("endDate") String endDate);
}