package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanPaymentRequest {
    private String applicationNumber;
    private BigDecimal amount;
    private String landlordAccount;
    private String landlordBank;
    private String landlordName;
    private String paymentDate;
    private String executionType; // "AUTO", "MANUAL"
}