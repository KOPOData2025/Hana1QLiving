package com.living.hana.dto;

import com.living.hana.entity.LinkedSecuritiesAccount;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MyAccountsResponseDto {
    private boolean success;
    private String message;
    private List<BankAccountDto> bankAccounts;
    private List<SecuritiesAccountDto> securitiesAccounts;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BankAccountDto {
        private String accountNumber;
        private String accountName;
        private String bankName;
        private String accountType;
        private Long balance;
        private String status;
        private String bankCode;
        private String currency;
        private String lastTransactionDate;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SecuritiesAccountDto {
        private String accountNumber;
        private String accountName;
        private String accountType;
        private String status;
        private Long balance;
        private String maskedAccountNumber;
        private String createdAt;
        private String brokerCode;
        private String brokerName;
        
        public static SecuritiesAccountDto fromEntity(LinkedSecuritiesAccount account, Long balance) {
            SecuritiesAccountDto dto = new SecuritiesAccountDto();
            dto.setAccountNumber(account.getAccountNumber());
            dto.setAccountName(account.getAccountName());
            dto.setAccountType(account.getAccountType());
            dto.setStatus(account.getStatus());
            dto.setBalance(balance);
            dto.setMaskedAccountNumber(maskAccountNumber(account.getAccountNumber()));
            dto.setCreatedAt(account.getCreatedAt());
            return dto;
        }
        
        private static String maskAccountNumber(String accountNumber) {
            if (accountNumber.length() >= 10) {
                return accountNumber.substring(0, 3) + "-****-" + accountNumber.substring(accountNumber.length() - 2);
            }
            return accountNumber;
        }
    }
}