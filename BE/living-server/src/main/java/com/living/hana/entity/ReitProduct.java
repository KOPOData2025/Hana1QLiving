package com.living.hana.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.sql.Timestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReitProduct {

    private String productCode;       // 주식종목 번호 (PK)
    private String productName;       // 상품명
    private String stockExchange;     // KOSPI, KOSDAQ 등
    private java.sql.Date listingDate;        // 상장일
    private Long totalShares;         // 총 발행주식수
    private Double managementFee;     // 운용보수 (%)
    private String description;       // 상품 설명
    private Timestamp createdAt;      // 생성일
    private Timestamp updatedAt;      // 수정일
}