package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HanabankAccountResponse {
    private boolean success;
    private AccountData data;
    private String message;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AccountData {
        private boolean success;
        private List<HanabankAccount> accounts;
        private int totalCount;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HanabankAccount {
        private String accountNumber;
        private String accountType;
        private String accountName;
        private String bankCode;
        private String bankName;
        private Long balance;
        private String currency;
        private String status;
        private String lastTransactionDate;
    }
}
