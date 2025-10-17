package com.living.hana.controller;

import com.living.hana.dto.MyAccountsResponseDto;
import com.living.hana.security.JwtTokenProvider;
import com.living.hana.service.MyAccountService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/my-accounts")
@CrossOrigin(origins = "*")
@Slf4j
public class MyAccountController {
    
    @Autowired
    private MyAccountService myAccountService;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    /**
     * 내 모든 계좌 조회 (은행계좌 + 증권계좌)
     */
    @GetMapping("")
    public ResponseEntity<MyAccountsResponseDto> getMyAccounts(
            HttpServletRequest request,
            @RequestParam(value = "userId", required = false) Long requestUserId) {
        try {
            Long userId = requestUserId; // 쿼리 파라미터 우선 사용
            
            // 쿼리 파라미터가 없으면 JWT 토큰에서 추출
            if (userId == null) {
                userId = getUserIdFromToken(request);
            }
            
            if (userId == null) {
                userId = 1L;
            }
            
            log.info("[ACCOUNT] 내 계좌 조회 시작: userId={}", userId);
            MyAccountsResponseDto response = myAccountService.getMyAccounts(userId);
            log.info("[ACCOUNT] 내 계좌 조회 완료: userId={}, success={}, accountCount={}",
                    userId, response.isSuccess(), response.getBankAccounts() != null ? response.getBankAccounts().size() : 0);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.ok(new MyAccountsResponseDto(false, "서버 오류가 발생했습니다: " + e.getMessage(), null, null));
        }
    }
    
    /**
     * JWT 토큰에서 사용자 ID 추출
     */
    private Long getUserIdFromToken(HttpServletRequest request) {
        try {
            String token = jwtTokenProvider.resolveToken(request);
            if (token != null && jwtTokenProvider.validateToken(token)) {
                return jwtTokenProvider.getUserId(token);
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }
}