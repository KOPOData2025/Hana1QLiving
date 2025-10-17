package com.hana.securities.controller;

import com.hana.securities.config.InvestmentWebSocketHandler;
import com.hana.securities.service.PriceUpdateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/securities/websocket")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(originPatterns = "*")
public class WebSocketStatusController {

    private final InvestmentWebSocketHandler webSocketHandler;
    private final PriceUpdateService priceUpdateService;

    /**
     * WebSocket 연결 상태 조회
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getWebSocketStatus() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            int connectedSessions = webSocketHandler.getConnectedSessionsCount();
            
            response.put("success", true);
            response.put("connectedSessions", connectedSessions);
            response.put("serverRunning", true);
            response.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("serverRunning", false);
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 특정 상품의 구독자 수 조회
     */
    @GetMapping("/subscribers/{productId}")
    public ResponseEntity<Map<String, Object>> getSubscriberCount(@PathVariable String productId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            int subscriberCount = webSocketHandler.getSubscriberCount(productId);
            double currentPrice = priceUpdateService.getCurrentPrice(productId);
            
            response.put("success", true);
            response.put("productId", productId);
            response.put("subscriberCount", subscriberCount);
            response.put("currentPrice", currentPrice);
            response.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 수동으로 가격 업데이트 트리거
     */
    @PostMapping("/trigger-update/{productId}")
    public ResponseEntity<Map<String, Object>> triggerPriceUpdate(@PathVariable String productId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            priceUpdateService.triggerPriceUpdate(productId);
            
            response.put("success", true);
            response.put("message", "가격 업데이트가 트리거되었습니다.");
            response.put("productId", productId);
            response.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * WebSocket 테스트용 엔드포인트
     */
    @GetMapping("/test")
    public ResponseEntity<Map<String, Object>> testWebSocket() {
        Map<String, Object> response = new HashMap<>();
        
        response.put("success", true);
        response.put("message", "WebSocket 서버가 정상적으로 실행 중입니다.");
        response.put("websocketUrl", "ws://localhost:8092/ws/investment");
        response.put("connectedSessions", webSocketHandler.getConnectedSessionsCount());
        response.put("timestamp", System.currentTimeMillis());
        
        return ResponseEntity.ok(response);
    }
}