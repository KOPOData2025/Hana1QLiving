package com.living.hana.client;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class HanaSecuritiesApiClient {
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Value("${hana.securities.api.base-url:http://localhost:8093}")
    private String baseUrl;

    public Map<String, Object> processBuyOrder(Map<String, Object> orderRequest) {
        try {
            String url = baseUrl + "/api/orders/buy";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(orderRequest, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            return response.getBody();
        } catch (Exception e) {
            return createErrorResponse("매수 주문 실패", e);
        }
    }
    
    public Map<String, Object> processSellOrder(Map<String, Object> orderRequest) {
        try {
            String url = baseUrl + "/api/orders/sell";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(orderRequest, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            return response.getBody();
        } catch (Exception e) {
            return createErrorResponse("매도 주문 실패", e);
        }
    }
    
    public Map<String, Object> getOrderHistory(String customerId) {
        try {
            String url = baseUrl + "/api/orders/history/" + customerId;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return response.getBody();
        } catch (Exception e) {
            return createErrorResponse("주문 이력 조회 실패", e);
        }
    }
    
    public Map<String, Object> getOrder(String orderId) {
        try {
            String url = baseUrl + "/api/orders/" + orderId;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return response.getBody();
        } catch (HttpClientErrorException.NotFound e) {
            return createErrorResponse("주문을 찾을 수 없습니다", e);
        } catch (Exception e) {
            return createErrorResponse("주문 조회 실패", e);
        }
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
            errorResponse.put("message", "하나증권 서버에 연결할 수 없습니다.");
        }
        
        return errorResponse;
    }

    public Map<String, Object> getPortfolioByCustomerId(String customerId) {
        try {
            String url = baseUrl + "/api/portfolio/customer/" + customerId;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return response.getBody();
        } catch (Exception e) {
            return createErrorResponse("포트폴리오 조회 실패", e);
        }
    }
    
    public Map<String, Object> getPortfolioSummaryByCustomerId(String customerId) {
        try {
            String url = baseUrl + "/api/portfolio/customer/" + customerId + "/summary";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return response.getBody();
        } catch (Exception e) {
            return createErrorResponse("포트폴리오 요약 조회 실패", e);
        }
    }

    public Map<String, Object> refreshPortfolioValues(Long userId) {
        try {
            String url = baseUrl + "/api/portfolio/" + userId + "/refresh";
            ResponseEntity<Map> response = restTemplate.postForEntity(url, null, Map.class);
            return response.getBody();
        } catch (Exception e) {
            return createErrorResponse("포트폴리오 새로고침 실패", e);
        }
    }
    
    /**
     * 실시간 주식 가격 조회 (단일 종목)
     */
    public Map<String, Object> getRealtimeStockPrice(String stockCode) {
        try {
            String url = baseUrl + "/api/securities/stock-price/" + stockCode;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return response.getBody();
        } catch (Exception e) {
            return createErrorResponse("실시간 주식 가격 조회 실패: " + stockCode, e);
        }
    }

    /**
     * 계좌별 배당 내역 조회
     */
    public Map<String, Object> getDividendHistory(String accountNumber) {
        try {
            // 하나증권 DividendController의 실제 경로 사용
            String url = baseUrl + "/api/accounts/" + accountNumber + "/dividends";
            ResponseEntity<List> response = restTemplate.getForEntity(url, List.class);

            List<Map<String, Object>> dividends = response.getBody();
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("data", dividends != null ? dividends : new ArrayList<>());
            result.put("count", dividends != null ? dividends.size() : 0);

            return result;
        } catch (Exception e) {
            return createErrorResponse("배당 내역 조회 실패: " + accountNumber, e);
        }
    }

    /**
     * 리츠 투자 시뮬레이션 실행
     */
    public Map<String, Object> runSimulation(Map<String, Object> simulationRequest) {
        try {
            String url = baseUrl + "/api/reit/simulation/rank";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(simulationRequest, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("data", response.getBody());
            return result;
        } catch (Exception e) {
            return createErrorResponse("리츠 투자 시뮬레이션 실행 실패", e);
        }
    }

}