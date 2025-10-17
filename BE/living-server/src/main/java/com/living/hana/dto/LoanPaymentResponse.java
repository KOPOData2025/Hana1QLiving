package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanPaymentResponse {
    private String status;
    private String message;
    private String transactionId;
    private String paymentDate;
    private String paymentAmount;
}