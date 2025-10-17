package com.example.hana_bank.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountDto {
    private String accountNumber;        // 계좌번호
    private String accountType;          // 계좌종류
    private String accountName;          // 계좌명
    private String bankCode;             // 은행코드 (088)
    private String bankName;             // 은행명 (하나은행)
    private BigDecimal balance;          // 잔액
    private String currency;             // 통화 (KRW)
    private String status;               // 상태 (ACTIVE)
    private LocalDateTime lastTransactionDate; // 마지막거래일
}
