package com.living.hana.dto;

import lombok.Data;

import java.sql.Date;

@Data
public class ReitProductRequest {
    private String productCode;       // 주식종목 번호
    private String productName;       // 상품명
    private String stockExchange;     // KOSPI, KOSDAQ 등
    private Date listingDate;         // 상장일
    private Long totalShares;         // 총 발행주식수
    private Double managementFee;     // 운용보수 (%)
    private String description;       // 상품 설명
}