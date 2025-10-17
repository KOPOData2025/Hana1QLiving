package com.hana.securities.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.function.Consumer;

@Component
@Slf4j
@RequiredArgsConstructor
public class KisWebSocketClient {

    private final ObjectMapper objectMapper;
    private final com.hana.securities.service.KisWebSocketAuthService authService;

    @Value("${kis.websocket.url:ws://ops.koreainvestment.com:31000}")
    private String kisWebSocketUrl;

    @Value("${kis.api.app-key:}")
    private String appKey;

    @Value("${kis.api.app-secret:}")
    private String appSecret;

    private WebSocketClient webSocketClient;
    private boolean isConnected = false;
    private String aesKey;
    private String aesIv;
    
    // 연결 중복 방지를 위한 락
    private final Object connectionLock = new Object();

    // 구독된 종목들과 콜백 함수들을 저장
    private final Map<String, CopyOnWriteArraySet<Consumer<Map<String, Object>>>> subscribers = new ConcurrentHashMap<>();

    /**
     * WebSocket 연결 (싱글톤 패턴)
     */
    public void connect() {
        synchronized (connectionLock) {
            if (isConnected && webSocketClient != null && webSocketClient.isOpen()) {
                return;
            }

            try {
                URI serverUri = new URI(kisWebSocketUrl);
                
                webSocketClient = new WebSocketClient(serverUri) {
                @Override
                public void onOpen(ServerHandshake handshake) {
                    isConnected = true;
                    KisWebSocketClient.log.info("KIS WebSocket 연결 성공: {}", kisWebSocketUrl);
                }

                @Override
                public void onMessage(String message) {
                    KisWebSocketClient.log.info("KIS WebSocket 메시지 수신 - 길이: {}, 내용: {}", message.length(), message);
                    handleKisMessage(message);
                }

                @Override
                public void onClose(int code, String reason, boolean remote) {
                    isConnected = false;
                    KisWebSocketClient.log.warn("KIS WebSocket 연결 종료: code={}, reason={}, remote={}", code, reason, remote);
                    
                    // 재연결 시도
                    if (code != 1000) { // 정상 종료가 아닌 경우
                        scheduleReconnect();
                    }
                }

                @Override
                public void onError(Exception ex) {
                    KisWebSocketClient.log.error("KIS WebSocket 오류 발생: {}", ex.getMessage(), ex);
                }
            };

            webSocketClient.connect();
            
            } catch (Exception e) {
                throw new RuntimeException("KIS WebSocket 연결 실패", e);
            }
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
    public void subscribeStock(String stockCode, Consumer<Map<String, Object>> callback) {
        // 연결 확인 및 필요시 연결
        if (!isConnected || webSocketClient == null || !webSocketClient.isOpen()) {
            connect();
            
            // 연결 완료 대기 (최대 3초)
            int retries = 30;
            while (retries > 0 && (!isConnected || webSocketClient == null || !webSocketClient.isOpen())) {
                try {
                    Thread.sleep(100);
                    retries--;
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("WebSocket 연결 대기 중 인터럽트", e);
                }
            }
            
            if (!isConnected || webSocketClient == null || !webSocketClient.isOpen()) {
                throw new RuntimeException("KIS WebSocket 연결에 실패했습니다");
            }
        }

        // 콜백 함수 등록
        subscribers.computeIfAbsent(stockCode, k -> new CopyOnWriteArraySet<>()).add(callback);

        try {
            // 동적으로 접속키 발급
            log.info("WebSocket 접속키 요청 시작 - 종목: {}", stockCode);
            String currentApprovalKey = authService.getWebSocketApprovalKey();
            if (currentApprovalKey == null || currentApprovalKey.isEmpty()) {
                log.error("WebSocket 접속키 발급 실패 - 종목: {}", stockCode);
                throw new RuntimeException("WebSocket 접속키를 가져올 수 없습니다.");
            }
            log.info("WebSocket 접속키 발급 성공 - 종목: {}, 키 길이: {}", stockCode, currentApprovalKey.length());

            // 구독 메시지 생성 (KIS 공식 API 형식 - body 안에 input)
            Map<String, Object> header = Map.of(
                "approval_key", currentApprovalKey,
                "custtype", "P", // 개인
                "tr_type", "1", // 등록
                "content-type", "utf-8"
            );

            Map<String, Object> input = Map.of(
                "tr_id", "H0STCNT0", // 실시간 주식 체결가
                "tr_key", stockCode
            );

            Map<String, Object> body = Map.of(
                "input", input
            );

            Map<String, Object> message = Map.of(
                "header", header,
                "body", body
            );

            String jsonMessage = objectMapper.writeValueAsString(message);
            log.info("KIS WebSocket 구독 메시지 전송 - 종목: {}, 메시지: {}", stockCode, jsonMessage);
            
            if (webSocketClient != null && webSocketClient.isOpen()) {
                webSocketClient.send(jsonMessage);
                log.info("KIS WebSocket 구독 메시지 전송 완료 - 종목: {}", stockCode);
            } else {
                log.warn("KIS WebSocket이 연결되지 않아 구독 메시지 전송 실패 - 종목: {}", stockCode);
            }
            
        } catch (Exception e) {
            log.error("KIS WebSocket 구독 중 오류 발생 - 종목: {}, 오류: {}", stockCode, e.getMessage(), e);
        }
    }

    /**
     * 종목 호가 실시간 구독 (H0STASP0)
     */
    public void subscribeQuote(String stockCode, Consumer<Map<String, Object>> callback) {
        // 연결 확인 및 필요시 연결
        if (!isConnected || webSocketClient == null || !webSocketClient.isOpen()) {
            connect();
            
            // 연결 완료 대기 (최대 3초)
            int retries = 30;
            while (retries > 0 && (!isConnected || webSocketClient == null || !webSocketClient.isOpen())) {
                try {
                    Thread.sleep(100);
                    retries--;
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("WebSocket 연결 대기 중 인터럽트", e);
                }
            }
            
            if (!isConnected || webSocketClient == null || !webSocketClient.isOpen()) {
                throw new RuntimeException("KIS WebSocket 연결에 실패했습니다");
            }
        }

        // 호가 전용 콜백 함수 등록 (구분을 위해 prefix 사용)
        String quoteKey = "QUOTE_" + stockCode;
        subscribers.computeIfAbsent(quoteKey, k -> new CopyOnWriteArraySet<>()).add(callback);

        try {
            // 동적으로 접속키 발급
            String currentApprovalKey = authService.getWebSocketApprovalKey();
            if (currentApprovalKey == null || currentApprovalKey.isEmpty()) {
                throw new RuntimeException("WebSocket 접속키를 가져올 수 없습니다.");
            }

            // 호가 구독 메시지 생성 (KIS 공식 API 형식 - body 안에 input)
            Map<String, Object> header = Map.of(
                "approval_key", currentApprovalKey,
                "custtype", "P", // 개인
                "tr_type", "1", // 등록
                "content-type", "utf-8"
            );

            Map<String, Object> input = Map.of(
                "tr_id", "H0STASP0", // 실시간 주식 호가
                "tr_key", stockCode
            );

            Map<String, Object> body = Map.of(
                "input", input
            );

            Map<String, Object> message = Map.of(
                "header", header,
                "body", body
            );

            String jsonMessage = objectMapper.writeValueAsString(message);
            
            if (webSocketClient != null && webSocketClient.isOpen()) {
                webSocketClient.send(jsonMessage);
            }
            
        } catch (Exception e) {
        }
    }

    /**
     * 종목 호가 구독 해제
     */
    public void unsubscribeQuote(String stockCode) {
        String quoteKey = "QUOTE_" + stockCode;
        subscribers.remove(quoteKey);

        try {
            // 동적으로 접속키 가져오기
            String currentApprovalKey = authService.getWebSocketApprovalKey();
            if (currentApprovalKey == null || currentApprovalKey.isEmpty()) {
                return;
            }

            // 호가 구독 해제 메시지 생성 (KIS 공식 API 형식 - body 안에 input)
            Map<String, Object> header = Map.of(
                "approval_key", currentApprovalKey,
                "custtype", "P",
                "tr_type", "2", // 해제
                "content-type", "utf-8"
            );

            Map<String, Object> input = Map.of(
                "tr_id", "H0STASP0",
                "tr_key", stockCode
            );

            Map<String, Object> body = Map.of(
                "input", input
            );

            Map<String, Object> message = Map.of(
                "header", header,
                "body", body
            );

            String jsonMessage = objectMapper.writeValueAsString(message);
            
            if (webSocketClient != null && webSocketClient.isOpen()) {
                webSocketClient.send(jsonMessage);
            }
            
        } catch (Exception e) {
        }
    }

    /**
     * 종목 구독 해제
     */
    public void unsubscribeStock(String stockCode) {
        subscribers.remove(stockCode);

        try {
            // 동적으로 접속키 가져오기
            String currentApprovalKey = authService.getWebSocketApprovalKey();
            if (currentApprovalKey == null || currentApprovalKey.isEmpty()) {
                return;
            }

            // 구독 해제 메시지 생성 (KIS 공식 API 형식 - body 안에 input)
            Map<String, Object> header = Map.of(
                "approval_key", currentApprovalKey,
                "custtype", "P",
                "tr_type", "2", // 해제
                "content-type", "utf-8"
            );

            Map<String, Object> input = Map.of(
                "tr_id", "H0STCNT0",
                "tr_key", stockCode
            );

            Map<String, Object> body = Map.of(
                "input", input
            );

            Map<String, Object> message = Map.of(
                "header", header,
                "body", body
            );

            String jsonMessage = objectMapper.writeValueAsString(message);
            
            if (webSocketClient != null && webSocketClient.isOpen()) {
                webSocketClient.send(jsonMessage);
            }
            
        } catch (Exception e) {
        }
    }

    /**
     * KIS WebSocket 메시지 처리
     */
    private void handleKisMessage(String message) {
        try {
            log.info("KIS 메시지 처리 시작 - 메시지 타입: {}", message.startsWith("{") ? "JSON" : "실시간 데이터");

            // JSON 응답인지 확인 (구독 성공 응답)
            if (message.startsWith("{")) {
                log.info("JSON 구독 응답 처리 중");
                handleSubscriptionResponse(message);
                return;
            }

            // 실시간 데이터 형식: 0|H0STCNT0|001|005930^123929^73100^...
            String[] parts = message.split("\\|", 4);
            log.info("실시간 데이터 파싱 - 파트 수: {}", parts.length);
            if (parts.length < 4) {
                log.warn("실시간 데이터 파트 수 부족 - 예상: 4, 실제: {}", parts.length);
                return;
            }

            String encryptionFlag = parts[0];
            String trId = parts[1];
            String dataCount = parts[2];
            String data = parts[3];
            
            log.info("실시간 데이터 분석 - 암호화: {}, TR_ID: {}, 데이터 수: {}, 데이터 길이: {}", 
                    encryptionFlag, trId, dataCount, data.length());

            // 암호화된 데이터 복호화
            if ("1".equals(encryptionFlag) && aesKey != null && aesIv != null) {
                log.info("데이터 복호화 시작");
                data = decryptAes(data);
                log.info("데이터 복호화 완료 - 길이: {}", data.length());
            }

            // 데이터 파싱 및 콜백 호출
            if ("H0STCNT0".equals(trId)) {
                log.info("주식 체결 데이터 파싱 시작");
                parseAndNotifyStockData(data);
            } else if ("H0STASP0".equals(trId)) {
                log.info("주식 호가 데이터 파싱 시작");
                parseAndNotifyQuoteData(data);
            } else {
                log.warn("알 수 없는 TR_ID: {}", trId);
            }

        } catch (Exception e) {
            log.error("KIS 메시지 처리 중 오류 발생: {}", e.getMessage(), e);
        }
    }

    /**
     * 구독 응답 처리 (AES 키/IV 추출)
     */
    private void handleSubscriptionResponse(String jsonMessage) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = objectMapper.readValue(jsonMessage, Map.class);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> body = (Map<String, Object>) response.get("body");
            
            if (body != null) {
                String msg1 = (String) body.get("msg1");
                String rtCd = (String) body.get("rt_cd");
                
                if ("SUBSCRIBE SUCCESS".equals(msg1) || "0".equals(rtCd)) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> output = (Map<String, Object>) body.get("output");
                    
                    if (output != null) {
                        aesIv = (String) output.get("iv");
                        aesKey = (String) output.get("key");
                    }
                }
            }
        } catch (Exception e) {
        }
    }

    /**
     * 주식 데이터 파싱 및 콜백 호출
     */
    private void parseAndNotifyStockData(String data) {
        try {
            // 데이터는 ^로 구분됨
            String[] fields = data.split("\\^");
            
            if (fields.length < 35) {
                return;
            }

            // 주요 데이터 추출
            String stockCode = fields[0]; // 종목코드
            String time = fields[1]; // 체결시간
            double currentPrice = Double.parseDouble(fields[2]); // 현재가
            String priceChangeSign = fields[3]; // 전일대비부호
            double priceChange = Double.parseDouble(fields[4]); // 전일대비
            double priceChangeRate = Double.parseDouble(fields[5]); // 전일대비율
            
            // 호가 정보
            double askPrice1 = Double.parseDouble(fields[10]); // 매도호가1
            double bidPrice1 = Double.parseDouble(fields[11]); // 매수호가1
            
            long volume = Long.parseLong(fields[12]); // 체결거래량
            long accVolume = Long.parseLong(fields[13]); // 누적거래량

            // 데이터 맵 생성
            Map<String, Object> stockData = new HashMap<>();
            stockData.put("stockCode", stockCode);
            stockData.put("time", time);
            stockData.put("currentPrice", currentPrice);
            stockData.put("priceChangeSign", convertPriceChangeSign(priceChangeSign));
            stockData.put("priceChange", priceChange);
            stockData.put("priceChangeRate", priceChangeRate);
            stockData.put("askPrice1", askPrice1);
            stockData.put("bidPrice1", bidPrice1);
            stockData.put("volume", volume);
            stockData.put("accVolume", accVolume);
            stockData.put("timestamp", System.currentTimeMillis());

            // 구독자들에게 데이터 전송
            CopyOnWriteArraySet<Consumer<Map<String, Object>>> stockSubscribers = subscribers.get(stockCode);
            if (stockSubscribers != null) {
                log.info("📊 KIS WebSocket 데이터 전송 - 종목: {}, 현재가: {}, 변동: {}, 변동률: {}%, 등락: {}, 구독자 수: {}", 
                    stockCode, currentPrice, priceChange, priceChangeRate, convertPriceChangeSign(priceChangeSign), stockSubscribers.size());
                for (Consumer<Map<String, Object>> callback : stockSubscribers) {
                    try {
                        callback.accept(stockData);
                    } catch (Exception e) {
                        log.error("KIS WebSocket 콜백 오류 - 종목: {}, 오류: {}", stockCode, e.getMessage(), e);
                    }
                }
            } else {
                log.warn("KIS WebSocket - 구독자가 없음: 종목 {}", stockCode);
            }

        } catch (Exception e) {
            log.error("KIS WebSocket 데이터 파싱 오류: {}", e.getMessage(), e);
        }
    }

    /**
     * 호가 데이터 파싱 및 콜백 호출 (H0STASP0)
     */
    private void parseAndNotifyQuoteData(String data) {
        try {
            // 데이터는 ^로 구분됨
            String[] fields = data.split("\\^");
            
            if (fields.length < 47) {
                return;
            }

            // 주요 데이터 추출 (H0STASP0 명세 기준)
            String stockCode = fields[0]; // 종목코드
            
            // 매도호가 1~10 (필드 1~10)
            double[] askPrices = new double[10];
            for (int i = 0; i < 10; i++) {
                askPrices[i] = parseDoubleSafely(fields[1 + i]);
            }
            
            // 매수호가 1~10 (필드 11~20)
            double[] bidPrices = new double[10];
            for (int i = 0; i < 10; i++) {
                bidPrices[i] = parseDoubleSafely(fields[11 + i]);
            }
            
            // 매도잔량 1~10 (필드 21~30)
            long[] askVolumes = new long[10];
            for (int i = 0; i < 10; i++) {
                askVolumes[i] = parseLongSafely(fields[21 + i]);
            }
            
            // 매수잔량 1~10 (필드 31~40)
            long[] bidVolumes = new long[10];
            for (int i = 0; i < 10; i++) {
                bidVolumes[i] = parseLongSafely(fields[31 + i]);
            }
            
            // 총 매도/매수 잔량
            long totalAskVolume = parseLongSafely(fields[41]);
            long totalBidVolume = parseLongSafely(fields[42]);
            
            // 예상 체결가/량
            double expectedPrice = parseDoubleSafely(fields[43]);
            long expectedVolume = parseLongSafely(fields[44]);
            
            // 시장 상태 정보
            String marketStatus = fields.length > 45 ? fields[45] : "";
            String marketTime = fields.length > 46 ? fields[46] : "";

            // 호가창 데이터 생성
            Map<String, Object>[] asks = new Map[10];
            for (int i = 0; i < 10; i++) {
                asks[i] = Map.of(
                    "price", askPrices[i],
                    "volume", askVolumes[i],
                    "level", i + 1
                );
            }
            
            Map<String, Object>[] bids = new Map[10];
            for (int i = 0; i < 10; i++) {
                bids[i] = Map.of(
                    "price", bidPrices[i],
                    "volume", bidVolumes[i],
                    "level", i + 1
                );
            }
            
            // 호가 스프레드 계산
            String spread = "-";
            if (askPrices[0] > 0 && bidPrices[0] > 0) {
                spread = String.valueOf((int)(askPrices[0] - bidPrices[0])) + "원";
            }
            
            Map<String, Object> orderBook = Map.of(
                "asks", asks,
                "bids", bids,
                "totalAskVolume", totalAskVolume,
                "totalBidVolume", totalBidVolume,
                "spread", spread
            );
            
            Map<String, Object> expectedExecution = Map.of(
                "price", expectedPrice,
                "volume", expectedVolume
            );

            // 호가 데이터 맵 생성
            Map<String, Object> quoteData = Map.of(
                "stockCode", stockCode,
                "orderBook", orderBook,
                "expectedExecution", expectedExecution,
                "marketStatus", marketStatus,
                "marketTime", marketTime,
                "timestamp", System.currentTimeMillis()
            );

            // 호가 구독자들에게 데이터 전송
            String quoteKey = "QUOTE_" + stockCode;
            CopyOnWriteArraySet<Consumer<Map<String, Object>>> quoteSubscribers = subscribers.get(quoteKey);
            if (quoteSubscribers != null) {
                for (Consumer<Map<String, Object>> callback : quoteSubscribers) {
                    try {
                        callback.accept(quoteData);
                    } catch (Exception e) {
                    }
                }
            }

        } catch (Exception e) {
        }
    }
    
    private double parseDoubleSafely(String value) {
        if (value == null || value.trim().isEmpty()) {
            return 0.0;
        }
        try {
            return Double.parseDouble(value.trim());
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }
    
    private long parseLongSafely(String value) {
        if (value == null || value.trim().isEmpty()) {
            return 0L;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    /**
     * 가격 변동 부호 변환
     */
    private String convertPriceChangeSign(String sign) {
        switch (sign) {
            case "1": return "상한";
            case "2": return "상승";
            case "3": return "보합";
            case "4": return "하한";
            case "5": return "하락";
            default: return "보합";
        }
    }

    /**
     * AES 복호화
     */
    private String decryptAes(String encryptedData) {
        try {
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            SecretKeySpec keySpec = new SecretKeySpec(aesKey.getBytes(StandardCharsets.UTF_8), "AES");
            IvParameterSpec ivSpec = new IvParameterSpec(aesIv.getBytes(StandardCharsets.UTF_8));
            
            cipher.init(Cipher.DECRYPT_MODE, keySpec, ivSpec);
            byte[] decodedBytes = Base64.getDecoder().decode(encryptedData);
            byte[] decryptedBytes = cipher.doFinal(decodedBytes);
            
            return new String(decryptedBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return encryptedData; // 복호화 실패시 원본 반환
        }
    }

    /**
     * 재연결 스케줄링
     */
    private void scheduleReconnect() {
        new Thread(() -> {
            try {
                Thread.sleep(5000); // 5초 대기
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
}