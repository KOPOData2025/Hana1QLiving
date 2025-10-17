package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FinancialResponse {

    private boolean success;
    private String message;
    private Object data;

    // 성공 응답 생성
    public static FinancialResponse success(Object data) {
        return FinancialResponse.builder()
                .success(true)
                .message("성공")
                .data(data)
                .build();
    }

    public static FinancialResponse success(String message, Object data) {
        return FinancialResponse.builder()
                .success(true)
                .message(message)
                .data(data)
                .build();
    }

    // 실패 응답 생성
    public static FinancialResponse error(String message) {
        return FinancialResponse.builder()
                .success(false)
                .message(message)
                .data(null)
                .build();
    }

    // 재무 대시보드 통계
    @Data
    @Builder
    public static class FinancialDashboard {
        private BigDecimal totalRevenue;      // 총 수익
        private BigDecimal totalExpense;      // 총 지출
        private BigDecimal netProfit;         // 순이익 (수익 - 지출)
        private Double profitMargin;          // 수익률 (순이익 / 총수익 * 100)

        private Long totalRevenueCount;       // 총 수익 건수
        private Long totalExpenseCount;       // 총 지출 건수

        private List<MonthlySummary> monthlyData;    // 월별 손익 데이터
        private List<CategorySummary> revenueByCategory; // 수익 카테고리별
        private List<CategorySummary> expenseByCategory; // 지출 카테고리별
        private List<BuildingSummary> buildingData;      // 건물별 데이터
    }

    // 월별 손익 요약
    @Data
    @Builder
    public static class MonthlySummary {
        private String month;           // 월 (YYYY-MM)
        private BigDecimal revenue;     // 월별 수익
        private BigDecimal expense;     // 월별 지출
        private BigDecimal profit;      // 월별 순이익
        private Long revenueCount;      // 수익 건수
        private Long expenseCount;      // 지출 건수
    }

    // 카테고리별 요약
    @Data
    @Builder
    public static class CategorySummary {
        private String category;        // 카테고리명
        private BigDecimal amount;      // 금액
        private Long count;            // 건수
        private Double percentage;     // 비율
    }

    // 건물별 요약
    @Data
    @Builder
    public static class BuildingSummary {
        private Long buildingId;        // 건물 ID
        private String buildingName;    // 건물명
        private BigDecimal revenue;     // 건물별 수익
        private BigDecimal expense;     // 건물별 지출
        private BigDecimal profit;      // 건물별 순이익
        private Long revenueCount;      // 수익 건수
        private Long expenseCount;      // 지출 건수
    }

    // 간단한 요약 통계
    @Data
    @Builder
    public static class FinancialSummary {
        private BigDecimal totalRevenue;      // 총 수익
        private BigDecimal totalExpense;      // 총 지출
        private BigDecimal netProfit;         // 순이익
        private Double profitMargin;          // 수익률
    }
}