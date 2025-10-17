package com.example.hana_bank.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountsResponseDto {
    private boolean success;             // 성공 여부
    private List<AccountDto> accounts;  // 계좌 목록
    private int totalCount;              // 총 계좌 수
}
