package com.living.hana.controller;

import com.living.hana.dto.AccountLinkRequestDto;
import com.living.hana.dto.AccountLinkResponseDto;
import com.living.hana.entity.LinkedSecuritiesAccount;
import com.living.hana.service.SecuritiesAccountService;
import com.living.hana.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/securities-accounts")
@CrossOrigin(origins = "*")
public class SecuritiesAccountController {
    
    @Autowired
    private SecuritiesAccountService securitiesAccountService;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    /**
     * 증권계좌 연동 요청
     */
    @PostMapping("/link")
    public ResponseEntity<AccountLinkResponseDto> linkAccount(
            @RequestBody AccountLinkRequestDto request,
            HttpServletRequest httpRequest) {
        
        try {
            Long userId = getUserIdFromToken(httpRequest);
            if (userId == null) {
                return ResponseEntity.ok(new AccountLinkResponseDto(false, "인증이 필요합니다."));
            }
            
            AccountLinkResponseDto response = securitiesAccountService.linkAccount(userId, request);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.ok(new AccountLinkResponseDto(false, "서버 오류가 발생했습니다."));
        }
    }
    
    /**
     * 사용자의 연동된 증권계좌 목록 조회
     */
    @GetMapping("/linked")
    public ResponseEntity<List<LinkedSecuritiesAccount>> getLinkedAccounts(HttpServletRequest request) {
        try {
            Long userId = getUserIdFromToken(request);
            if (userId == null) {
                return ResponseEntity.status(401).build();
            }
            
            List<LinkedSecuritiesAccount> accounts = securitiesAccountService.getUserLinkedAccounts(userId);
            return ResponseEntity.ok(accounts);
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * JWT 토큰에서 사용자 ID 추출
     */
    private Long getUserIdFromToken(HttpServletRequest request) {
        try {
            String token = jwtTokenProvider.resolveToken(request);
            if (token != null && jwtTokenProvider.validateToken(token)) {
                String username = jwtTokenProvider.getUsername(token);
                return jwtTokenProvider.getUserId(token);
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }
}