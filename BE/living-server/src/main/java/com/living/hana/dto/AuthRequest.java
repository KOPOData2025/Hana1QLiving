package com.living.hana.dto;

import lombok.Data;

@Data
public class AuthRequest {
    private String email;
    private String password;
}
