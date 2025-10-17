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
public class LoanRepayment {
    private Long repaymentId;
    private Long loanId;
    private BigDecimal repaymentAmount;
    private BigDecimal principalAmount;
    private BigDecimal interestAmount;
    private LocalDateTime repaymentDate;
    private String paymentMethod; // ACCOUNT_TRANSFER, CASH, etc.
    private String status; // COMPLETED, FAILED
}
