package com.example.hana_bank.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanPayment {
    private Long paymentId;
    private String transactionId;
    private String contractNumber;
    private BigDecimal paymentAmount;
    private String landlordAccount;
    private String landlordName;
    private String status; // SCHEDULED, PROCESSING, COMPLETED, FAILED
    private String executionType; // AUTO, MANUAL
    private LocalDateTime scheduledAt;
    private LocalDateTime executedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String remarks;
}