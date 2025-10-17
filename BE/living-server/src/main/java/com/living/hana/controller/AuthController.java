package com.living.hana.controller;

import com.living.hana.dto.AuthRequest;
import com.living.hana.dto.AuthResponse;
import com.living.hana.dto.UserRegistrationRequest;
import com.living.hana.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request) {
        log.info("[AUTH] 로그인 시도: {}", request.getEmail());
        try {
            AuthResponse response = authService.login(request);
            log.info("[AUTH] 로그인 성공: {}", request.getEmail());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("[AUTH] 로그인 실패: {}, error: {}", request.getEmail(), e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody UserRegistrationRequest request) {
        log.info("[AUTH] 회원가입 시도: {}", request.getEmail());
        try {
            AuthResponse response = authService.register(request);
            log.info("[AUTH] 회원가입 성공: {}", request.getEmail());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("[AUTH] 회원가입 실패: {}, error: {}",
                    request.getEmail(), e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}
