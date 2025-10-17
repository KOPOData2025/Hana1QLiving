package com.living.hana.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReitDividend {

    private Long dividendId;          // 배당 ID (PK)
    private String productCode;       // REIT 상품 코드
    private Integer dividendYear;     // 배당 연도
    private Integer dividendQuarter;  // 분기 (1-4, 연배당시 NULL)
    private BigDecimal dividendRate;  // 배당률 (%)
    private BigDecimal dividendAmount; // 주당 배당금
    private BigDecimal basePrice;     // 배당락일 기준 주가
    private Date recordDate;          // 배당 기준일
    private Date paymentDate;         // 배당 지급일
    private Date announcementDate;    // 배당 발표일
    private Timestamp createdAt;      // 생성일
}