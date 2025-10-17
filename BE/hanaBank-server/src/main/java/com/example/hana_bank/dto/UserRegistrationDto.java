package com.example.hana_bank.dto;

import lombok.Data;


@Data
public class UserRegistrationDto {
    private String userCi;
    
    private String username;
    
    private String password;
    
    private String name;
    
    private String email;
    
    private String phoneNumber;
    
    private String birthDate;
    
    private String authType = "CERTIFICATE"; // 기본값은 인증서 인증
    
    private String role = "CUSTOMER"; // 기본값은 고객
    
    private String adminCode; // 관리자 등록 코드
}
