package com.living.hana.dto;

import lombok.Data;

@Data
public class UserRegistrationRequest {
    private String email;
    private String password;
    private String phone;
    private String name;           // 실명
    private String beforeAddress;  // 회원가입 시 주소 (이전 주소)
    private Boolean agreeMarketing; // 마케팅 동의 여부
}
