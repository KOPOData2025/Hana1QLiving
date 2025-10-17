package com.living.hana.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutoBillingContract {
    
    private Long id;
    
    private Long userId;                 // 사용자 ID
    
    private Long contractId;             // 계약 ID
    
    private String fromAccount;          // 출금계좌
    
    private String accountName;          // 출금계좌명
    
    private Integer billingDay;          // 매월 납부일 (1~31)
    
    @Builder.Default
    private String status = "ACTIVE";    // ACTIVE, SUSPENDED, CANCELLED
    
    private Long hanaContractId;         // 하나은행 CMS 계약 ID
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    // 상태 확인 메서드들
    public boolean isActive() {
        return "ACTIVE".equals(status);
    }
    
    public boolean isSuspended() {
        return "SUSPENDED".equals(status);
    }
    
    public boolean isCancelled() {
        return "CANCELLED".equals(status);
    }
}