package com.living.hana.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;

@Data
public class AdminUserRequest {
    
    @NotBlank(message = "사용자명을 입력해주세요.")
    private String username;
    
    @NotBlank(message = "이름을 입력해주세요.")
    private String name;
    
    @NotBlank(message = "이메일을 입력해주세요.")
    @Email(message = "올바른 이메일 형식을 입력해주세요.")
    private String email;
    
    @NotBlank(message = "역할을 선택해주세요.")
    private String role;
    
    @NotBlank(message = "사번을 입력해주세요.")
    private String employeeNumber;
    
    @NotBlank(message = "부서를 입력해주세요.")
    private String department;
    
    @NotBlank(message = "전화번호를 입력해주세요.")
    private String phone;
    
    private String password; // 수정 시에는 선택사항
}
