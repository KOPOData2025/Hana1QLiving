package com.living.hana.dto;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;

@Data
public class AdminLoginRequest {
    
    @NotBlank(message = "사번을 입력해주세요.")
    private String employeeNumber;
    
    @NotBlank(message = "비밀번호를 입력해주세요.")
    private String password;
}
