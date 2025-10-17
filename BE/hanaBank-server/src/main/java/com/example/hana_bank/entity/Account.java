package com.example.hana_bank.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Account {
    private Long accountId;
    private String accountNumber;
    private String accountPassword;
    private String userCi;        // CI 기반 사용자 식별
    private String accountType;   // SAVINGS, CHECKING
    private String accountName;   // 계좌명
    private BigDecimal balance;
    private String status;        // ACTIVE, CLOSED, SUSPENDED
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastTransactionDate; // 마지막거래일
}
