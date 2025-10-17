package com.hana.securities.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class RealtimeDataScheduler {

    private final KisWebSocketService kisWebSocketService;

    /**
     * 60초마다 WebSocket 연결 상태 로깅
     */
    @Scheduled(fixedDelay = 60000)
    public void logConnectionStatus() {
        try {
            boolean connected = kisWebSocketService.isConnected();
        } catch (Exception e) {
        }
    }
}