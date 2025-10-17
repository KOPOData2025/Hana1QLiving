package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanExecutionResponse {
    
    private Long loanId;
    private String executionStatus;
    private String desiredExecutionDate;
    private String actualExecutionDate;
    private BigDecimal loanAmount;
    private String landlordAccountNumber;
    private String landlordBankCode;
    private String landlordAccountHolder;
    private String transactionId;
    private String executionResultMessage;
    private boolean canExecute; // 현재 실행 가능한지 여부
    private String contractFilePath;
    
    // 생성자들
    public LoanExecutionResponse(Long loanId, String executionStatus, boolean canExecute) {
        this.loanId = loanId;
        this.executionStatus = executionStatus;
        this.canExecute = canExecute;
    }
}