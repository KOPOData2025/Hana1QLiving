package com.example.hana_bank.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanContract {
    private Long id;
    private String applicationReferenceId; // 하나원큐리빙 신청 ID 참조
    private String contractNumber;     // HNB20240315142815
    private BigDecimal loanAmount;     // 대출 금액
    private String loanPurpose;        // 대출 목적
    private String scheduledDate;      // 실행 예정일 (2024-03-15)
    private String status;             // SCHEDULED, COMPLETED, CANCELLED
    private String createdAt;
    private String updatedAt;
}