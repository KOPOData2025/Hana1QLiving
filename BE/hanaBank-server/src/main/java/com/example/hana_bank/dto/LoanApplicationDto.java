package com.example.hana_bank.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class LoanApplicationDto {
    private Long productId;
    
    private BigDecimal loanAmount;
    
    private Integer loanPeriod;
}
