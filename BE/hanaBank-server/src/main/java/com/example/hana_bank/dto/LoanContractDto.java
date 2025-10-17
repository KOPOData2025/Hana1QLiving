package com.example.hana_bank.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanContractDto {
    
    // 계약 정보
    private String contractNumber;
    private Long loanId;
    private String applicationId; // 하나원큐리빙 신청 ID
    
    // 신청자 정보
    private String applicantName;
    private String applicantSsn;
    private String applicantPhone;
    private String applicantEmail;
    private String applicantAddress;
    
    // 대출 정보
    private BigDecimal loanAmount;
    private BigDecimal interestRate;
    private Integer loanTerm;
    private String loanPurpose;
    
    // 담보 정보
    private String collateralType;
    private String collateralAddress;
    private BigDecimal collateralValue;
    
    // 계약 희망일
    private String desiredContractDate;
    private String desiredTime;
    
    // 계약서 문서 URL
    private String contractDocumentUrl;
}