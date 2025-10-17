package com.hana.securities.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AccountCreateRequest {
    private String accountName;      // 계좌명
    private String accountType;      // 계좌 타입 (NORMAL, ISA, PENSION, PREMIUM, INVESTMENT)
    private String userCi;           // 사용자 CI (연동하는 경우)
}