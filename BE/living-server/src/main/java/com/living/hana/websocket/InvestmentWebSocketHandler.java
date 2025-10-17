package com.living.hana.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.living.hana.client.HanaSecuritiesWebSocketClient;
import com.living.hana.dto.KisStockPriceDto;
import com.living.hana.entity.InvestmentProduct;
import com.living.hana.service.InvestmentProductService;
import com.living.hana.service.KoreaInvestmentApiService;
import com.living.hana.service.SecuritiesIntegrationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Component
public class InvestmentWebSocketHandler extends TextWebSocketHandler {
    
    private static final Logger logger = LoggerFactory.getLogger(InvestmentWebSocketHandler.class);
    private static final Logger log = logger;

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> userSubscriptions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final InvestmentProductService investmentProductService;
    private final KoreaInvestmentApiService koreaInvestmentApiService;
    private final HanaSecuritiesWebSocketClient securitiesWebSocketClient;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);
    private final Map<String, Double> currentPrices = new ConcurrentHashMap<>();
    private final Set<String> kisApiCallInProgress = ConcurrentHashMap.newKeySet();
    
    public InvestmentWebSocketHandler(InvestmentProductService investmentProductService, 
                                      KoreaInvestmentApiService koreaInvestmentApiService,
                                      SecuritiesIntegrationService securitiesIntegrationService,
                                      HanaSecuritiesWebSocketClient securitiesWebSocketClient) {
        this.investmentProductService = investmentProductService;
        this.koreaInvestmentApiService = koreaInvestmentApiService;
        this.securitiesWebSocketClient = securitiesWebSocketClient;
        initializePriceData();
        initializeSecuritiesWebSocketConnection();
        startRealtimeDataBroadcasting();
    }
    
    private void initializePriceData() {
        try {
            List<InvestmentProduct> products = investmentProductService.getAllProducts();
            for (InvestmentProduct product : products) {
                String productId = product.getProductId();
                String productCode = product.getProductCode();
                double currentPrice = product.getCurrentPrice().doubleValue();

                currentPrices.put(productId, currentPrice);

                if (productCode != null && !productCode.equals(productId)) {
                    currentPrices.put(productCode, currentPrice);
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void initializeSecuritiesWebSocketConnection() {
        try {
            securitiesWebSocketClient.connect();
        } catch (Exception ignored) {
        }
    }
    
    
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String token = extractTokenFromSession(session);
        if (token != null) {
            sessions.put(session.getId(), session);
            userSubscriptions.put(session.getId(), new HashSet<>());

            sendMessage(session, createMessage("CONNECTION", Map.of(
                "status", "connected",
                "timestamp", System.currentTimeMillis()
            )));
        } else {
            session.close(CloseStatus.NOT_ACCEPTABLE);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        cleanupSession(session.getId());
    }
    
    private void cleanupSession(String sessionId) {
        sessions.remove(sessionId);
        userSubscriptions.remove(sessionId);
    }
    
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            String payload = message.getPayload();

            if ("PING".equals(payload)) {
                session.sendMessage(new TextMessage("PONG"));
                return;
            }

            Map<String, Object> messageMap = objectMapper.readValue(payload, Map.class);
            String type = (String) messageMap.get("type");
            Map<String, Object> data = (Map<String, Object>) messageMap.get("data");
            
            switch (type) {
                case "SUBSCRIBE":
                    if (data != null && data.containsKey("productId")) {
                        String productId = (String) data.get("productId");
                        if (productId != null && !productId.trim().isEmpty() && !"null".equals(productId)) {
                            subscribeToProduct(session, productId);
                        } else {
                            sendMessage(session, createMessage("ERROR", Map.of(
                                "message", "유효하지 않은 productId입니다: " + productId,
                                "timestamp", System.currentTimeMillis()
                            )));
                        }
                    } else {
                        sendMessage(session, createMessage("ERROR", Map.of(
                            "message", "SUBSCRIBE 요청에 productId가 없습니다.",
                            "timestamp", System.currentTimeMillis()
                        )));
                    }
                    break;
                    
                case "UNSUBSCRIBE":
                    if (data != null && data.containsKey("productId")) {
                        String productId = (String) data.get("productId");
                        unsubscribeFromProduct(session, productId);
                    }
                    break;
                    
                case "SUBSCRIBE_QUOTE":
                    if (data != null && data.containsKey("productId")) {
                        String productId = (String) data.get("productId");

                        sendMessage(session, createMessage("SUBSCRIBE_QUOTE_SUCCESS", Map.of(
                            "productId", productId,
                            "status", "subscribed",
                            "timestamp", System.currentTimeMillis()
                        )));

                        subscribeToRealtimeQuote(session, productId);
                    } else {
                        sendMessage(session, createMessage("ERROR", Map.of(
                            "message", "SUBSCRIBE_QUOTE 요청에 productId가 없습니다.",
                            "timestamp", System.currentTimeMillis()
                        )));
                    }
                    break;
                    
                case "UNSUBSCRIBE_QUOTE":
                    if (data != null && data.containsKey("productId")) {
                        String productId = (String) data.get("productId");
                        unsubscribeFromRealtimeQuote(session, productId);
                    }
                    break;
                    
                case "SUBSCRIBE_PORTFOLIO":
                    subscribeToPortfolio(session);
                    break;
                    
                default:
            }
        } catch (Exception e) {
            sendMessage(session, createMessage("ERROR", Map.of("message", "메시지 처리 중 오류가 발생했습니다.")));
        }
    }
    
    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        cleanupSession(session.getId());
    }
    
    private String extractTokenFromSession(WebSocketSession session) {
        URI uri = session.getUri();
        if (uri != null) {
            String query = uri.getQuery();
            if (query != null) {
                String[] params = query.split("&");
                for (String param : params) {
                    if (param.startsWith("token=")) {
                        return java.net.URLDecoder.decode(param.substring(6), java.nio.charset.StandardCharsets.UTF_8);
                    }
                }
            }
        }
        return "mock-token";
    }
    
    private void subscribeToProduct(WebSocketSession session, String productId) {
        Set<String> subscriptions = userSubscriptions.get(session.getId());
        if (subscriptions != null) {
            subscriptions.add("PRODUCT_" + productId);

            try {
                if (!securitiesWebSocketClient.isConnected()) {
                    securitiesWebSocketClient.connect();

                    int retryCount = 0;
                    while (!securitiesWebSocketClient.isConnected() && retryCount < 30) {
                        Thread.sleep(100);
                        retryCount++;
                    }

                    if (!securitiesWebSocketClient.isConnected()) {
                        logger.warn("HanaSecurities WebSocket 연결 실패");
                    }
                }

                if (securitiesWebSocketClient.isConnected()) {
                    securitiesWebSocketClient.subscribeStock(productId, (priceData) -> {
                        Map<String, Object> convertedData = convertHanaSecuritiesData(productId, priceData);
                        String broadcastMessage = createMessage("PRICE_UPDATE", convertedData);
                        broadcastToSubscribers(productId, broadcastMessage);
                    });
                } else {
                    callKisApiFallback(session, productId);
                }

            } catch (Exception e) {
                logger.warn("HanaSecurities WebSocket 구독 예외: productId={}, error={}", productId, e.getMessage());
                callKisApiFallback(session, productId);
            }
        }
    }
    
    private void unsubscribeFromProduct(WebSocketSession session, String productId) {
        Set<String> subscriptions = userSubscriptions.get(session.getId());
        if (subscriptions != null) {
            subscriptions.remove("PRODUCT_" + productId);

            boolean hasOtherSubscribers = false;
            for (Set<String> otherSubscriptions : userSubscriptions.values()) {
                if (otherSubscriptions.contains("PRODUCT_" + productId)) {
                    hasOtherSubscribers = true;
                    break;
                }
            }

            if (!hasOtherSubscribers) {
                try {
                    securitiesWebSocketClient.unsubscribeStock(productId);
                } catch (Exception ignored) {
                }
            }
        }
    }
    
    private void subscribeToPortfolio(WebSocketSession session) {
        Set<String> subscriptions = userSubscriptions.get(session.getId());
        if (subscriptions != null) {
            subscriptions.add("PORTFOLIO");
            sendPortfolioUpdate(session);
        }
    }

    private void subscribeToRealtimeQuote(WebSocketSession session, String productId) {
        Set<String> subscriptions = userSubscriptions.get(session.getId());
        if (subscriptions != null) {
            subscriptions.add("QUOTE_" + productId);

            try {
                sendKisQuoteData(session, productId);
            } catch (Exception e) {
                sendMessage(session, createMessage("ERROR", Map.of(
                    "message", "호가 데이터를 불러올 수 없습니다: " + e.getMessage(),
                    "productId", productId,
                    "timestamp", System.currentTimeMillis()
                )));
            }
        }
    }

    private void unsubscribeFromRealtimeQuote(WebSocketSession session, String productId) {
        Set<String> subscriptions = userSubscriptions.get(session.getId());
        if (subscriptions != null) {
            subscriptions.remove("QUOTE_" + productId);

            boolean hasOtherQuoteSubscribers = false;
            for (Set<String> otherSubscriptions : userSubscriptions.values()) {
                if (otherSubscriptions.contains("QUOTE_" + productId)) {
                    hasOtherQuoteSubscribers = true;
                    break;
                }
            }

            if (!hasOtherQuoteSubscribers) {
                try {
                    securitiesWebSocketClient.unsubscribeQuote(productId);
                } catch (Exception ignored) {
                }
            }
        }
    }

    private void startRealtimeDataBroadcasting() {
        scheduler.scheduleWithFixedDelay(() -> {
            try {
                broadcastRealtimeUpdates();
            } catch (Exception ignored) {
            }
        }, 10, 10, TimeUnit.SECONDS);
    }

    private void broadcastRealtimeUpdates() {
        if (sessions.isEmpty()) {
            return;
        }

        Set<String> allSubscribedProducts = new HashSet<>();
        for (Set<String> subscriptions : userSubscriptions.values()) {
            for (String subscription : subscriptions) {
                if (subscription.startsWith("PRODUCT_")) {
                    String productId = subscription.substring(8);
                    allSubscribedProducts.add(productId);
                }
            }
        }
        
        if (allSubscribedProducts.isEmpty()) {
            return;
        }
        
        if (!securitiesWebSocketClient.isConnected()) {
            try {
                securitiesWebSocketClient.connect();

                int retryCount = 0;
                while (!securitiesWebSocketClient.isConnected() && retryCount < 20) {
                    Thread.sleep(100);
                    retryCount++;
                }

                if (securitiesWebSocketClient.isConnected()) {
                    for (String productId : allSubscribedProducts) {
                        try {
                            securitiesWebSocketClient.subscribeStock(productId, (priceData) -> {
                                String broadcastMessage = createMessage("PRICE_UPDATE", priceData);
                                broadcastToSubscribers(productId, broadcastMessage);
                            });
                        } catch (Exception e) {
                            logger.warn("재구독 실패: productId={}, error={}", productId, e.getMessage());
                        }
                    }
                } else {
                    for (String productId : allSubscribedProducts) {
                        try {
                            KisStockPriceDto kisData = koreaInvestmentApiService.getStockPrice(productId, "J");

                            if (kisData != null) {
                                Map<String, Object> formattedData = convertKisDataToPriceUpdateFixed(productId, kisData);
                                String broadcastMessage = createMessage("PRICE_UPDATE", formattedData);
                                broadcastToSubscribers(productId, broadcastMessage);
                            }
                        } catch (Exception ignored) {
                        }
                    }
                }

            } catch (Exception e) {
                logger.warn("HanaSecurities WebSocket 재연결 실패: {}", e.getMessage());
            }
        }
    }

    private Map<String, Object> convertKisDataToPriceUpdateFixed(String productId, KisStockPriceDto kisData) {
        double currentPrice = parseDoubleFromKisData(kisData.getStck_prpr(), 0);
        double change = parseDoubleFromKisData(kisData.getPrdy_vrss(), 0);
        double changePercent = parseDoubleFromKisData(kisData.getPrdy_ctrt(), 0);

        String sign = kisData.getPrdy_vrss_sign();
        if ("5".equals(sign)) {
            change = -change;
            changePercent = -changePercent;
        }

        Map<String, Object> orderBook = convertKisDataToOrderBook(kisData);
        currentPrices.put(productId, currentPrice);

        return Map.of(
            "productId", productId,
            "currentPrice", currentPrice,
            "change", change,
            "changePercent", changePercent,
            "orderBook", orderBook,
            "status", "REALTIME",
            "timestamp", System.currentTimeMillis()
        );
    }


    private void broadcastToSubscribers(String productId, String message) {
        String subscriptionKey = "PRODUCT_" + productId;
        List<String> deadSessions = new ArrayList<>();
        int successCount = 0;
        
        for (Map.Entry<String, Set<String>> entry : userSubscriptions.entrySet()) {
            String sessionId = entry.getKey();
            Set<String> subscriptions = entry.getValue();
            
            if (subscriptions.contains(subscriptionKey)) {
                WebSocketSession session = sessions.get(sessionId);
                if (session != null && session.isOpen()) {
                    try {
                        sendMessage(session, message);
                        successCount++;
                    } catch (Exception e) {
                        deadSessions.add(sessionId);
                    }
                } else {
                    deadSessions.add(sessionId);
                }
            }
        }

        for (String deadSessionId : deadSessions) {
            cleanupSession(deadSessionId);
        }

        if (successCount > 0) {
        }
    }

    private void sendPriceUpdate(WebSocketSession session, String productId, double currentPrice, double change, double changePercent) {
        Map<String, Object> orderBook = generateOrderBook(currentPrice);

        Map<String, Object> priceData = Map.of(
            "productId", productId,
            "currentPrice", Math.round(currentPrice * 100.0) / 100.0,
            "change", Math.round(change * 100.0) / 100.0,
            "changePercent", Math.round(changePercent * 100.0) / 100.0,
            "orderBook", orderBook,
            "timestamp", System.currentTimeMillis()
        );

        sendMessage(session, createMessage("PRICE_UPDATE", priceData));
    }

    private void sendPriceOnlyUpdate(WebSocketSession session, String productId, double currentPrice) {
        Map<String, Object> orderBook = generateOrderBook(currentPrice);

        Map<String, Object> priceData = Map.of(
            "productId", productId,
            "currentPrice", Math.round(currentPrice * 100.0) / 100.0,
            "orderBook", orderBook,
            "status", "PRICE_ONLY",
            "timestamp", System.currentTimeMillis()
        );

        sendMessage(session, createMessage("PRICE_UPDATE", priceData));
    }
    
    private Map<String, Object> generateOrderBook(double currentPrice) {
        List<Map<String, Object>> asks = new ArrayList<>();
        List<Map<String, Object>> bids = new ArrayList<>();

        for (int i = 1; i <= 5; i++) {
            double askPrice = currentPrice + (i * 100);
            int askQuantity = 200;
            asks.add(Map.of(
                "price", Math.round(askPrice),
                "quantity", askQuantity,
                "level", i
            ));
        }

        for (int i = 1; i <= 5; i++) {
            double bidPrice = currentPrice - (i * 100);
            int bidQuantity = 200;
            bids.add(Map.of(
                "price", Math.round(bidPrice),
                "quantity", bidQuantity,
                "level", i
            ));
        }

        return Map.of(
            "asks", asks,
            "bids", bids,
            "spread", asks.get(0).get("price") + " - " + bids.get(0).get("price")
        );
    }
    
    private void sendPortfolioUpdate(WebSocketSession session) {
        Map<String, Object> portfolioData = Map.of(
            "totalValue", 1500000,
            "totalProfitLoss", 75000,
            "totalProfitLossRate", 5.0,
            "positions", List.of(
                Map.of("productId", "395400", "currentValue", 400000, "profitLoss", 35000, "profitLossRate", 9.6),
                Map.of("productId", "338100", "currentValue", 350000, "profitLoss", 25000, "profitLossRate", 7.7),
                Map.of("productId", "293940", "currentValue", 400000, "profitLoss", 15000, "profitLossRate", 3.9),
                Map.of("productId", "330590", "currentValue", 350000, "profitLoss", 0, "profitLossRate", 0.0)
            ),
            "timestamp", System.currentTimeMillis()
        );

        sendMessage(session, createMessage("PORTFOLIO_UPDATE", portfolioData));
    }

    private void broadcast(String message) {
        List<String> deadSessions = new ArrayList<>();
        int successCount = 0;
        
        for (WebSocketSession session : sessions.values()) {
            if (session != null && session.isOpen()) {
                try {
                    sendMessage(session, message); // 개선된 sendMessage 메서드 사용
                    successCount++;
                } catch (Exception e) {
                    deadSessions.add(session.getId());
                }
            } else {
                String sessionId = (session != null) ? session.getId() : "unknown";
                deadSessions.add(sessionId);
            }
        }
        
        // 죽은 세션 정리
        for (String sessionId : deadSessions) {
            cleanupSession(sessionId);
        }
        
        if (successCount > 0) {
        }
    }
    
    private void sendMessage(WebSocketSession session, String message) {
        if (session == null) {
            return;
        }
        
        String sessionId = session.getId();
        
        if (!session.isOpen()) {
            cleanupSession(sessionId);
            return;
        }
        
        try {
            synchronized (session) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(message));
                }
            }
        } catch (IOException e) {
            // 연결 관련 예외는 DEBUG로, 다른 예외는 WARN으로 처리
            String exceptionType = e.getClass().getSimpleName();
            if (exceptionType.contains("Broken") || 
                exceptionType.contains("Connection") || 
                exceptionType.contains("EOF")) {
            } else {
            }
            cleanupSession(sessionId);
        } catch (Exception e) {
            cleanupSession(sessionId);
        }
    }

    /**
     * KIS API를 사용한 호가 데이터 전송 (HanaSecurities 대체용)
     */
    private void sendKisQuoteData(WebSocketSession session, String productId) throws Exception {
        KisStockPriceDto kisData = koreaInvestmentApiService.getStockPrice(productId, "J");

        if (kisData != null) {

            // KIS API 응답을 호가창 포맷으로 변환
            Map<String, Object> orderBook = convertKisDataToOrderBook(kisData);

            // 현재가 정보 안전한 파싱
            double currentPrice = parseDoubleFromKisData(kisData.getStck_prpr(), 0);

            // 호가 업데이트 메시지 생성 (QUOTE_UPDATE 형태)
            Map<String, Object> quoteData = Map.of(
                "productId", productId,
                "orderBook", orderBook,
                "expectedExecution", Map.of(
                    "price", 0, // KIS API에서는 예상체결 정보 미제공
                    "volume", 0
                ),
                "marketTime", "",
                "marketStatus", "TRADING",
                "timestamp", System.currentTimeMillis()
            );

            String messageToSend = createMessage("QUOTE_UPDATE", quoteData);

            sendMessage(session, messageToSend);

        } else {
            sendMessage(session, createMessage("ERROR", Map.of("message", "호가 데이터 수신 실패")));
        }
    }

    /**
     * KIS API 데이터를 WebSocket 호가창 포맷으로 변환
     */
    private Map<String, Object> convertKisDataToOrderBook(KisStockPriceDto kisData) {
        List<Map<String, Object>> asks = new ArrayList<>(); // 매도 호가
        List<Map<String, Object>> bids = new ArrayList<>(); // 매수 호가
        
        // 매도 호가 1~10단계 - null 체크 강화
        String[] askPrices = {
            kisData.getAskp1(), kisData.getAskp2(), kisData.getAskp3(), 
            kisData.getAskp4(), kisData.getAskp5(), kisData.getAskp6(),
            kisData.getAskp7(), kisData.getAskp8(), kisData.getAskp9(),
            kisData.getAskp10()
        };
        String[] askQtys = {
            kisData.getAskp_rsqn1(), kisData.getAskp_rsqn2(), kisData.getAskp_rsqn3(), 
            kisData.getAskp_rsqn4(), kisData.getAskp_rsqn5(), kisData.getAskp_rsqn6(),
            kisData.getAskp_rsqn7(), kisData.getAskp_rsqn8(), kisData.getAskp_rsqn9(),
            kisData.getAskp_rsqn10()
        };
        
        int totalAskVolume = 0;
        for (int i = 0; i < 10; i++) {
            try {
                if (askPrices[i] != null && askQtys[i] != null && 
                    !askPrices[i].trim().isEmpty() && !askQtys[i].trim().isEmpty()) {
                    
                    int price = parseIntFromString(askPrices[i], 0);
                    int volume = parseIntFromString(askQtys[i], 0);
                    
                    if (price > 0) {  // 가격이 있으면 수량이 0이어도 표시
                        asks.add(Map.of(
                            "price", price,
                            "volume", volume,
                            "level", i + 1
                        ));
                        totalAskVolume += volume;
                        
                    }
                }
            } catch (Exception ignored) {
            }
        }
        
        // 매수 호가 1~10단계
        String[] bidPrices = {
            kisData.getBidp1(), kisData.getBidp2(), kisData.getBidp3(), 
            kisData.getBidp4(), kisData.getBidp5(), kisData.getBidp6(),
            kisData.getBidp7(), kisData.getBidp8(), kisData.getBidp9(),
            kisData.getBidp10()
        };
        String[] bidQtys = {
            kisData.getBidp_rsqn1(), kisData.getBidp_rsqn2(), kisData.getBidp_rsqn3(), 
            kisData.getBidp_rsqn4(), kisData.getBidp_rsqn5(), kisData.getBidp_rsqn6(),
            kisData.getBidp_rsqn7(), kisData.getBidp_rsqn8(), kisData.getBidp_rsqn9(),
            kisData.getBidp_rsqn10()
        };
        
        int totalBidVolume = 0;
        for (int i = 0; i < 10; i++) {
            try {
                if (bidPrices[i] != null && bidQtys[i] != null && 
                    !bidPrices[i].trim().isEmpty() && !bidQtys[i].trim().isEmpty()) {
                    
                    int price = parseIntFromString(bidPrices[i], 0);
                    int volume = parseIntFromString(bidQtys[i], 0);
                    
                    if (price > 0) {  // 가격이 있으면 수량이 0이어도 표시
                        bids.add(Map.of(
                            "price", price,
                            "volume", volume,
                            "level", i + 1
                        ));
                        totalBidVolume += volume;
                        
                    }
                }
            } catch (Exception ignored) {
            }
        }
        
        // 호가 스프레드 계산
        String spread = "데이터 없음";
        if (!asks.isEmpty() && !bids.isEmpty()) {
            int topAsk = (Integer) asks.get(0).get("price");
            int topBid = (Integer) bids.get(0).get("price");
            int spreadValue = topAsk - topBid;
            spread = spreadValue + "원 (" + String.format("%.2f", (spreadValue * 100.0 / topBid)) + "%)";
        }
        
        return Map.of(
            "asks", asks,
            "bids", bids,
            "spread", spread,
            "totalAskVolume", totalAskVolume,
            "totalBidVolume", totalBidVolume
        );
    }
    
    private String createMessage(String type, Object data) {
        try {
            Map<String, Object> message = Map.of(
                "type", type,
                "data", data,
                "timestamp", System.currentTimeMillis()
            );
            return objectMapper.writeValueAsString(message);
        } catch (Exception e) {
            return "{\"type\":\"ERROR\",\"data\":{\"message\":\"메시지 생성 실패\"}}";
        }
    }
    
    private double parseDoubleFromObject(Object value) {
        if (value == null) return 0.0;
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        try {
            return Double.parseDouble(value.toString().trim());
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }
    
    /**
     * KIS API 데이터를 안전하게 파싱하는 메서드
     */
    private double parseDoubleFromKisData(String value, double defaultValue) {
        if (value == null || value.trim().isEmpty() || "null".equals(value)) {
            return defaultValue;
        }
        
        try {
            return Double.parseDouble(value.trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private Map<String, Object> convertHanaSecuritiesData(String productId, Map<String, Object> securitiesData) {
        try {
            Double currentPrice = parseDoubleFromObject(securitiesData.get("currentPrice"));
            Double priceChange = parseDoubleFromObject(securitiesData.get("priceChange"));
            Double priceChangeRate = parseDoubleFromObject(securitiesData.get("priceChangeRate"));

            Map<String, Object> orderBook = generateOrderBook(currentPrice != null ? currentPrice : 0);

            return Map.of(
                "productId", productId,
                "currentPrice", currentPrice != null ? currentPrice : 0,
                "change", priceChange != null ? priceChange : 0,
                "changePercent", priceChangeRate != null ? priceChangeRate : 0,
                "orderBook", orderBook,
                "status", "REALTIME",
                "timestamp", System.currentTimeMillis()
            );

        } catch (Exception e) {
            logger.error("데이터 변환 실패: productId={}", productId, e);
            return Map.of(
                "productId", productId,
                "currentPrice", 0,
                "change", 0,
                "changePercent", 0,
                "orderBook", generateOrderBook(0),
                "status", "ERROR",
                "timestamp", System.currentTimeMillis()
            );
        }
    }
    
    /**
     * 문자열을 정수로 안전하게 변환
     */
    private int parseIntFromString(String value, int defaultValue) {
        if (value == null || value.trim().isEmpty() || "null".equals(value)) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }


    private void callKisApiFallback(WebSocketSession session, String productId) {
        String fallbackKey = "FALLBACK_" + productId;

        if (kisApiCallInProgress.contains(fallbackKey)) {
            return;
        }

        kisApiCallInProgress.add(fallbackKey);

        try {
            KisStockPriceDto kisData = koreaInvestmentApiService.getStockPrice(productId, "J");
            if (kisData != null) {
                Map<String, Object> formattedData = convertKisDataToPriceUpdateFixed(productId, kisData);
                sendMessage(session, createMessage("PRICE_UPDATE", formattedData));
            }
        } catch (Exception e) {
            Double currentPrice = currentPrices.get(productId);
            if (currentPrice != null) {
                sendPriceOnlyUpdate(session, productId, currentPrice);
            }
        } finally {
            kisApiCallInProgress.remove(fallbackKey);
        }
    }
}