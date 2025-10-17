package com.living.hana.dto;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MonthlyBillingRequest {
    
    private Long userId;
    
    private Long contractId;
    
    private String billingMonth;         // YYYY-MM
    
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
    
    private LocalDate dueDate;
}