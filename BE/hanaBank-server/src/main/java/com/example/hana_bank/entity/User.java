package com.example.hana_bank.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    private String userCi;        // CI (Certificate Information) - 주키
    private String username;      // 선택적 아이디
    private String password;      // 선택적 패스워드
    private String name;
    private String email;
    private String phoneNumber;
    private String birthDate;
    private String role;          // ADMIN, CUSTOMER
    private String status;        // ACTIVE, INACTIVE, SUSPENDED
    private String authType;      // PASSWORD
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
