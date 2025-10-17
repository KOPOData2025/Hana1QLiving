package com.living.hana.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ManagementFeeChargeRequest {
    private Long unitId;
    private BigDecimal chargeAmount;
    private String chargeDescription;
    private String dueDate; // 납부 마감일 (YYYY-MM-DD)
}