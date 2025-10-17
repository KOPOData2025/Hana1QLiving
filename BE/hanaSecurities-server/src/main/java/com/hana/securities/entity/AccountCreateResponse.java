package com.hana.securities.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AccountCreateResponse {
    private boolean success;
    private String message;
    private String accountNumber;    // 생성된 계좌번호
    private String accountName;      // 계좌명
    private String accountType;      // 계좌 타입
    private Long balance;            // 초기 잔액
    private String linkToken;        // 연동 토큰 (연동하는 경우)
    
    public AccountCreateResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
    }
}