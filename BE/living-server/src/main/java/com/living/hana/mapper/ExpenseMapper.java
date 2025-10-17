package com.living.hana.mapper;

import com.living.hana.entity.Expense;
import com.living.hana.dto.ExpenseResponse.CategorySummary;
import com.living.hana.dto.ExpenseResponse.MonthlySummary;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;
import java.util.List;

@Mapper
public interface ExpenseMapper {

    // 지출 등록
    void insert(Expense expense);

    // 지출 조회 (ID)
    Expense findById(Long id);

    // 지출 목록 조회 (전체)
    List<Expense> findAll();

    // 지출 목록 조회 (건물별)
    List<Expense> findByBuildingId(Long buildingId);

    // 지출 목록 조회 (카테고리별)
    List<Expense> findByCategory(String category);

    // 지출 목록 조회 (복합 조건)
    List<Expense> findByConditions(@Param("buildingId") Long buildingId,
                                   @Param("category") String category,
                                   @Param("startDate") String startDate,
                                   @Param("endDate") String endDate);

    // 지출 수정
    void update(Expense expense);

    // 지출 삭제
    void deleteById(Long id);

    // 지출 개수 조회
    long countAll();

    // 건물별 지출 개수
    long countByBuildingId(Long buildingId);

    // 카테고리별 지출 개수
    long countByCategory(String category);

    // 총 지출 금액
    BigDecimal getTotalAmount();

    // 건물별 총 지출 금액
    BigDecimal getTotalAmountByBuildingId(Long buildingId);


    // 카테고리별 지출 통계
    List<CategorySummary> getCategorySummary(@Param("buildingId") Long buildingId,
                                             @Param("startDate") String startDate,
                                             @Param("endDate") String endDate);

    // 월별 지출 통계
    List<MonthlySummary> getMonthlySummary(@Param("buildingId") Long buildingId,
                                           @Param("startDate") String startDate,
                                           @Param("endDate") String endDate);
}