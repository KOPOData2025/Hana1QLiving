package com.hana.securities.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@Slf4j
public class WebSocketConfig implements WebSocketConfigurer {

    private final InvestmentWebSocketHandler investmentWebSocketHandler;

    public WebSocketConfig(InvestmentWebSocketHandler investmentWebSocketHandler) {
        this.investmentWebSocketHandler = investmentWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        
        // 순수 WebSocket 지원 (SockJS 제거)
        registry.addHandler(investmentWebSocketHandler, "/ws/investment")
                .setAllowedOriginPatterns("*"); // 모든 오리진 허용
                
        log.info("✅ WebSocket 핸들러 등록 완료 - 경로: /ws/investment (순수 WebSocket)");
                
    }
}