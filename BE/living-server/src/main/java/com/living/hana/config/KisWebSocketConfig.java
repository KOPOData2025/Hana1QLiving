package com.living.hana.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * 한국투자증권 API 스타일 WebSocket 설정
 */
@Configuration
@EnableWebSocketMessageBroker
public class KisWebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${websocket.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public TaskScheduler heartBeatScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("wss-heartbeat-");
        scheduler.initialize();
        return scheduler;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // 메시지 브로커 설정 - REITs 실시간 데이터용
        config.enableSimpleBroker("/topic", "/queue")
              .setHeartbeatValue(new long[]{10000, 10000})
              .setTaskScheduler(heartBeatScheduler());
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // REITs 실시간 시세 WebSocket 엔드포인트
        registry.addEndpoint("/ws/reits-realtime")
                .setAllowedOriginPatterns("*")
                .withSockJS();
        
        // 일반 WebSocket 엔드포인트 (SockJS 없이)
        registry.addEndpoint("/ws/reits-realtime")
                .setAllowedOriginPatterns("*");

        // 기존 투자 WebSocket 엔드포인트는 WebSocketConfig에서 네이티브로 처리
        // SockJS 제거하고 네이티브 WebSocket만 사용
    }
}