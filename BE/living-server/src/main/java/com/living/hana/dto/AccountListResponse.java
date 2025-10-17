package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountListResponse {
    private boolean success;
    private String message;
    private String userCi;                    // 사용자 CI
    private List<AccountInfo> accounts;       // 계좌 목록
    private int totalCount;                   // 총 계좌 수
}
