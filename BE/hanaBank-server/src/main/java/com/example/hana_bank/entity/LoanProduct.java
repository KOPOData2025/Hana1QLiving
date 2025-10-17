package com.example.hana_bank.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoanProduct {
    private Long productId;
    private String productName;
    private String productDescription;
    private BigDecimal interestRate;
    private BigDecimal maxLoanAmount;
    private Integer maxLoanPeriod; // 최대 대출 기간 (개월)
    private String eligibilityRequirements; // 대출 자격 요건
    private String status; // ACTIVE, INACTIVE
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
