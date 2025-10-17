package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AccountLinkResponseDto {
    private boolean success;
    private String message;
    private String accountNumber;
    private String accountName;
    private Long balance;
    private String linkToken;
    
    // 실패 응답 생성자
    public AccountLinkResponseDto(boolean success, String message) {
        this.success = success;
        this.message = message;
    }
}