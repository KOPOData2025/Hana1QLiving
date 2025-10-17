package com.living.hana.config;

import com.living.hana.websocket.InvestmentWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final InvestmentWebSocketHandler investmentWebSocketHandler;

    public WebSocketConfig(InvestmentWebSocketHandler investmentWebSocketHandler) {
        this.investmentWebSocketHandler = investmentWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(investmentWebSocketHandler, "/ws/investment")
                .setAllowedOrigins("*")
                .setAllowedOriginPatterns("*");
    }
}