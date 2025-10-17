package com.living.hana.client;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;

import java.util.HashMap;
import java.util.Map;

@Component
public class UserServiceClient {
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Value("${hana.oneqliving.service.base-url:http://localhost:8091}")
    private String oneQLivingServiceUrl;
    
    @Value("${hana.oneqliving.service.timeout:30000}")
    private int timeout;
    
    /**
     * 사용자 정보 조회
     */
    public Map<String, Object> getUserById(Long userId, String token) {
        try {
            String url = oneQLivingServiceUrl + "/api/proxy/user/" + userId;
            HttpHeaders headers = createAuthHeaders(token);
            
            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);
            return response.getBody();
        } catch (Exception e) {
            return createErrorResponse("사용자 정보 조회 실패", e);
        }
    }
    
    /**
     * 현재 사용자 프로필 조회
     */
    public Map<String, Object> getCurrentUserProfile(String token) {
        try {
            String url = oneQLivingServiceUrl + "/api/proxy/user/profile";
            HttpHeaders headers = createAuthHeaders(token);
            
            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);
            return response.getBody();
        } catch (Exception e) {
            return createErrorResponse("사용자 프로필 조회 실패", e);
        }
    }
    
    /**
     * JWT 토큰 검증
     */
    public Map<String, Object> validateToken(String token) {
        try {
            String url = oneQLivingServiceUrl + "/api/proxy/user/validate-token";
            HttpHeaders headers = createAuthHeaders(token);
            
            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);
            return response.getBody();
        } catch (Exception e) {
            return createErrorResponse("토큰 검증 실패", e);
        }
    }
    
    /**
     * 사용자 정보 검증 (투자 서비스 내부용)
     */
    public boolean isValidUser(Long userId, String token) {
        try {
            Map<String, Object> tokenValidation = validateToken(token);
            if (!(Boolean) tokenValidation.getOrDefault("valid", false)) {
                return false;
            }
            
            Object tokenUserIdObj = tokenValidation.get("userId");
            if (tokenUserIdObj == null) {
                return false;
            }
            
            Long tokenUserId = null;
            if (tokenUserIdObj instanceof Number) {
                tokenUserId = ((Number) tokenUserIdObj).longValue();
            } else if (tokenUserIdObj instanceof String) {
                tokenUserId = Long.parseLong((String) tokenUserIdObj);
            }
            
            return userId.equals(tokenUserId);
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * 사용자 정보 조회 (AccountValidationService에서 사용)
     */
    public Map<String, Object> getUserInfo(Long userId, String token) {
        return getUserById(userId, token);
    }
    
    /**
     * 사용자 기본 정보만 추출
     */
    public Map<String, Object> getUserBasicInfo(Long userId, String token) {
        try {
            Map<String, Object> userResponse = getUserById(userId, token);
            if (!(Boolean) userResponse.getOrDefault("success", false)) {
                return userResponse;
            }
            
            @SuppressWarnings("unchecked")
            Map<String, Object> userData = (Map<String, Object>) userResponse.get("data");
            if (userData == null) {
                return createErrorResponse("사용자 데이터 없음", new Exception("User data is null"));
            }
            
            // 투자 서비스에 필요한 기본 정보만 추출
            Map<String, Object> basicInfo = new HashMap<>();
            basicInfo.put("success", true);
            basicInfo.put("userId", userData.get("id"));
            basicInfo.put("name", userData.get("name"));
            basicInfo.put("email", userData.get("email"));
            basicInfo.put("phone", userData.get("phone"));
            basicInfo.put("status", userData.get("status"));
            
            return basicInfo;
        } catch (Exception e) {
            return createErrorResponse("사용자 기본 정보 조회 실패", e);
        }
    }
    
    // 유틸리티 메소드
    private HttpHeaders createAuthHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null && !token.isEmpty()) {
            headers.setBearerAuth(token);
        }
        return headers;
    }
    
    private Map<String, Object> createErrorResponse(String message, Exception e) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("success", false);
        errorResponse.put("message", message);
        errorResponse.put("error", e.getMessage());
        
        if (e instanceof HttpClientErrorException httpError) {
            errorResponse.put("statusCode", httpError.getStatusCode().value());
            errorResponse.put("statusText", httpError.getStatusText());
        } else if (e instanceof HttpServerErrorException httpError) {
            errorResponse.put("statusCode", httpError.getStatusCode().value());
            errorResponse.put("statusText", httpError.getStatusText());
        } else if (e instanceof ResourceAccessException) {
            errorResponse.put("statusCode", 503);
            errorResponse.put("statusText", "Service Unavailable");
            errorResponse.put("message", "하나원큐리빙 서비스에 연결할 수 없습니다.");
        }
        
        return errorResponse;
    }
    
    public boolean isUserServiceAvailable() {
        try {
            String url = oneQLivingServiceUrl + "/api/proxy/user/validate-token";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            return false;
        }
    }
}