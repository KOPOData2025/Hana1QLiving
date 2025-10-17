package com.hana.securities.controller;

import com.hana.securities.service.KisWebSocketAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/securities/kis-auth")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(originPatterns = "*")
public class KisAuthController {

    private final KisWebSocketAuthService kisWebSocketAuthService;

    /**
     * WebSocket 접속키 상태 조회
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getApprovalKeyStatus() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Map<String, Object> status = kisWebSocketAuthService.getApprovalKeyStatus();
            
            response.put("success", true);
            response.put("status", status);
            response.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * WebSocket 접속키 수동 갱신
     */
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refreshApprovalKey() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String newKey = kisWebSocketAuthService.forceRefreshApprovalKey();
            
            response.put("success", true);
            response.put("message", "접속키가 성공적으로 갱신되었습니다.");
            response.put("keyLength", newKey.length());
            response.put("keyPrefix", newKey.substring(0, Math.min(10, newKey.length())) + "...");
            response.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * API 키 설정 상태 확인
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfigStatus() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            boolean isConfigured = kisWebSocketAuthService.isApiKeyConfigured();
            boolean isReady = kisWebSocketAuthService.isReady();
            
            response.put("success", true);
            response.put("apiKeyConfigured", isConfigured);
            response.put("serviceReady", isReady);
            response.put("message", isConfigured ? 
                (isReady ? "서비스 준비 완료" : "접속키 발급 필요") : 
                "API 키 설정 필요");
            response.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 테스트용 접속키 발급
     */
    @PostMapping("/test-issue")
    public ResponseEntity<Map<String, Object>> testIssueApprovalKey() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String approvalKey = kisWebSocketAuthService.getWebSocketApprovalKey();
            
            response.put("success", true);
            response.put("message", "접속키 발급 성공");
            response.put("keyLength", approvalKey.length());
            response.put("keyPrefix", approvalKey.substring(0, Math.min(10, approvalKey.length())) + "...");
            response.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("suggestion", "application.yml에서 kis.api.app-key와 kis.api.app-secret 설정을 확인해주세요.");
            return ResponseEntity.internalServerError().body(response);
        }
    }
}