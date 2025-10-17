package com.example.hana_bank.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarketRate {
    private Long rateId;
    private String rateType; // COFIX_6M, COFIX_2Y, BASE_RATE
    private BigDecimal rateValue; // 금리값 (0.0251 = 2.51%)
    private LocalDate effectiveDate; // 적용일자
    private String status; // ACTIVE, INACTIVE
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}