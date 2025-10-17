package com.example.hana_bank.service;

import com.example.hana_bank.dto.AuthRequestDto;
import com.example.hana_bank.dto.AuthResponseDto;
import com.example.hana_bank.entity.User;
// JWT 제거
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final UserService userService;
    // JWT 제거
    
    public AuthResponseDto authenticate(AuthRequestDto request) {
        User user = userService.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        if (!userService.validatePassword(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("비밀번호가 일치하지 않습니다.");
        }
        
        if (!"ACTIVE".equals(user.getStatus())) {
            throw new RuntimeException("비활성화된 계정입니다.");
        }
        
        // JWT 토큰 제거 - 토이프로젝트용
        String token = "NO_TOKEN_NEEDED";
        
        return AuthResponseDto.builder()
                .token(token)
                .username(user.getUsername())
                .role(user.getRole())
                .userCi(user.getUserCi())
                .message("로그인에 성공했습니다.")
                .build();
    }
}
