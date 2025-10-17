package com.living.hana.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.function.Consumer;

@Component
@Slf4j
public class HanaSecuritiesWebSocketClient {

    private final ObjectMapper objectMapper;
    
    @Value("${hana.securities.websocket.url}")
    private String securitiesWebSocketUrl;
    
    @Value("${hana.securities.websocket.reconnect.interval:5000}")
    private long reconnectInterval;
    
    @Value("${hana.securities.websocket.reconnect.max-attempts:10}")
    private int maxReconnectAttempts;
    
    private org.java_websocket.client.WebSocketClient webSocketClient;
    private boolean isConnected = false;
    private int reconnectAttempts = 0;
    
    // 구독된 종목들과 콜백 함수들을 저장
    private final Map<String, CopyOnWriteArraySet<Consumer<Map<String, Object>>>> subscribers = new ConcurrentHashMap<>();

    public HanaSecuritiesWebSocketClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * HanaSecurities WebSocket 연결
     */
    public void connect() {
        if (isConnected) {
            return;
        }

        try {
            URI serverUri = new URI(securitiesWebSocketUrl);
            log.info("HanaSecurities WebSocket 연결 시도: {}", securitiesWebSocketUrl);
            
            webSocketClient = new org.java_websocket.client.WebSocketClient(serverUri) {
                @Override
                public void onOpen(org.java_websocket.handshake.ServerHandshake handshake) {
                    isConnected = true;
                    reconnectAttempts = 0;
                    log.info("HanaSecurities WebSocket 연결 성공: {}", securitiesWebSocketUrl);
                }

                @Override
                public void onMessage(String message) {
                    handleSecuritiesMessage(message);
                }

                @Override
                public void onClose(int code, String reason, boolean remote) {
                    isConnected = false;
                    log.warn("HanaSecurities WebSocket 연결 종료 - code: {}, reason: {}, remote: {}", code, reason, remote);
                    
                    // 재연결 시도
                    if (code != 1000) { // 정상 종료가 아닌 경우
                        scheduleReconnect();
                    }
                }

                @Override
                public void onError(Exception ex) {
                    log.error("HanaSecurities WebSocket 오류 발생", ex);
                }
            };
            
            // WebSocket 헤더 설정
            webSocketClient.addHeader("Origin", "http://" + serverUri.getHost() + ":" + serverUri.getPort());
            webSocketClient.addHeader("User-Agent", "HanaInvestment/1.0");

            webSocketClient.connect();
            
        } catch (Exception e) {
            throw new RuntimeException("HanaSecurities WebSocket 연결 실패", e);
        }
    }

    /**
     * WebSocket 연결 해제
     */
    public void disconnect() {
        if (webSocketClient != null && isConnected) {
            webSocketClient.close();
            isConnected = false;
        }
    }

    /**
     * 종목 실시간 구독
     */
    public void subscribeStock(String productId, Consumer<Map<String, Object>> callback) {
        
        if (!isConnected) {
            connect();
        }

        // 콜백 함수 등록
        subscribers.computeIfAbsent(productId, k -> new CopyOnWriteArraySet<>()).add(callback);

        try {
            // HanaSecurities WebSocket에 구독 메시지 전송
            Map<String, Object> message = Map.of(
                "type", "SUBSCRIBE",
                "data", Map.of("productId", productId)
            );

            String jsonMessage = objectMapper.writeValueAsString(message);

            if (webSocketClient != null && webSocketClient.isOpen()) {
                webSocketClient.send(jsonMessage);
            } else {
                log.warn("WebSocket이 연결되지 않아 구독 메시지 전송 실패 - productId: {}", productId);
            }

        } catch (Exception e) {
            log.error("종목 구독 메시지 전송 중 오류 - productId: {}", productId, e);
        }
    }

    /**
     * 종목 호가 실시간 구독
     */
    public void subscribeQuote(String productId, Consumer<Map<String, Object>> callback) throws Exception {
        
        if (!isConnected) {
            connect();
        }

        // 호가 구독을 위한 별도 키 사용
        String quoteKey = "QUOTE_" + productId;
        subscribers.computeIfAbsent(quoteKey, k -> new CopyOnWriteArraySet<>()).add(callback);

        // HanaSecurities WebSocket에 호가 구독 메시지 전송
        Map<String, Object> message = Map.of(
            "type", "SUBSCRIBE_QUOTE",
            "data", Map.of("productId", productId)
        );

        String jsonMessage = objectMapper.writeValueAsString(message);

        if (webSocketClient != null && webSocketClient.isOpen()) {
            webSocketClient.send(jsonMessage);
        } else {
            connect(); // 재연결 시도

            // 재연결 후 다시 전송 시도
            if (webSocketClient != null && webSocketClient.isOpen()) {
                webSocketClient.send(jsonMessage);
            }
        }
    }

