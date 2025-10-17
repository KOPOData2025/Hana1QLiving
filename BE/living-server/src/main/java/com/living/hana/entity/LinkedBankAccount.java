package com.living.hana.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LinkedBankAccount {
    private Long id;
    private Long userId;
    private String userCi;
    private String accountNumber;
    private String accountName;
    private String accountType; // SAVINGS, CHECKING, etc.
    private String status; // ACTIVE, INACTIVE
    private String createdAt;
    private String updatedAt;
    
    // 자동결제 관련 필드
    private Boolean autoPaymentEnabled;
    private BigDecimal autoPaymentAmount;
    private Integer autoPaymentTransferDay;
    private String hanaContractId;
    
    public Long getId() {
        return id;
    }
    
    public String getAccountNumber() {
        return accountNumber;
    }
}