package com.hana.securities.controller;

import com.hana.securities.service.KisWebSocketService;
import com.hana.securities.util.ApiResponseBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@Slf4j
public class SystemStatusController {

    private final KisWebSocketService kisWebSocketService;

    /**
     * 시스템 전체 상태 확인
     */
    @GetMapping("/api/securities/system/status")
    public ResponseEntity<Map<String, Object>> getSystemStatus() {
        try {
            boolean websocketConnected = kisWebSocketService.isConnected();
            
            Map<String, Object> statusData = Map.of(
                "service", "HanaSecurities",
                "version", "1.0.0", 
                "status", "RUNNING",
                "websocket", Map.of(
                    "connected", websocketConnected,
                    "status", websocketConnected ? "CONNECTED" : "DISCONNECTED"
                )
            );
            
            return ResponseEntity.ok(ApiResponseBuilder.success(statusData));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponseBuilder.error(e, "시스템 상태 확인 중 오류가 발생했습니다"));
        }
    }

    /**
     * 헬스 체크 엔드포인트
     */
    @GetMapping("/api/securities/system/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        try {
            Map<String, Object> healthData = Map.of(
                "status", "UP",
                "service", "HanaSecurities"
            );
            return ResponseEntity.ok(ApiResponseBuilder.success(healthData));
        } catch (Exception e) {
            Map<String, Object> healthData = Map.of(
                "status", "DOWN",
                "error", e.getMessage()
            );
            return ResponseEntity.internalServerError().body(ApiResponseBuilder.success(healthData));
        }
    }

    /**
     * WebSocket 연결 상태만 확인
     */
    @GetMapping("/api/securities/system/websocket/status")
    public ResponseEntity<Map<String, Object>> getWebSocketStatus() {
        try {
            boolean connected = kisWebSocketService.isConnected();
            
            Map<String, Object> wsStatus = Map.of(
                "connected", connected,
                "status", connected ? "CONNECTED" : "DISCONNECTED",
                "service", "KIS WebSocket"
            );
            
            return ResponseEntity.ok(ApiResponseBuilder.success(wsStatus));
        } catch (Exception e) {
            Map<String, Object> errorStatus = Map.of(
                "connected", false,
                "status", "ERROR"
            );
            return ResponseEntity.internalServerError()
                    .body(ApiResponseBuilder.error(e, "WebSocket 상태 확인 중 오류가 발생했습니다"));
        }
    }

    /**
     * 기존 /api/health 엔드포인트 호환성 유지
     */
    @GetMapping("/api/health")
    public ResponseEntity<Map<String, Object>> legacyHealthCheck() {
        Map<String, Object> healthData = Map.of(
            "status", "UP",
            "service", "hana-mock-api",
            "port", 8082
        );
        return ResponseEntity.ok(ApiResponseBuilder.success(healthData));
    }
}