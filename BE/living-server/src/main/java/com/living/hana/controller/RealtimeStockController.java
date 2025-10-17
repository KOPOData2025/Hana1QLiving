package com.living.hana.controller;

import com.living.hana.service.SecuritiesIntegrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/investment/realtime")
@RequiredArgsConstructor
@Slf4j
public class RealtimeStockController {

    private final SecuritiesIntegrationService securitiesIntegrationService;

    /**
     * HanaSecurities를 통한 실시간 주식 가격 조회
     */
    @GetMapping("/stock/{stockCode}")
    public ResponseEntity<Map<String, Object>> getRealtimeStockPrice(@PathVariable String stockCode) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            
            Map<String, Object> priceData = securitiesIntegrationService.getRealtimeStockPrice(stockCode);
            
            response.put("success", true);
            response.put("data", priceData);
            response.put("stockCode", stockCode);
            response.put("source", "HanaSecurities");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "실시간 가격 조회 중 오류가 발생했습니다: " + e.getMessage());
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 실시간 구독 시작
     */
    @PostMapping("/subscribe/{stockCode}")
    public ResponseEntity<Map<String, Object>> subscribeRealtimeStock(@PathVariable String stockCode) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            
            boolean subscribed = securitiesIntegrationService.subscribeRealtimeStock(stockCode);
            
            response.put("success", subscribed);
            response.put("message", subscribed ? "실시간 구독이 시작되었습니다." : "실시간 구독 시작에 실패했습니다.");
            response.put("stockCode", stockCode);
            response.put("source", "HanaSecurities");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "구독 시작 중 오류가 발생했습니다: " + e.getMessage());
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

}