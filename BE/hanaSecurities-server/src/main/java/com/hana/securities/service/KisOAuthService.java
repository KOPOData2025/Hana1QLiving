package com.hana.securities.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service("kisOAuthService")
@Slf4j
public class KisOAuthService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    @Value("${kis.api.base-url:https://openapivts.koreainvestment.com:29443}")
    private String baseUrl;
    
    @Value("${kis.api.app-key:}")
    private String appKey;
    
    @Value("${kis.api.app-secret:}")
    private String appSecret;
    
    public KisOAuthService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }
    
    private String cachedApprovalKey;
    private long keyExpiryTime = 0;
    
    private String cachedAccessToken;
    private long tokenExpiryTime = 0;
    
    /**
     * KIS OAuth를 통해 WebSocket approval_key 발급
     * @return approval_key
     */
    public String getApprovalKey() {
        try {
            log.info("=== WebSocket approval_key 발급 요청 시작 ===");
            
            // 캐시된 키가 있고 아직 유효하면 재사용 (24시간 - 1시간 여유)
            long currentTime = System.currentTimeMillis();
            if (cachedApprovalKey != null && currentTime < keyExpiryTime) {
                log.info("캐시된 approval_key 사용 - 키 길이: {}, 만료까지 남은 시간: {}분", 
                        cachedApprovalKey.length(), (keyExpiryTime - currentTime) / (60 * 1000));
                return cachedApprovalKey;
            }
            
            // app-key와 app-secret 유효성 검증
            if (appKey == null || appKey.isEmpty() || appSecret == null || appSecret.isEmpty()) {
                throw new RuntimeException("KIS API 인증 정보가 설정되지 않았습니다. application.yml의 kis.api.app-key와 kis.api.app-secret을 확인하세요.");
            }
            
            
            // OAuth 요청 URL (공식 API 문서 기준)
            String oauthUrl = baseUrl + "/oauth2/Approval";
            log.info("OAuth 요청 URL: {}", oauthUrl);
            
            // 요청 헤더 설정 (공식 API 문서 기준)
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Accept", "application/json");
            
            // 요청 바디 설정 (공식 API 문서 기준)
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("grant_type", "client_credentials");
            requestBody.put("appkey", appKey);
            requestBody.put("secretkey", appSecret);
            
            String requestJson = objectMapper.writeValueAsString(requestBody);
            HttpEntity<String> request = new HttpEntity<>(requestJson, headers);
            
            log.info("OAuth 요청 전송 - appkey: {}***, secretkey: {}***", 
                    appKey.substring(0, Math.min(appKey.length(), 8)), 
                    appSecret.substring(0, Math.min(appSecret.length(), 8)));
            
            // OAuth API 호출
            ResponseEntity<String> response = restTemplate.exchange(
                oauthUrl, 
                HttpMethod.POST, 
                request, 
                String.class
            );
            
            log.info("OAuth 응답 상태: {}, 응답 내용: {}", response.getStatusCode(), response.getBody());
            
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode responseJson = objectMapper.readTree(response.getBody());
                
                // 오류 응답 확인
                if (responseJson.has("rt_cd") && !"0".equals(responseJson.get("rt_cd").asText())) {
                    String errorCode = responseJson.get("rt_cd").asText();
                    String errorMsg = responseJson.has("msg1") ? responseJson.get("msg1").asText() : "알 수 없는 오류";
                    throw new RuntimeException("KIS API 오류: " + errorCode + " - " + errorMsg);
                }
                
                // approval_key 추출
                String approvalKey = null;
                if (responseJson.has("approval_key")) {
                    approvalKey = responseJson.get("approval_key").asText();
                } else if (responseJson.has("access_token")) {
                    // 일부 API에서는 access_token으로 반환될 수 있음
                    approvalKey = responseJson.get("access_token").asText();
                }
                
                if (approvalKey != null && !approvalKey.isEmpty()) {
                    // 캐시 저장 (23시간 후 만료)
                    cachedApprovalKey = approvalKey;
                    keyExpiryTime = currentTime + (23 * 60 * 60 * 1000);
                    
                    
                    return approvalKey;
                } else {
                    throw new RuntimeException("approval_key 발급 실패: 응답에서 키를 찾을 수 없음");
                }
            } else {
                throw new RuntimeException("OAuth API 호출 실패: " + response.getStatusCode() + " - " + response.getBody());
            }
            
        } catch (Exception e) {
            throw new RuntimeException("approval_key 발급 중 오류 발생: " + e.getMessage(), e);
        }
    }
    
    /**
     * 캐시된 approval_key 강제 갱신
     * @return 새로운 approval_key
     */
    public String refreshApprovalKey() {
        cachedApprovalKey = null;
        keyExpiryTime = 0;
        return getApprovalKey();
    }
    
    /**
     * approval_key 캐시 상태 확인
     * @return 캐시 정보
     */
    public Map<String, Object> getApprovalKeyStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("hasCachedKey", cachedApprovalKey != null);
        status.put("keyExpiryTime", keyExpiryTime);
        status.put("isExpired", System.currentTimeMillis() >= keyExpiryTime);
        status.put("remainingHours", Math.max(0, (keyExpiryTime - System.currentTimeMillis()) / (60 * 60 * 1000)));
        return status;
    }
    
    /**
     * approval_key 유효성 검증
     * @param approvalKey 검증할 키
     * @return 유효 여부
     */
    public boolean isApprovalKeyValid(String approvalKey) {
        
        boolean isValid = approvalKey != null && 
                         approvalKey.length() >= 30 &&  // KIS API 실제 응답에 맞게 30자 이상으로 완화
                         !approvalKey.contains("your-websocket-approval-key") &&
                         !approvalKey.trim().isEmpty();
        
        return isValid;
    }
    
    /**
     * KIS OAuth를 통해 Access Token 발급 (REST API 용)
     * @return access_token
     */
    public String getAccessToken() {
        return getAccessTokenWithRetry(3, 1000);
    }
    
    /**
     * 재시도 로직이 포함된 Access Token 발급
     * @param maxRetries 최대 재시도 횟수
     * @param baseDelay 기본 지연 시간(ms)
     * @return access_token
     */
    private String getAccessTokenWithRetry(int maxRetries, long baseDelay) {
        long currentTime = System.currentTimeMillis();
        
        // 캐시된 토큰이 있고 아직 유효하면 재사용
        if (cachedAccessToken != null && currentTime < tokenExpiryTime) {
            log.info("캐시된 access_token 사용 - 토큰 길이: {}, 만료까지 남은 시간: {}분", 
                    cachedAccessToken.length(), (tokenExpiryTime - currentTime) / (60 * 1000));
            return cachedAccessToken;
        }
        
        // app-key와 app-secret 유효성 검증
        if (appKey == null || appKey.isEmpty() || appSecret == null || appSecret.isEmpty()) {
            throw new RuntimeException("KIS API 인증 정보가 설정되지 않았습니다. application.yml의 kis.api.app-key와 kis.api.app-secret을 확인하세요.");
        }
        
        Exception lastException = null;
        
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                log.info("=== REST API access_token 발급 시도 {}/{} ===", attempt, maxRetries);
                
                // OAuth Token 요청 URL
                String tokenUrl = baseUrl + "/oauth2/tokenP";
                
                // 요청 헤더 설정
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("Accept", "application/json");
                
                // 요청 바디 설정
                Map<String, String> requestBody = new HashMap<>();
                requestBody.put("grant_type", "client_credentials");
                requestBody.put("appkey", appKey);
                requestBody.put("appsecret", appSecret);
                
                String requestJson = objectMapper.writeValueAsString(requestBody);
                HttpEntity<String> request = new HttpEntity<>(requestJson, headers);
                
                // OAuth API 호출
                ResponseEntity<String> response = restTemplate.exchange(
                    tokenUrl, 
                    HttpMethod.POST, 
                    request, 
                    String.class
                );
                
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode responseJson = objectMapper.readTree(response.getBody());
                    
                    // 오류 응답 확인
                    if (responseJson.has("rt_cd") && !"0".equals(responseJson.get("rt_cd").asText())) {
                        String errorCode = responseJson.get("rt_cd").asText();
                        String errorMsg = responseJson.has("msg1") ? responseJson.get("msg1").asText() : "알 수 없는 오류";
                        throw new RuntimeException("KIS API 오류: " + errorCode + " - " + errorMsg);
                    }
                    
                    // access_token 추출
                    String accessToken = responseJson.has("access_token") ? 
                            responseJson.get("access_token").asText() : null;
                    
                    if (accessToken != null && !accessToken.isEmpty()) {
                        // 캐시 저장 (23시간 후 만료)
                        cachedAccessToken = accessToken;
                        tokenExpiryTime = currentTime + (23 * 60 * 60 * 1000);
                        
                        log.info("Access Token 발급 성공 (시도 {}/{}) - 토큰 길이: {}", 
                                attempt, maxRetries, accessToken.length());
                        
                        return accessToken;
                    } else {
                        throw new RuntimeException("access_token 발급 실패: 응답에서 토큰을 찾을 수 없음");
                    }
                } else {
                    throw new RuntimeException("OAuth Token API 호출 실패: " + response.getStatusCode());
                }
                
            } catch (Exception e) {
                lastException = e;
                
                // Rate limit 에러인 경우 더 오래 대기
                boolean isRateLimitError = e.getMessage() != null && 
                    (e.getMessage().contains("EGW00133") || e.getMessage().contains("1분당 1회"));
                
                long delay = isRateLimitError ? 65000 : baseDelay * attempt; // Rate limit시 65초 대기
                
                if (attempt < maxRetries) {
                    log.warn("Access Token 발급 실패 (시도 {}/{}): {} - {}ms 후 재시도", 
                            attempt, maxRetries, e.getMessage(), delay);
                    
                    try {
                        Thread.sleep(delay);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("재시도 중 인터럽트 발생", ie);
                    }
                } else {
                    log.error("Access Token 발급 최종 실패 (모든 재시도 완료): {}", e.getMessage());
                }
            }
        }
        
        throw new RuntimeException("access_token 발급 중 오류 발생: " + 
            (lastException != null ? lastException.getMessage() : "알 수 없는 오류"), lastException);
    }
    
    /**
     * 캐시된 access_token 강제 갱신
     * @return 새로운 access_token
     */
    public String refreshAccessToken() {
        cachedAccessToken = null;
        tokenExpiryTime = 0;
        return getAccessToken();
    }
    
    /**
     * access_token 캐시 상태 확인
     * @return 캐시 정보
     */
    public Map<String, Object> getAccessTokenStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("hasCachedToken", cachedAccessToken != null);
        status.put("tokenExpiryTime", tokenExpiryTime);
        status.put("isExpired", System.currentTimeMillis() >= tokenExpiryTime);
        status.put("remainingHours", Math.max(0, (tokenExpiryTime - System.currentTimeMillis()) / (60 * 60 * 1000)));
        return status;
    }
}