package com.example.hana_bank.dto;

import lombok.Data;


@Data
public class AccountCreateDto {
    private String accountType; // SAVINGS, CHECKING
    
    private String accountPassword;
}
