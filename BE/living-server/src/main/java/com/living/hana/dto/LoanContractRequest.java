package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanContractRequest {
    private Long loanId;
    private String applicantName;
    private String applicantSsn;
    private String applicantPhone;
    private String applicantEmail;
    private String applicantAddress;
    
    // 대출 정보
    private BigDecimal loanAmount;
    private BigDecimal interestRate;
    private Integer loanTerm; // 개월
    private String loanPurpose;
    
    // 담보 정보
    private String collateralType;
    private String collateralAddress;
    private BigDecimal collateralValue;
    
    // 계약 희망일
    private String desiredContractDate;
    private String desiredTime; // "AM" 또는 "PM"
    
    // 동의 사항
    private boolean agreesToTerms;
    private boolean agreesToPrivacy;
    private boolean agreesToCredit;
}