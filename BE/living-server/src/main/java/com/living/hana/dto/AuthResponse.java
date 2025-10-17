package com.living.hana.dto;

import lombok.Data;
import lombok.AllArgsConstructor;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String email;
    private String role;
    private String name;
    private Long id;
    private String phone;
    private String beforeAddress;
    private String userCi;
    private String username;
}
