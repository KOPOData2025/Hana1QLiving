package com.living.hana.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanExecution {
    
    private Long id;
    private Long loanId;
    private String executionDate;
    private BigDecimal amount;
    private String fromAccount;
    private String toAccount;
    private String transactionId;
    private String status; // PROCESSING, SUCCESS, FAILED
    private String errorMessage;
    private String createdAt;
    private String updatedAt;
}