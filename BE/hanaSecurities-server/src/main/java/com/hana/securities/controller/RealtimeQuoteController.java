package com.hana.securities.controller;

import com.hana.securities.service.KisWebSocketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/securities/realtime")
@RequiredArgsConstructor
@Slf4j
public class RealtimeQuoteController {

    private final KisWebSocketService kisWebSocketService;
    
    // 클라이언트별 실시간 데이터 저장
    private final Map<String, Map<String, Object>> latestQuotes = new ConcurrentHashMap<>();

    /**
     * 실시간 주식 호가 구독
     */
    @PostMapping("/subscribe/{stockCode}")
    public ResponseEntity<Map<String, Object>> subscribeStockQuote(@PathVariable String stockCode) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            
            // WebSocket 서비스를 통한 구독
            kisWebSocketService.subscribeStockQuote(stockCode, quoteData -> {
                // 최신 데이터 저장
                latestQuotes.put(stockCode, quoteData);
                // 실시간 데이터 수신
            });
            
            response.put("success", true);
            response.put("message", "구독 요청이 완료되었습니다.");
            response.put("stockCode", stockCode);
            response.put("connected", kisWebSocketService.isConnected());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "구독 요청 중 오류가 발생했습니다: " + e.getMessage());
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 실시간 주식 호가 구독 해제
     */
    @DeleteMapping("/unsubscribe/{stockCode}")
    public ResponseEntity<Map<String, Object>> unsubscribeStockQuote(@PathVariable String stockCode) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            kisWebSocketService.unsubscribeStockQuote(stockCode);
            latestQuotes.remove(stockCode);
            
            response.put("success", true);
            response.put("message", "구독 해제가 완료되었습니다.");
            response.put("stockCode", stockCode);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "구독 해제 중 오류가 발생했습니다: " + e.getMessage());
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 최신 주식 호가 데이터 조회
     */
    @GetMapping("/quote/{stockCode}")
    public ResponseEntity<Map<String, Object>> getLatestQuote(@PathVariable String stockCode) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Map<String, Object> quoteData = latestQuotes.get(stockCode);
            
            if (quoteData != null) {
                response.put("success", true);
                response.put("data", quoteData);
                response.put("stockCode", stockCode);
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "해당 종목의 실시간 데이터가 없습니다. 구독을 먼저 진행해주세요.");
                response.put("stockCode", stockCode);
                return ResponseEntity.notFound().build();
            }
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "데이터 조회 중 오류가 발생했습니다: " + e.getMessage());
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 여러 종목의 최신 호가 데이터 일괄 조회
     */
    @PostMapping("/quotes")
    public ResponseEntity<Map<String, Object>> getMultipleQuotes(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            @SuppressWarnings("unchecked")
            java.util.List<String> stockCodes = (java.util.List<String>) request.get("stockCodes");
            
            if (stockCodes == null || stockCodes.isEmpty()) {
                response.put("success", false);
                response.put("message", "종목 코드 목록이 필요합니다.");
                return ResponseEntity.badRequest().body(response);
            }
            
            Map<String, Map<String, Object>> quotesData = new HashMap<>();
            int foundCount = 0;
            
            for (String stockCode : stockCodes) {
                Map<String, Object> quoteData = latestQuotes.get(stockCode);
                if (quoteData != null) {
                    quotesData.put(stockCode, quoteData);
                    foundCount++;
                }
            }
            
            response.put("success", true);
            response.put("data", quotesData);
            response.put("requestedCount", stockCodes.size());
            response.put("foundCount", foundCount);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "데이터 조회 중 오류가 발생했습니다: " + e.getMessage());
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * WebSocket 연결 상태 확인
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getConnectionStatus() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            boolean connected = kisWebSocketService.isConnected();
            int subscribedCount = latestQuotes.size();
            
            response.put("success", true);
            response.put("connected", connected);
            response.put("subscribedStocks", subscribedCount);
            response.put("stockCodes", latestQuotes.keySet());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "상태 확인 중 오류가 발생했습니다: " + e.getMessage());
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 모든 구독 해제
     */
    @PostMapping("/unsubscribe-all")
    public ResponseEntity<Map<String, Object>> unsubscribeAll() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            int unsubscribedCount = latestQuotes.size();
            
            kisWebSocketService.unsubscribeAll();
            latestQuotes.clear();
            
            response.put("success", true);
            response.put("message", "모든 구독이 해제되었습니다.");
            response.put("unsubscribedCount", unsubscribedCount);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "구독 해제 중 오류가 발생했습니다: " + e.getMessage());
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}