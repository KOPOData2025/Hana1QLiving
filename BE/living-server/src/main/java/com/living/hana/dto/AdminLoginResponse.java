package com.living.hana.dto;

import lombok.Data;
import lombok.Builder;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminLoginResponse {
    
    private String token;
    @Builder.Default
    private String tokenType = "Bearer";
    private Long adminId;
    private String employeeNumber;
    private String username;
    private String name;
    private String email;
    private String role;
    private String department;
    private String phone;
    private LocalDateTime lastLoginAt;
    private LocalDateTime expiresAt;
}
