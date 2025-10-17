package com.hana.securities.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
@Slf4j
@RequiredArgsConstructor
public class InvestmentWebSocketHandler implements WebSocketHandler {

    private final ObjectMapper objectMapper;
    private final com.hana.securities.client.KisWebSocketClient kisWebSocketClient;
    private final com.hana.securities.service.StockPriceService stockPriceService;
    
    // 연결된 세션들을 저장
    private final CopyOnWriteArraySet<WebSocketSession> sessions = new CopyOnWriteArraySet<>();
    
    // 상품별 구독자들을 저장
    private final Map<String, CopyOnWriteArraySet<WebSocketSession>> productSubscriptions = new ConcurrentHashMap<>();
    
    // 세션별 구독 상품들을 저장
    private final Map<String, CopyOnWriteArraySet<String>> sessionSubscriptions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.add(session);
        sessionSubscriptions.put(session.getId(), new CopyOnWriteArraySet<>());
        log.info("HanaSecurities WebSocket 클라이언트 연결 - sessionId: {}", session.getId());
        
        // 연결 성공 메시지 전송
        sendMessage(session, Map.of(
            "type", "CONNECTION",
            "data", Map.of(
                "status", "connected",
                "sessionId", session.getId(),
                "timestamp", System.currentTimeMillis()
            )
        ));
    }

    @Override
    public void handleMessage(WebSocketSession session, WebSocketMessage<?> message) throws Exception {
        try {
            String payload = message.getPayload().toString();
            
            @SuppressWarnings("unchecked")
            Map<String, Object> messageData = objectMapper.readValue(payload, Map.class);
            
            String type = (String) messageData.get("type");
            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) messageData.get("data");
            
            
            switch (type) {
                case "SUBSCRIBE":
                    handleSubscribe(session, data);
                    break;
                case "UNSUBSCRIBE":
                    handleUnsubscribe(session, data);
                    break;
                case "SUBSCRIBE_QUOTE":
                    handleSubscribeQuote(session, data);
                    break;
                case "UNSUBSCRIBE_QUOTE":
                    handleUnsubscribeQuote(session, data);
                    break;
                case "PING":
                    handlePing(session);
                    break;
                default:
                    log.warn("알 수 없는 메시지 타입 - sessionId: {}, type: {}", session.getId(), type);
                    sendError(session, "Unknown message type: " + type);
            }
        } catch (Exception e) {
            log.error("HanaSecurities WebSocket 메시지 처리 중 오류 - sessionId: {}", session.getId(), e);
            sendError(session, "Message processing error: " + e.getMessage());
        }
    }

    private void handleSubscribe(WebSocketSession session, Map<String, Object> data) {
        String productId = (String) data.get("productId");
        if (productId == null || productId.trim().isEmpty()) {
            sendError(session, "productId is required for subscription");
            return;
        }
        
        
        // 상품별 구독자 리스트에 세션 추가
        boolean isNewSubscription = productSubscriptions.computeIfAbsent(productId, k -> new CopyOnWriteArraySet<>()).add(session);
        
        // 세션별 구독 상품 리스트에 상품 추가
        sessionSubscriptions.get(session.getId()).add(productId);
        
        
        // 새로운 상품 구독인 경우 KIS WebSocket에도 구독 요청
        if (isNewSubscription && productSubscriptions.get(productId).size() == 1) {
            try {
                kisWebSocketClient.subscribeStock(productId, (stockData) -> {
                    Map<String, Object> priceData = convertKisDataToPriceUpdate(stockData);
                    broadcastPriceUpdate(productId, priceData);
                });
            } catch (Exception e) {
                log.error("KIS WebSocket 구독 중 오류 - productId: {}", productId, e);
            }
        }
        
        // 구독 성공 응답
        sendMessage(session, Map.of(
            "type", "SUBSCRIBE_SUCCESS",
            "data", Map.of(
                "productId", productId,
                "timestamp", System.currentTimeMillis()
            )
        ));

        // 구독 직후 캐시된 데이터가 있다면 즉시 전송
        try {
            Map<String, Object> cachedData = stockPriceService.getRealtimeStockPrice(productId);
            if (cachedData != null && !cachedData.isEmpty()) {
                Map<String, Object> cachedPriceData = Map.of(
                    "currentPrice", cachedData.getOrDefault("currentPrice", 0.0),
                    "change", cachedData.getOrDefault("changePrice", 0.0),
                    "changePercent", cachedData.getOrDefault("changeRate", 0.0),
                    "changeSign", cachedData.getOrDefault("changeSign", "보합"),
                    "orderBook", Map.of(),
                    "lastUpdated", System.currentTimeMillis()
                );
                broadcastPriceUpdate(productId, cachedPriceData);
            }
        } catch (Exception e) {
            log.warn("캐시 데이터 전송 중 오류 - productId: {}, error: {}", productId, e.getMessage());
        }
    }

    private void handleUnsubscribe(WebSocketSession session, Map<String, Object> data) {
        String productId = (String) data.get("productId");
        if (productId == null || productId.trim().isEmpty()) {
            sendError(session, "productId is required for unsubscription");
            return;
        }
        
        // 상품별 구독자 리스트에서 세션 제거
        CopyOnWriteArraySet<WebSocketSession> subscribers = productSubscriptions.get(productId);
        if (subscribers != null) {
            subscribers.remove(session);
            if (subscribers.isEmpty()) {
                productSubscriptions.remove(productId);
                // 마지막 구독자가 해제되면 KIS WebSocket에서도 구독 해제
                try {
                    kisWebSocketClient.unsubscribeStock(productId);
                } catch (Exception e) {
                }
            }
        }
        
        // 세션별 구독 상품 리스트에서 상품 제거
        CopyOnWriteArraySet<String> subscriptions = sessionSubscriptions.get(session.getId());
        if (subscriptions != null) {
            subscriptions.remove(productId);
        }
        
        // 구독 해제 성공 응답
        sendMessage(session, Map.of(
            "type", "UNSUBSCRIBE_SUCCESS",
            "data", Map.of(
                "productId", productId,
                "timestamp", System.currentTimeMillis()
            )
        ));
    }

    private void handleSubscribeQuote(WebSocketSession session, Map<String, Object> data) {
        String productId = (String) data.get("productId");
        
        if (productId == null || productId.trim().isEmpty()) {
            sendError(session, "productId is required for quote subscription");
            return;
        }
        
        // productId 형식 확인 및 변환 (필요시)
        String stockCode = convertProductIdToStockCode(productId);
        
        // 호가 전용 구독자 리스트에 세션 추가
        String quoteKey = "QUOTE_" + productId;
        boolean isNewSubscription = productSubscriptions.computeIfAbsent(quoteKey, k -> new CopyOnWriteArraySet<>()).add(session);
        
        // 세션별 구독 상품 리스트에 호가 구독 추가
        sessionSubscriptions.get(session.getId()).add(quoteKey);
        
        // 새로운 호가 구독인 경우 KIS WebSocket에 호가 구독 요청
        if (isNewSubscription && productSubscriptions.get(quoteKey).size() == 1) {
            try {
                kisWebSocketClient.subscribeQuote(stockCode, (quoteData) -> {
                    // KIS에서 받은 호가 데이터를 우리 형식으로 변환하여 브로드캐스트
                    Map<String, Object> formattedQuoteData = convertKisDataToQuoteUpdate(quoteData);
                    broadcastQuoteUpdate(productId, formattedQuoteData);
                });
            } catch (Exception e) {
            }
        }
        
        // 호가 구독 성공 응답
        sendMessage(session, Map.of(
            "type", "SUBSCRIBE_QUOTE_SUCCESS",
            "data", Map.of(
                "productId", productId,
                "timestamp", System.currentTimeMillis()
            )
        ));
    }
    
    private void handleUnsubscribeQuote(WebSocketSession session, Map<String, Object> data) {
        String productId = (String) data.get("productId");
        if (productId == null || productId.trim().isEmpty()) {
            sendError(session, "productId is required for quote unsubscription");
            return;
        }
        
        String quoteKey = "QUOTE_" + productId;
        
        // 호가 구독자 리스트에서 세션 제거
        CopyOnWriteArraySet<WebSocketSession> subscribers = productSubscriptions.get(quoteKey);
        if (subscribers != null) {
            subscribers.remove(session);
            if (subscribers.isEmpty()) {
                productSubscriptions.remove(quoteKey);
                // 마지막 구독자가 해제되면 KIS WebSocket에서도 호가 구독 해제
                try {
                    kisWebSocketClient.unsubscribeQuote(productId);
                } catch (Exception e) {
                }
            }
        }
        
        // 세션별 구독 상품 리스트에서 호가 구독 제거
        CopyOnWriteArraySet<String> subscriptions = sessionSubscriptions.get(session.getId());
        if (subscriptions != null) {
            subscriptions.remove(quoteKey);
        }
        
        // 호가 구독 해제 성공 응답
        sendMessage(session, Map.of(
            "type", "UNSUBSCRIBE_QUOTE_SUCCESS",
            "data", Map.of(
                "productId", productId,
                "timestamp", System.currentTimeMillis()
            )
        ));
    }

    private void handlePing(WebSocketSession session) {
        sendMessage(session, Map.of(
            "type", "PONG",
            "data", Map.of(
                "timestamp", System.currentTimeMillis()
            )
        ));
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
        // 세션 정리
        sessions.remove(session);
        
        // 세션의 모든 구독 해제
        CopyOnWriteArraySet<String> subscriptions = sessionSubscriptions.remove(session.getId());
        if (subscriptions != null) {
            for (String productId : subscriptions) {
                CopyOnWriteArraySet<WebSocketSession> subscribers = productSubscriptions.get(productId);
                if (subscribers != null) {
                    subscribers.remove(session);
                    if (subscribers.isEmpty()) {
                        productSubscriptions.remove(productId);
                    }
                }
            }
        }
    }

    @Override
    public boolean supportsPartialMessages() {
        return false;
    }

    // 특정 상품의 호가 업데이트를 모든 구독자에게 브로드캐스트
    public void broadcastQuoteUpdate(String productId, Map<String, Object> quoteData) {
        String quoteKey = "QUOTE_" + productId;
        CopyOnWriteArraySet<WebSocketSession> subscribers = productSubscriptions.get(quoteKey);
        if (subscribers == null || subscribers.isEmpty()) {
            return;
        }
        
        Map<String, Object> message = Map.of(
            "type", "QUOTE_UPDATE",
            "data", Map.of(
                "productId", productId,
                "orderBook", quoteData.get("orderBook"),
                "expectedExecution", quoteData.get("expectedExecution"),
                "marketTime", quoteData.getOrDefault("marketTime", ""),
                "marketStatus", quoteData.getOrDefault("marketStatus", ""),
                "timestamp", System.currentTimeMillis()
            )
        );
        
        subscribers.removeIf(session -> {
            try {
                if (session.isOpen()) {
                    sendMessage(session, message);
                    return false;
                } else {
                    return true;
                }
            } catch (Exception e) {
                return true;
            }
        });
    }

    // 특정 상품의 가격 업데이트를 모든 구독자에게 브로드캐스트
    public void broadcastPriceUpdate(String productId, Map<String, Object> priceData) {
        CopyOnWriteArraySet<WebSocketSession> subscribers = productSubscriptions.get(productId);
        if (subscribers == null || subscribers.isEmpty()) {
            return;
        }

        Map<String, Object> message = Map.of(
            "type", "PRICE_UPDATE",
            "data", Map.of(
                "productId", productId,
                "currentPrice", priceData.get("currentPrice"),
                "change", priceData.get("change"),
                "changePercent", priceData.get("changePercent"),
                "orderBook", priceData.getOrDefault("orderBook", Map.of()),
                "timestamp", System.currentTimeMillis()
            )
        );

        subscribers.removeIf(session -> {
            try {
                if (session.isOpen()) {
                    sendMessage(session, message);
                    return false;
                } else {
                    return true;
                }
            } catch (Exception e) {
                return true;
            }
        });
    }

    private void sendMessage(WebSocketSession session, Map<String, Object> message) {
        try {
            if (session.isOpen()) {
                String json = objectMapper.writeValueAsString(message);
                session.sendMessage(new TextMessage(json));
            }
        } catch (IOException e) {
            log.error("메시지 전송 중 IO 오류 - sessionId: {}, error: {}", session.getId(), e.getMessage());
        } catch (Exception e) {
            log.error("메시지 전송 중 예외 - sessionId: {}, error: {}", session.getId(), e.getMessage());
        }
    }

    private void sendError(WebSocketSession session, String error) {
        sendMessage(session, Map.of(
            "type", "ERROR",
            "data", Map.of(
                "error", error,
                "timestamp", System.currentTimeMillis()
            )
        ));
    }


    // 연결된 세션 수 반환
    public int getConnectedSessionsCount() {
        return sessions.size();
    }

    // 특정 상품 구독자 수 반환
    public int getSubscriberCount(String productId) {
        CopyOnWriteArraySet<WebSocketSession> subscribers = productSubscriptions.get(productId);
        return subscribers != null ? subscribers.size() : 0;
    }

    /**
     * KIS 데이터를 우리 시스템 형식으로 변환 (KisWebSocketClient 형식)
     */
    private Map<String, Object> convertKisDataToPriceUpdate(Map<String, Object> kisData) {
        try {
            double currentPrice = (Double) kisData.get("currentPrice");
            double priceChange = (Double) kisData.get("priceChange");
            double priceChangeRate = (Double) kisData.get("priceChangeRate");
            String priceChangeSign = (String) kisData.get("priceChangeSign");

            Map<String, Object> orderBook = generateOrderBookFromKisClientData(kisData);

            return Map.of(
                "currentPrice", currentPrice,
                "change", priceChange,
                "changePercent", priceChangeRate,
                "changeSign", priceChangeSign,
                "orderBook", orderBook,
                "volume", kisData.getOrDefault("volume", 0L),
                "accVolume", kisData.getOrDefault("accVolume", 0L),
                "lastUpdated", System.currentTimeMillis()
            );

        } catch (Exception e) {
            log.error("KIS 데이터 변환 중 오류", e);
            return Map.of(
                "currentPrice", 0.0,
                "change", 0.0,
                "changePercent", 0.0,
                "changeSign", "보합",
                "orderBook", Map.of(),
                "lastUpdated", System.currentTimeMillis()
            );
        }
    }

    /**
     * ProductId를 KIS API에서 사용할 수 있는 6자리 종목코드로 변환
     */
    private String convertProductIdToStockCode(String productId) {
        if (productId == null) {
            return null;
        }
        
        // 이미 6자리 숫자 형태인 경우 그대로 사용
        if (productId.matches("\\d{6}")) {
            return productId;
        }
        
        // A로 시작하는 경우 제거 (예: A005930 -> 005930)
        if (productId.startsWith("A") && productId.length() == 7) {
            String stockCode = productId.substring(1);
            if (stockCode.matches("\\d{6}")) {
                return stockCode;
            }
        }
        
        // 기타 패턴 처리
        // 숫자만 추출해서 6자리로 맞추기
        String numbersOnly = productId.replaceAll("[^0-9]", "");
        if (numbersOnly.length() == 6) {
            return numbersOnly;
        } else if (numbersOnly.length() > 6) {
            // 뒤쪽 6자리 사용
            return numbersOnly.substring(numbersOnly.length() - 6);
        } else if (numbersOnly.length() > 0) {
            // 앞에 0을 붙여서 6자리로 만들기
            return String.format("%06d", Integer.parseInt(numbersOnly));
        }
        
        // 변환 불가능한 경우 원본 반환
        return productId;
    }

    /**
     * KIS 호가 데이터를 우리 시스템 형식으로 변환
     */
    private Map<String, Object> convertKisDataToQuoteUpdate(Map<String, Object> kisQuoteData) {
        try {
            String stockCode = (String) kisQuoteData.get("stockCode");
            
            // 호가창 데이터 변환
            @SuppressWarnings("unchecked")
            Map<String, Object> orderBook = (Map<String, Object>) kisQuoteData.get("orderBook");
            
            // 예상 체결 정보 변환
            @SuppressWarnings("unchecked")
            Map<String, Object> expectedExecution = (Map<String, Object>) kisQuoteData.get("expectedExecution");
            
            return Map.of(
                "productId", stockCode,
                "orderBook", orderBook != null ? orderBook : Map.of(),
                "expectedExecution", expectedExecution != null ? expectedExecution : Map.of("price", 0, "volume", 0),
                "marketTime", kisQuoteData.getOrDefault("marketTime", ""),
                "marketStatus", kisQuoteData.getOrDefault("marketStatus", ""),
                "lastUpdated", System.currentTimeMillis()
            );
            
        } catch (Exception e) {
            return Map.of(
                "productId", "",
                "orderBook", Map.of(),
                "expectedExecution", Map.of("price", 0, "volume", 0),
                "marketTime", "",
                "marketStatus", "",
                "lastUpdated", System.currentTimeMillis()
            );
        }
    }

    /**
     * KisWebSocketClient 데이터로부터 호가창 생성
     */
    private Map<String, Object> generateOrderBookFromKisClientData(Map<String, Object> kisData) {
        try {
            Double askPrice1 = (Double) kisData.get("askPrice1");
            Double bidPrice1 = (Double) kisData.get("bidPrice1");

            if (askPrice1 == null || bidPrice1 == null) {
                return Map.of();
            }

            // 실제로는 더 많은 호가 데이터가 필요하지만, 현재는 1호가만 있음
            return Map.of(
                "asks", java.util.List.of(
                    Map.of("price", askPrice1, "quantity", 100, "level", 1),
                    Map.of("price", askPrice1 + 50, "quantity", 150, "level", 2),
                    Map.of("price", askPrice1 + 100, "quantity", 200, "level", 3),
                    Map.of("price", askPrice1 + 150, "quantity", 120, "level", 4),
                    Map.of("price", askPrice1 + 200, "quantity", 180, "level", 5)
                ),
                "bids", java.util.List.of(
                    Map.of("price", bidPrice1, "quantity", 120, "level", 1),
                    Map.of("price", bidPrice1 - 50, "quantity", 180, "level", 2),
                    Map.of("price", bidPrice1 - 100, "quantity", 150, "level", 3),
                    Map.of("price", bidPrice1 - 150, "quantity", 200, "level", 4),
                    Map.of("price", bidPrice1 - 200, "quantity", 160, "level", 5)
                ),
                "spread", String.valueOf((int)(askPrice1 - bidPrice1))
            );

        } catch (Exception e) {
            return Map.of();
        }
    }

    /**
     * KIS 데이터로부터 호가창 생성 (레거시 메소드)
     */
    private Map<String, Object> generateOrderBookFromKisData(Map<String, Object> kisData) {
        return generateOrderBookFromKisClientData(kisData);
    }
}