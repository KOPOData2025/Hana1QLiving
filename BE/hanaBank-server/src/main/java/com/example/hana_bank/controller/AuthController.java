package com.example.hana_bank.controller;

import com.example.hana_bank.dto.ApiResponseDto;
import com.example.hana_bank.dto.AuthRequestDto;
import com.example.hana_bank.dto.AuthResponseDto;
import com.example.hana_bank.dto.UserRegistrationDto;
import com.example.hana_bank.entity.User;
import com.example.hana_bank.service.AuthService;
import com.example.hana_bank.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;



@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "인증", description = "사용자 인증 관련 API")
public class AuthController {
    
    private final AuthService authService;
    private final UserService userService;
    
    @PostMapping("/register")
    @Operation(summary = "회원가입", description = "새로운 사용자를 등록합니다.")
    public ResponseEntity<ApiResponseDto<User>> register(@RequestBody UserRegistrationDto dto) {
        try {
            User user = userService.registerUser(dto);
            return ResponseEntity.ok(ApiResponseDto.success("회원가입이 완료되었습니다.", user));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    @PostMapping("/login")
    @Operation(summary = "로그인", description = "사용자 로그인을 처리합니다.")
    public ResponseEntity<ApiResponseDto<AuthResponseDto>> login(@RequestBody AuthRequestDto dto) {
        try {
            AuthResponseDto response = authService.authenticate(dto);
            return ResponseEntity.ok(ApiResponseDto.success("로그인에 성공했습니다.", response));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
}
