package com.living.hana.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ManagementFeeChargeResponse {
    private Long id;
    private Long unitId;
    private String unitNumber;
    private String buildingName;
    private BigDecimal chargeAmount;
    private String chargeDescription;
    private String chargeDate;
    private String dueDate;
    private String status;
    private String autoPaymentTriggered;
    private Long paymentId;
    private String chargedByUserName;
}