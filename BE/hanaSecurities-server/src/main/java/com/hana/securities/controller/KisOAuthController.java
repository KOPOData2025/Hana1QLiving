package com.hana.securities.controller;

import com.hana.securities.service.KisOAuthService;
import com.hana.securities.util.ApiResponseBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/securities/oauth")
@RequiredArgsConstructor
@Slf4j
public class KisOAuthController {

    private final KisOAuthService kisOAuthService;

    /**
     * KIS OAuth approval_key 발급
     */
    @PostMapping("/approval-key")
    public ResponseEntity<Map<String, Object>> getApprovalKey() {
        try {
            String approvalKey = kisOAuthService.getApprovalKey();
            return ResponseEntity.ok(ApiResponseBuilder.success("approval_key 발급 성공", "approval_key", approvalKey));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponseBuilder.error(e, "approval_key 발급 중 오류가 발생했습니다"));
        }
    }

    /**
     * approval_key 강제 갱신
     */
    @PostMapping("/approval-key/refresh")
    public ResponseEntity<Map<String, Object>> refreshApprovalKey() {
        try {
            String approvalKey = kisOAuthService.refreshApprovalKey();
            return ResponseEntity.ok(ApiResponseBuilder.success("approval_key 갱신 성공", "approval_key", approvalKey));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponseBuilder.error(e, "approval_key 갱신 중 오류가 발생했습니다"));
        }
    }

    /**
     * approval_key 캐시 상태 확인
     */
    @GetMapping("/approval-key/status")
    public ResponseEntity<Map<String, Object>> getApprovalKeyStatus() {
        try {
            Map<String, Object> statusInfo = kisOAuthService.getApprovalKeyStatus();
            return ResponseEntity.ok(ApiResponseBuilder.success(statusInfo));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponseBuilder.error(e, "상태 확인 중 오류가 발생했습니다"));
        }
    }

    /**
     * OAuth 설정 정보 확인 (민감 정보 제외)
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getOAuthConfig() {
        try {
            Map<String, Object> configInfo = Map.of(
                "service", "KIS OAuth Service",
                "version", "1.0.0", 
                "description", "KIS WebSocket approval_key 발급 서비스",
                "keyValidityHours", 24,
                "cacheValidityHours", 23
            );
            return ResponseEntity.ok(ApiResponseBuilder.success(configInfo));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponseBuilder.error(e, "설정 정보 조회 중 오류가 발생했습니다"));
        }
    }
}