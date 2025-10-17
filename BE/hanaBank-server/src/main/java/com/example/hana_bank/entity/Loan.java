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
public class Loan {
    private Long loanId;
    private String userCi;        // CI 기반 사용자 식별
    private Long productId;
    private BigDecimal loanAmount;
    private BigDecimal interestRate;
    private Integer loanPeriod;   // 대출 기간 (개월)
    private BigDecimal remainingAmount;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;        // ACTIVE, COMPLETED, DEFAULTED
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
