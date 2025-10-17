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
public class RevenueResponse {

    private boolean success;
    private String message;
    private Object data;

    // 성공 응답 생성
    public static RevenueResponse success(Object data) {
        return RevenueResponse.builder()
                .success(true)
                .message("성공")
                .data(data)
                .build();
    }

    public static RevenueResponse success(String message, Object data) {
        return RevenueResponse.builder()
                .success(true)
                .message(message)
                .data(data)
                .build();
    }

    // 실패 응답 생성
    public static RevenueResponse error(String message) {
        return RevenueResponse.builder()
                .success(false)
                .message(message)
                .data(null)
                .build();
    }

    // 수익 통계 응답용 내부 클래스
    @Data
    @Builder
    public static class RevenueStatistics {
        private BigDecimal totalAmount;           // 총 수익 금액
        private Long totalCount;                  // 총 수익 건수
        private List<CategorySummary> categories; // 카테고리별 통계
        private List<MonthlySummary> monthly;     // 월별 통계
        private List<BuildingSummary> buildings;  // 건물별 통계
    }

    @Data
    @Builder
    public static class CategorySummary {
        private String category;      // 카테고리 (RENT, MANAGEMENT_FEE)
        private BigDecimal amount;    // 금액
        private Long count;          // 건수
        private Double percentage;   // 비율
    }

    @Data
    @Builder
    public static class MonthlySummary {
        private String month;        // 월 (YYYY-MM)
        private BigDecimal amount;   // 금액
        private Long count;         // 건수
    }

    @Data
    @Builder
    public static class BuildingSummary {
        private Long buildingId;     // 건물 ID
        private String buildingName; // 건물명
        private BigDecimal amount;   // 금액
        private Long count;         // 건수
        private Double percentage;  // 비율
    }
}