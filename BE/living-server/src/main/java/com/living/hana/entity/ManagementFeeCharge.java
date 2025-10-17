package com.living.hana.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManagementFeeCharge {
    private Long id;
    private Long unitId;
    private Long chargedByUserId;
    private BigDecimal chargeAmount;
    private String chargeDescription;
    private String chargeDate;
    private String dueDate;
    private String status; // PENDING, PAID, OVERDUE, CANCELLED
    private String autoPaymentTriggered; // Y/N
    private Long paymentId;
    private String createdAt;
    private String updatedAt;

    // 조인용 필드들
    private Unit unit;
    private User chargedByUser;
    private Payment payment;
}