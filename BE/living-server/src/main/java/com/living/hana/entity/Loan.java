package com.living.hana.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Loan {
    
    private Long id;
    private Long userId;
    private Long contractId;
    private String applicationId;
    private String loanNumber;
    private BigDecimal loanAmount;
    private BigDecimal maxAmount;
    private BigDecimal interestRate;
    private Integer loanTerm; // 개월
    private String startDate;
    private String endDate;
    private String status; // PENDING, APPROVED, ACTIVE, COMPLETED
    private String bankName; // 하나은행
    
    // 대출 실행 관련 필드
    private String desiredExecutionDate; // 희망 대출 실행일
    private String actualExecutionDate;  // 실제 대출 실행일
    private String landlordAccountNumber; // 집주인 계좌번호
    private String landlordBankCode;     // 집주인 은행코드
    private String landlordAccountHolder; // 집주인 예금주명
    private String executionStatus;      // PENDING, READY, EXECUTED, FAILED
    private String contractFilePath;     // 대출 계약서 파일 경로
    private String transactionId;        // 송금 거래 ID
    private String executionResultMessage; // 송금 결과 메시지
    
    private String createdAt;
    private String updatedAt;
}
