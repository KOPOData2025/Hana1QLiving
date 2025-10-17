package com.living.hana.dto;

import com.living.hana.entity.ReitDividend;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReitDividendResponse {
    private Long dividendId;          // 배당 ID
    private String productCode;       // REIT 상품 코드
    private Integer dividendYear;     // 배당 연도
    private Integer dividendQuarter;  // 분기
    private String dividendPeriod;    // 배당 기간 (예: "2024년 1분기", "2024년 연배당")
    private BigDecimal dividendRate;  // 배당률 (%)
    private BigDecimal dividendAmount; // 주당 배당금
    private Date recordDate;          // 배당 기준일
    private Date paymentDate;         // 배당 지급일
    private Date announcementDate;    // 배당 발표일
    private Timestamp createdAt;      // 생성일

    // Entity -> DTO 변환
    public static ReitDividendResponse fromEntity(ReitDividend entity) {
        String period = entity.getDividendYear() + "년";
        if (entity.getDividendQuarter() != null) {
            period += " " + entity.getDividendQuarter() + "분기";
        } else {
            period += " 연배당";
        }

        return ReitDividendResponse.builder()
                .dividendId(entity.getDividendId())
                .productCode(entity.getProductCode())
                .dividendYear(entity.getDividendYear())
                .dividendQuarter(entity.getDividendQuarter())
                .dividendPeriod(period)
                .dividendRate(entity.getDividendRate())
                .dividendAmount(entity.getDividendAmount())
                .recordDate(entity.getRecordDate())
                .paymentDate(entity.getPaymentDate())
                .announcementDate(entity.getAnnouncementDate())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    // Entity List -> DTO List 변환
    public static List<ReitDividendResponse> fromEntityList(List<ReitDividend> entities) {
        return entities.stream()
                .map(ReitDividendResponse::fromEntity)
                .collect(Collectors.toList());
    }
}