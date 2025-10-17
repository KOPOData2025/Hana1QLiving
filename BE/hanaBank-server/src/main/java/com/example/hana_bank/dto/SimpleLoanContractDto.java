package com.example.hana_bank.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SimpleLoanContractDto {

    // 하나원큐리빙에서 실제로 보내는 필드들만
    private String applicationId;
    // contractNumber 제거 - 하나은행에서 생성
    private BigDecimal loanAmount;
    private String paymentDate;
    private String landlordAccount;

    // 추가로 보내는 필드들
    private String applicantName;
    private String loanPurpose;
    private String desiredContractDate;
}