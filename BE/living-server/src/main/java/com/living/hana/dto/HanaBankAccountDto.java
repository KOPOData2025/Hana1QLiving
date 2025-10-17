package com.living.hana.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HanaBankAccountDto {
    private String accountNumber;
    private String accountName;
    private String accountType;
    private Long balance;
    private String bankCode;
    private String bankName;
    private String currency;
    private String status;
    private String lastTransactionDate;
    
    public String getStatus() {
        return status;
    }
    
    public String getAccountName() {
        return accountName;
    }
    
    public String getAccountType() {
        return accountType;
    }
}