package com.living.hana.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RentAutoPayment {

    private Long id;
    private Long userId;
    private Long unitId;
    private Long contractId;
    private Long linkedAccountId;
    private BigDecimal monthlyRent;
    private Integer paymentDay;
    private Integer autoPaymentEnabled; // 1/0
    private String status; // ACTIVE/INACTIVE
    private Date lastPaymentDate;
    private String lastPaymentStatus;
    private String lastTransactionId;
    private String failureReason;
    private Integer failureCount;
    private Timestamp createdAt;
    private Timestamp updatedAt;
    
    // 조인용 필드들 (매퍼에서 사용)
    private String accountNumber; // linked_bank_accounts.account_number
    private String accountName;   // linked_bank_accounts.account_name
    private String buildingName;  // buildings.name (contracts -> units -> buildings)
    private String unitNumber;    // units.unit_number
    private String userName;      // users.name
    private String contractNumber; // contracts.contract_number

    // 활성화 여부 체크를 위한 편의 메서드
    public boolean isActive() {
        return "ACTIVE".equals(this.status) && Integer.valueOf(1).equals(this.autoPaymentEnabled);
    }

    public void activate() {
        this.status = "ACTIVE";
        this.autoPaymentEnabled = 1;
        this.updatedAt = new Timestamp(System.currentTimeMillis());
    }

    public void deactivate() {
        this.status = "INACTIVE";
        this.autoPaymentEnabled = 0;
        this.updatedAt = new Timestamp(System.currentTimeMillis());
    }
}