    /**
     * 종목 호가 구독 해제
     */
    public void unsubscribeQuote(String productId) throws Exception {
        String quoteKey = "QUOTE_" + productId;
        subscribers.remove(quoteKey);

        // 호가 구독 해제 메시지 생성
        Map<String, Object> message = Map.of(
            "type", "UNSUBSCRIBE_QUOTE",
            "data", Map.of("productId", productId)
        );

        String jsonMessage = objectMapper.writeValueAsString(message);

        if (webSocketClient != null && webSocketClient.isOpen()) {
            webSocketClient.send(jsonMessage);
        }
    }

    /**
     * 종목 구독 해제
     */
    public void unsubscribeStock(String productId) throws Exception {
        subscribers.remove(productId);

        // 구독 해제 메시지 생성
        Map<String, Object> message = Map.of(
            "type", "UNSUBSCRIBE",
            "data", Map.of("productId", productId)
        );

        String jsonMessage = objectMapper.writeValueAsString(message);

        if (webSocketClient != null && webSocketClient.isOpen()) {
            webSocketClient.send(jsonMessage);
        }
    }

    /**
     * HanaSecurities WebSocket 메시지 처리
     */
    private void handleSecuritiesMessage(String message) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> messageData = objectMapper.readValue(message, Map.class);

            String type = (String) messageData.get("type");
            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) messageData.get("data");

            switch (type) {
                case "CONNECTION":
                    break;
                case "SUBSCRIBE_SUCCESS":
                    break;
                case "PRICE_UPDATE":
                    handlePriceUpdate(data);
                    break;
                case "QUOTE_UPDATE":
                    handleQuoteUpdate(data);
                    break;
                case "SUBSCRIBE_QUOTE_SUCCESS":
                    break;
                case "ERROR":
                    log.error("ERROR 메시지 수신 - data: {}", data);
                    break;
                default:
                    log.warn("알 수 없는 메시지 타입 - type: {}, data: {}", type, data);
            }

        } catch (Exception e) {
            log.error("메시지 처리 중 오류 - message: {}", message, e);
        }
    }

    /**
     * 가격 업데이트 처리
     */
    private void handlePriceUpdate(Map<String, Object> data) {
        try {
            String productId = (String) data.get("productId");
            if (productId == null) {
                return;
            }

            Map<String, Object> convertedData = Map.of(
                "currentPrice", data.get("currentPrice"),
                "priceChange", data.get("change"),
                "priceChangeRate", data.get("changePercent"),
                "priceChangeSign", data.getOrDefault("changeSign", "보합"),
                "orderBook", data.getOrDefault("orderBook", Map.of()),
                "timestamp", data.getOrDefault("timestamp", System.currentTimeMillis())
            );

            CopyOnWriteArraySet<Consumer<Map<String, Object>>> stockSubscribers = subscribers.get(productId);
            if (stockSubscribers != null && !stockSubscribers.isEmpty()) {
                for (Consumer<Map<String, Object>> callback : stockSubscribers) {
                    try {
                        callback.accept(convertedData);
                    } catch (Exception e) {
                        log.error("콜백 호출 실패 - productId: {}", productId, e);
                    }
                }
            }

        } catch (Exception e) {
            log.error("가격 업데이트 처리 중 오류 - data: {}", data, e);
        }
    }

    /**
     * 호가 업데이트 처리
     */
    private void handleQuoteUpdate(Map<String, Object> data) throws Exception {
        String productId = (String) data.get("productId");
        if (productId == null) {
            return;
        }

        // 호가 구독자들에게 데이터 전송
        String quoteKey = "QUOTE_" + productId;
        CopyOnWriteArraySet<Consumer<Map<String, Object>>> quoteSubscribers = subscribers.get(quoteKey);
        if (quoteSubscribers != null && !quoteSubscribers.isEmpty()) {
            for (Consumer<Map<String, Object>> callback : quoteSubscribers) {
                callback.accept(data);
            }
        }
    }

    /**
     * 재연결 스케줄링
     */
    private void scheduleReconnect() {
        if (reconnectAttempts >= maxReconnectAttempts) {
            return;
        }
        
        new Thread(() -> {
            try {
                reconnectAttempts++;
                Thread.sleep(reconnectInterval);
                connect();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }).start();
    }

    /**
     * 연결 상태 확인
     */
    public boolean isConnected() {
        return isConnected && webSocketClient != null && webSocketClient.isOpen();
    }

    /**
     * 구독 중인 종목 수 반환
     */
    public int getSubscriberCount() {
        return subscribers.size();
    }
    
    /**
     * 구독 중인 종목 목록 반환
     */
    public java.util.Set<String> getSubscribedProducts() {
        return subscribers.keySet();
    }
}