package com.living.hana.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SecuritiesIntegrationService {

    private final RestTemplate restTemplate;

    @Value("${hana.securities.api.base-url:http://192.168.217.249:8093}")
    private String securitiesApiBaseUrl;

    /**
     * HanaSecurities에서 실시간 주식 가격 조회
     * @param stockCode 종목코드
     * @return 주식 가격 정보
     */
    public Map<String, Object> getRealtimeStockPrice(String stockCode) {
        try {
            
            String url = securitiesApiBaseUrl + "/api/securities/stock-price/" + stockCode;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                
                if (Boolean.TRUE.equals(responseBody.get("success"))) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
                    return data;
                } else {
                    return createErrorResponse("가격 조회 실패: " + responseBody.get("message"));
                }
            } else {
                return createErrorResponse("API 응답 오류");
            }
            
        } catch (Exception e) {
            return createErrorResponse("실시간 가격 조회 중 오류 발생: " + e.getMessage());
        }
    }

    /**
     * 여러 종목 실시간 가격 일괄 조회
     * @param stockCodes 종목코드 목록
     * @return 종목별 가격 정보
     */
    public Map<String, Object> getMultipleRealtimeStockPrices(List<String> stockCodes) {
        try {
            
            String url = securitiesApiBaseUrl + "/api/securities/stock-price/multiple";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("stockCodes", stockCodes);
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                
                if (Boolean.TRUE.equals(responseBody.get("success"))) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
                    return data;
                } else {
                    return createMultipleErrorResponse(stockCodes);
                }
            } else {
                return createMultipleErrorResponse(stockCodes);
            }
            
        } catch (Exception e) {
            return createMultipleErrorResponse(stockCodes);
        }
    }

    /**
     * 포트폴리오 실시간 가격 업데이트 요청
     * @param stockCodes 포트폴리오 종목 목록
     * @return 포트폴리오 가격 업데이트 정보
     */
    public Map<String, Object> getPortfolioRealtimeUpdates(List<String> stockCodes) {
        try {
            
            String url = securitiesApiBaseUrl + "/api/securities/stock-price/portfolio-updates";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("stockCodes", stockCodes);
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                
                if (Boolean.TRUE.equals(responseBody.get("success"))) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
                    return data;
                } else {
                    return createPortfolioErrorResponse();
                }
            } else {
                return createPortfolioErrorResponse();
            }
            
        } catch (Exception e) {
            return createPortfolioErrorResponse();
        }
    }

    /**
     * HanaSecurities 실시간 구독 시작
     * @param stockCode 종목코드
     * @return 구독 결과
     */
    public boolean subscribeRealtimeStock(String stockCode) {
        try {
            
            String url = securitiesApiBaseUrl + "/api/securities/stock-price/subscribe/" + stockCode;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                return Boolean.TRUE.equals(responseBody.get("success"));
            }
            
            return false;
            
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * HanaSecurities 실시간 구독 해제
     * @param stockCode 종목코드
     * @return 구독 해제 결과
     */
    public boolean unsubscribeRealtimeStock(String stockCode) {
        try {
            
            String url = securitiesApiBaseUrl + "/api/securities/stock-price/unsubscribe/" + stockCode;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.DELETE, request, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                return Boolean.TRUE.equals(responseBody.get("success"));
            }
            
            return false;
            
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * HanaSecurities 서비스 상태 확인
     * @return 서비스 상태
     */
    public Map<String, Object> getSecuritiesServiceStatus() {
        try {
            String url = securitiesApiBaseUrl + "/api/securities/stock-price/status";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return response.getBody();
            } else {
                return createServiceStatusError();
            }
            
        } catch (Exception e) {
            return createServiceStatusError();
        }
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("status", "ERROR");
        error.put("message", message);
        error.put("timestamp", System.currentTimeMillis());
        return error;
    }

    private Map<String, Object> createMultipleErrorResponse(List<String> stockCodes) {
        Map<String, Object> errorData = new HashMap<>();
        for (String stockCode : stockCodes) {
            errorData.put(stockCode, createErrorResponse("가격 조회 실패"));
        }
        return errorData;
    }

    private Map<String, Object> createPortfolioErrorResponse() {
        Map<String, Object> error = new HashMap<>();
        error.put("updates", new HashMap<>());
        error.put("timestamp", System.currentTimeMillis());
        error.put("updateCount", 0);
        error.put("error", "포트폴리오 업데이트 실패");
        return error;
    }

    private Map<String, Object> createServiceStatusError() {
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("connected", false);
        error.put("cachedStockCount", 0);
        error.put("message", "서비스 상태 확인 실패");
        error.put("timestamp", System.currentTimeMillis());
        return error;
    }
}