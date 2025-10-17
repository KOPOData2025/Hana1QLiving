package com.living.hana.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class MainServiceClient {
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Value("${main.service.url:http://localhost:8091}")
    private String mainServiceUrl;
    
    /**
     * 메인 서비스에서 사용자의 증권계좌 연동 상태 확인
     */
    public boolean verifySecuritiesAccount(Long userId, String accountNumber, String token) {
        try {
            String url = mainServiceUrl + "/api/securities-accounts/verify/" + accountNumber;
            
            Map<String, String> headers = new HashMap<>();
            headers.put("Authorization", "Bearer " + token);
            
            // Spring의 HttpEntity를 사용하여 헤더 포함 요청
            org.springframework.http.HttpHeaders httpHeaders = new org.springframework.http.HttpHeaders();
            httpHeaders.set("Authorization", "Bearer " + token);
            org.springframework.http.HttpEntity<?> entity = new org.springframework.http.HttpEntity<>(httpHeaders);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                url, 
                org.springframework.http.HttpMethod.GET, 
                entity, 
                Map.class
            );
            
            Map<String, Object> responseBody = response.getBody();
            if (responseBody != null) {
                Boolean verified = (Boolean) responseBody.get("verified");
                return Boolean.TRUE.equals(verified);
            }
            
            return false;
            
        } catch (HttpClientErrorException e) {
            log.error("계좌 검증 API 호출 실패: {}", e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("계좌 검증 중 오류 발생: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * 사용자의 연동된 계좌 목록 조회
     */
    @SuppressWarnings("unchecked")
    public java.util.List<Map<String, Object>> getUserLinkedAccounts(String token) {
        try {
            String url = mainServiceUrl + "/api/securities-accounts/linked";
            
            org.springframework.http.HttpHeaders httpHeaders = new org.springframework.http.HttpHeaders();
            httpHeaders.set("Authorization", "Bearer " + token);
            org.springframework.http.HttpEntity<?> entity = new org.springframework.http.HttpEntity<>(httpHeaders);
            
            ResponseEntity<List> response = restTemplate.exchange(
                url, 
                org.springframework.http.HttpMethod.GET, 
                entity, 
                List.class
            );
            
            return response.getBody();
            
        } catch (Exception e) {
            log.error("연동 계좌 목록 조회 중 오류 발생: {}", e.getMessage());
            return new java.util.ArrayList<>();
        }
    }
    
    /**
     * 하나증권을 통한 계좌 잔액 확인
     */
    public Long getAccountBalance(String userCi, String accountNumber) {
        try {
            String url = "http://localhost:8093/api/securities/accounts/" + accountNumber;
            
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            if (responseBody != null && userCi.equals(responseBody.get("userCi"))) {
                Object balance = responseBody.get("balance");
                if (balance instanceof Number) {
                    return ((Number) balance).longValue();
                }
            }
            
            return null;
            
        } catch (Exception e) {
            log.error("계좌 잔액 조회 중 오류 발생: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * 하나증권를 통한 계좌 잔액 업데이트 (거래 후)
     */
    public boolean updateAccountBalance(String accountNumber, Long newBalance) {
        try {
            String url = "http://localhost:8093/api/securities/accounts/" + accountNumber + "/balance";
            
            Map<String, Object> request = new HashMap<>();
            request.put("balance", newBalance);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                url, 
                org.springframework.http.HttpMethod.PUT, 
                new org.springframework.http.HttpEntity<>(request), 
                Map.class
            );
            
            Map<String, Object> responseBody = response.getBody();
            if (responseBody != null) {
                Boolean success = (Boolean) responseBody.get("success");
                return Boolean.TRUE.equals(success);
            }
            
            return false;
            
        } catch (Exception e) {
            log.error("계좌 잔액 업데이트 중 오류 발생: {}", e.getMessage());
            return false;
        }
    }
}