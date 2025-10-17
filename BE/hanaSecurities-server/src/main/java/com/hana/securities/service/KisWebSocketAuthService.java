package com.hana.securities.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

@Service
@Slf4j
@RequiredArgsConstructor
public class KisWebSocketAuthService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${kis.api.base-url:https://openapivts.koreainvestment.com:29443}")
    private String kisApiBaseUrl;

    @Value("${kis.api.app-key:}")
    private String appKey;

    @Value("${kis.api.app-secret:}")
    private String appSecret;

    // 현재 유효한 접속키를 저장
    private final AtomicReference<String> currentApprovalKey = new AtomicReference<>();
    private LocalDateTime lastKeyIssueTime;

    /**
     * WebSocket 접속키 발급
     */
    public String getWebSocketApprovalKey() {
        String existingKey = currentApprovalKey.get();
        
        // 기존 키가 있고 24시간이 지나지 않았다면 재사용
        if (existingKey != null && lastKeyIssueTime != null) {
            if (lastKeyIssueTime.isAfter(LocalDateTime.now().minusHours(23))) {
                return existingKey;
            }
        }

        // 새로운 접속키 발급
        return issueNewApprovalKey();
    }

    /**
     * 새로운 WebSocket 접속키 발급
     */
    private synchronized String issueNewApprovalKey() {
        try {

            if (appKey == null || appKey.isEmpty() || appSecret == null || appSecret.isEmpty()) {
                throw new IllegalStateException("KIS API 키 설정이 필요합니다. application.yml에서 kis.api.app-key와 kis.api.app-secret을 설정해주세요.");
            }

            // 요청 헤더 설정
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("charset", "utf-8");

            // 요청 본문 설정
            Map<String, String> requestBody = Map.of(
                "grant_type", "client_credentials",
                "appkey", appKey,
                "secretkey", appSecret
            );

            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

            // API 호출
            String url = kisApiBaseUrl + "/oauth2/Approval";

            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> responseBody = response.getBody();
                String approvalKey = (String) responseBody.get("approval_key");

                if (approvalKey != null && !approvalKey.isEmpty()) {
                    currentApprovalKey.set(approvalKey);
                    lastKeyIssueTime = LocalDateTime.now();
                    
                    return approvalKey;
                } else {
                    throw new RuntimeException("접속키 발급 실패: approval_key가 응답에 없음");
                }
            } else {
                // API 호출 실패 로그
                throw new RuntimeException("접속키 발급 API 호출 실패: " + response.getStatusCode());
            }

        } catch (Exception e) {
            // 접속키 발급 실패
            
            // 개발 환경에서는 임시 키 반환 (실제 운영에서는 제거 필요)
            if (isDevelopmentMode()) {
                String tempKey = "TEMP_APPROVAL_KEY_FOR_DEVELOPMENT_" + System.currentTimeMillis();
                currentApprovalKey.set(tempKey);
                lastKeyIssueTime = LocalDateTime.now();
                return tempKey;
            }
            
            throw new RuntimeException("WebSocket 접속키 발급 실패", e);
        }
    }

    /**
     * 접속키 자동 갱신 스케줄러 (23시간마다 실행)
     */
    @Scheduled(fixedRate = 23 * 60 * 60 * 1000) // 23시간마다
    public void refreshApprovalKey() {
        try {
            if (lastKeyIssueTime != null) {
                // 키 갱신 시도
                issueNewApprovalKey();
            }
        } catch (Exception e) {
            // 자동 갱신 실패
        }
    }

    /**
     * 수동 접속키 갱신
     */
    public String forceRefreshApprovalKey() {
        currentApprovalKey.set(null);
        lastKeyIssueTime = null;
        return issueNewApprovalKey();
    }

    /**
     * 현재 접속키 상태 조회
     */
    public Map<String, Object> getApprovalKeyStatus() {
        String key = currentApprovalKey.get();
        
        return Map.of(
            "hasKey", key != null,
            "keyLength", key != null ? key.length() : 0,
            "keyPrefix", key != null ? key.substring(0, Math.min(10, key.length())) + "..." : "N/A",
            "issueTime", lastKeyIssueTime != null ? lastKeyIssueTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "N/A",
            "hoursElapsed", lastKeyIssueTime != null ? 
                java.time.Duration.between(lastKeyIssueTime, LocalDateTime.now()).toHours() : -1,
            "isDevelopmentMode", isDevelopmentMode()
        );
    }

    /**
     * 개발 모드 확인
     */
    private boolean isDevelopmentMode() {
        // 모의투자 도메인을 사용하거나 개발 환경 변수가 설정된 경우
        return kisApiBaseUrl.contains("openapivts") || 
               "development".equals(System.getProperty("spring.profiles.active")) ||
               "dev".equals(System.getProperty("spring.profiles.active"));
    }

    /**
     * API 키 설정 상태 확인
     */
    public boolean isApiKeyConfigured() {
        return appKey != null && !appKey.isEmpty() && 
               appSecret != null && !appSecret.isEmpty() &&
               !"your-app-key-here".equals(appKey) &&
               !"your-app-secret-here".equals(appSecret);
    }

    /**
     * 서비스 초기화 상태 확인
     */
    public boolean isReady() {
        return isApiKeyConfigured() && currentApprovalKey.get() != null;
    }
}