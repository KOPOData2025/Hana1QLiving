package com.example.hana_bank.dto;

import lombok.Data;


@Data
public class AuthRequestDto {
    private String username;
    
    private String password;
}
