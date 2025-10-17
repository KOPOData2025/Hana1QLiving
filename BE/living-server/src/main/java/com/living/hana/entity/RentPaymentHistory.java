package com.living.hana.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.sql.Timestamp;
import java.sql.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RentPaymentHistory {
    
    private Long id;
    private Long rentAutoPaymentId; // NULL 가능 (수동 납부시)
    private Long contractId;
    private Timestamp paymentDate;  // 실제 납부일
    private Date scheduledDate;     // 예정일
    private Long amount;
    private String paymentType;     // AUTO, MANUAL
    private String status;          // SUCCESS, FAILED, PENDING
    private String transactionId;
    private String failureReason;
    private Timestamp createdAt;
    
    // 조인용 필드들
    private String buildingName;    // buildings.name
    private String unitNumber;      // units.unit_number
    private String accountNumber;   // linked_bank_accounts.account_number (자동이체인 경우)
    
    // 편의 메서드들
    public boolean isAutoPayment() {
        return "AUTO".equals(this.paymentType);
    }
    
    public boolean isSuccessful() {
        return "SUCCESS".equals(this.status);
    }
    
    public boolean isFailed() {
        return "FAILED".equals(this.status);
    }
    
    public boolean isPending() {
        return "PENDING".equals(this.status);
    }
}