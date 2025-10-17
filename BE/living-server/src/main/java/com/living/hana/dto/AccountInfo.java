package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountInfo {
    private String accountNumber;      // 계좌번호
    private String accountType;        // 계좌종류 (예: 입출금, 예금, 적금 등)
    private String accountName;        // 계좌명
    private String bankCode;           // 은행코드 (하나은행: 088)
    private String bankName;           // 은행명 (하나은행)
    private Long balance;              // 잔액
    private String currency;           // 통화 (KRW)
    private String status;             // 계좌상태 (ACTIVE, INACTIVE 등)
    private String lastTransactionDate; // 마지막 거래일
}
