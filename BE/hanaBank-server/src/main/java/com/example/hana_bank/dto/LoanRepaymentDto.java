package com.example.hana_bank.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class LoanRepaymentDto {
    private Long loanId;
    
    private BigDecimal repaymentAmount;
    
    private String paymentMethod = "ACCOUNT_TRANSFER";
}
