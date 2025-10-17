package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AccountLinkRequestDto {
    private String accountNumber;
    private String accountPassword;
    private String userName;
    private String phoneNumber;
    private String birthDate;
}