package com.living.hana.dto;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BillingDetailsResponse {
    
    private Long id;
    
    private String billingMonth;
    
    private String buildingName;
    
    private String unitNumber;
    
    // 각종 요금 항목
    private BigDecimal managementFee;
    private BigDecimal waterFee;
    private BigDecimal electricityFee;
    private BigDecimal gasFee;
    private BigDecimal cleaningFee;
    private BigDecimal securityFee;
    private BigDecimal parkingFee;
    private BigDecimal otherFee;
    
    private BigDecimal totalAmount;
    
    private String dueDate;              // MANAGEMENT_FEE_CHARGES 호환용

    private String status;

    private String paidAt;               // MANAGEMENT_FEE_CHARGES 호환용

    private String transactionId;

    private String failureReason;

    private String createdAt;            // MANAGEMENT_FEE_CHARGES 호환용
}