package com.living.hana.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LinkedSecuritiesAccount {
    private Long id;
    private Long userId;
    private String userCi;
    private String accountNumber;
    private String accountName;
    private String accountType;
    private String status; // ACTIVE, INACTIVE
    private String linkToken;
    private String createdAt;
    private String updatedAt;
}