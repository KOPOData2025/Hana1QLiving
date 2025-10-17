package com.hana.securities.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hana.securities.util.AESCryptoUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

@Service
@Slf4j
@DependsOn({"kisOAuthService", "aesCryptoUtil"})
public class KisWebSocketService {

    private final AESCryptoUtil aesCryptoUtil;
    private final KisOAuthService kisOAuthService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    public KisWebSocketService(AESCryptoUtil aesCryptoUtil, KisOAuthService kisOAuthService) {
        this.aesCryptoUtil = aesCryptoUtil;
        this.kisOAuthService = kisOAuthService;
    }
    
    private WebSocketClient webSocketClient;
    private final Map<String, Consumer<Map<String, Object>>> stockSubscribers = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);
    
    // KIS WebSocket 연결 정보 (설정에서 주입)
    @Value("${kis.websocket.url:ws://ops.koreainvestment.com:31000}")
    private String wsUrl;
    
    @Value("${kis.websocket.approval-key:your-websocket-approval-key}")
    private String approvalKey;
    
    // 동적으로 갱신 가능한 approval_key
    private String dynamicApprovalKey;
    
    @Value("${kis.websocket.aes.key:your-aes-key-here}")
    private String aesKey;
    
    @Value("${kis.websocket.aes.iv:your-aes-iv-here}")
    private String aesIv;
    
    @PostConstruct
    public void init() {
        try {
            initializeWebSocket();
        } catch (Exception e) {
            // 초기화 실패 로그 생략
        }
    }
    
    public void initializeWebSocket() {
        
        // 설정 파일의 approval_key가 플레이스홀더인지 확인
        boolean needsOAuth = approvalKey == null || approvalKey.isEmpty() || 
                           approvalKey.contains("your-websocket-approval-key") ||
                           approvalKey.equals("your-websocket-approval-key-here");
        
        if (needsOAuth) {
            // OAuth를 통해 동적으로 approval_key 발급 후 연결
            try {
                this.dynamicApprovalKey = kisOAuthService.getApprovalKey();
                
                if (kisOAuthService.isApprovalKeyValid(this.dynamicApprovalKey)) {
                    connectToKisWebSocket();
                    // 연결 유지를 위한 heartbeat 스케줄링
                    scheduler.scheduleAtFixedRate(this::sendHeartbeat, 30, 30, TimeUnit.SECONDS);
                } else {
                    // approval_key 유효성 검증 실패
                }
            } catch (Exception e) {
                // OAuth 토큰 발급 실패
            }
        } else {
            this.dynamicApprovalKey = approvalKey;
            connectToKisWebSocket();
            scheduler.scheduleAtFixedRate(this::sendHeartbeat, 30, 30, TimeUnit.SECONDS);
        }
        
    }

    private void connectToKisWebSocket() {
        try {
            URI serverUri = new URI(wsUrl);
            
            // KIS WebSocket에 필요한 헤더 설정
            Map<String, String> headers = new HashMap<>();
            headers.put("approval_key", getDynamicApprovalKey());
            headers.put("custtype", "P"); // 개인투자자
            headers.put("tr_type", "1"); // 등록
            headers.put("content-type", "utf-8");
            
            
            webSocketClient = new WebSocketClient(serverUri, headers) {
                @Override
                public void onOpen(ServerHandshake serverHandshake) {
                    // KIS WebSocket 연결 후 초기화 완료
                    // 연결이 성공하면 이후 구독 메시지를 기다림
                    // 별도의 초기 인증 메시지는 필요하지 않음 (approval_key는 헤더에서 처리)
                }

                @Override
                public void onMessage(String message) {
                    handleWebSocketMessage(message);
                }

                @Override
                public void onClose(int code, String reason, boolean remote) {
                    // code=1006은 비정상 종료 (Abnormal Closure)
                    if (code == 1006) {
                        // 비정상 종료 처리
                    }
                    // approval_key 만료 가능성 체크 후 재연결 시도
                    scheduler.schedule(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                // 연결 종료 시 approval_key 상태 확인
                                Map<String, Object> keyStatus = kisOAuthService.getApprovalKeyStatus();
                                boolean isExpired = (Boolean) keyStatus.get("isExpired");
                                
                                if (isExpired) {
                                    String newApprovalKey = kisOAuthService.refreshApprovalKey();
                                    dynamicApprovalKey = newApprovalKey;
                                }
                                
                                connectToKisWebSocket();
                            } catch (Exception e) {
                                // 5초 후 다시 시도
                                scheduler.schedule(new Runnable() {
                                    @Override
                                    public void run() {
                                        connectToKisWebSocket();
                                    }
                                }, 5, TimeUnit.SECONDS);
                            }
                        }
                    }, 5, TimeUnit.SECONDS);
                }

                @Override
                public void onError(Exception ex) {
                    // WebSocket 에러 처리
                }
            };

            // 연결 시도
            CompletableFuture.runAsync(() -> {
                try {
                    boolean connected = webSocketClient.connectBlocking();
                    
                    if (!connected) {
                        scheduler.schedule(this::connectToKisWebSocket, 10, TimeUnit.SECONDS);
                    } else {
                        // 연결 성공
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    scheduler.schedule(this::connectToKisWebSocket, 10, TimeUnit.SECONDS);
                } catch (Exception e) {
                    scheduler.schedule(this::connectToKisWebSocket, 10, TimeUnit.SECONDS);
                }
            });

        } catch (Exception e) {
            // WebSocket 연결 실패
        }
    }

    /**
     * 실시간 주식 체결가 구독 (H0STCNT0)
     * @param stockCode 종목코드 (6자리)
     * @param callback 데이터 수신 콜백
     */
    public void subscribeStock(String stockCode, Consumer<Map<String, Object>> callback) {
        try {
            if (stockCode == null || "null".equals(stockCode)) {
                return;
            }

            stockSubscribers.put(stockCode, callback);

            if (webSocketClient == null || !webSocketClient.isOpen()) {
                return;
            }
            
            
            // KIS WebSocket 구독 메시지 생성 (공식 H0STCNT0 명세)
            Map<String, String> header = new HashMap<>();
            header.put("approval_key", getDynamicApprovalKey());
            header.put("custtype", "P");  // 개인투자자
            header.put("tr_type", "1");   // 등록
            header.put("content-type", "utf-8");
            
            Map<String, String> body = new HashMap<>();  
            body.put("tr_id", "H0STCNT0");  // 실시간 체결가
            body.put("tr_key", stockCode);  // 종목코드 (6자리)
            
            Map<String, Map<String, String>> subscribeMessage = new HashMap<>();
            subscribeMessage.put("header", header);
            subscribeMessage.put("body", body);

            String messageJson = objectMapper.writeValueAsString(subscribeMessage);
            
            webSocketClient.send(messageJson);

        } catch (Exception e) {
            // 오류 처리 생략
        }
    }

    /**
     * 실시간 주식 호가 구독 (H0STASP0)
     * @param stockCode 종목코드 (6자리)
     * @param callback 데이터 수신 콜백
     */
    public void subscribeStockQuote(String stockCode, Consumer<Map<String, Object>> callback) {
        try {
            if (stockCode == null || "null".equals(stockCode)) {
                return;
            }
            
            // 구독자 등록
            stockSubscribers.put(stockCode, callback);
            
            // WebSocket 연결이 없으면 바로 리턴
            if (webSocketClient == null || !webSocketClient.isOpen()) {
                return;
            }
            
            
            // KIS WebSocket 구독 메시지 생성 (공식 H0STCNT0 명세)
            // 형식: {"header":{"approval_key":"키값","custtype":"P","tr_type":"1","content-type":"utf-8"},"body":{"tr_id":"H0STCNT0","tr_key":"종목코드"}}
            
            Map<String, String> header = new HashMap<>(); // String으로 변경
            header.put("approval_key", getDynamicApprovalKey());
            header.put("custtype", "P");  // 개인투자자
            header.put("tr_type", "1");   // 등록
            header.put("content-type", "utf-8");
            
            Map<String, String> body = new HashMap<>(); // String으로 변경  
            body.put("tr_id", "H0STASP0");  // 실시간 호가
            body.put("tr_key", stockCode);  // 종목코드 (6자리)
            
            Map<String, Map<String, String>> subscribeMessage = new HashMap<>();
            subscribeMessage.put("header", header);
            subscribeMessage.put("body", body);

            String messageJson = objectMapper.writeValueAsString(subscribeMessage);
            
            webSocketClient.send(messageJson);

        } catch (Exception e) {
            // 오류 처리 생략
        }
    }

    /**
     * 실시간 주식 체결가 구독 해제
     * @param stockCode 종목코드
     */
    public void unsubscribeStock(String stockCode) {
        try {
            // 구독자 제거
            stockSubscribers.remove(stockCode);
            
            // KIS WebSocket 구독 해제 메시지 생성 (H0STCNT0 명세)
            Map<String, String> header = new HashMap<>();
            header.put("approval_key", getDynamicApprovalKey());
            header.put("custtype", "P");
            header.put("tr_type", "2"); // 해제
            header.put("content-type", "utf-8");
            
            Map<String, String> body = new HashMap<>();
            body.put("tr_id", "H0STCNT0");
            body.put("tr_key", stockCode);
            
            Map<String, Map<String, String>> unsubscribeMessage = new HashMap<>();
            unsubscribeMessage.put("header", header);
            unsubscribeMessage.put("body", body);

            String messageJson = objectMapper.writeValueAsString(unsubscribeMessage);
            
            if (webSocketClient != null && webSocketClient.isOpen()) {
                webSocketClient.send(messageJson);
            }

        } catch (Exception e) {
            // 오류 처리 생략
        }
    }

    /**
     * 실시간 주식 호가 구독 해제
     * @param stockCode 종목코드
     */
    public void unsubscribeStockQuote(String stockCode) {
        try {
            // 구독자 제거
            stockSubscribers.remove(stockCode);
            
            // KIS WebSocket 구독 해제 메시지 생성 (H0STASP0 명세)
            Map<String, String> header = new HashMap<>();
            header.put("approval_key", getDynamicApprovalKey());
            header.put("custtype", "P");
            header.put("tr_type", "2"); // 해제
            header.put("content-type", "utf-8");
            
            Map<String, String> body = new HashMap<>();
            body.put("tr_id", "H0STASP0");
            body.put("tr_key", stockCode);
            
            Map<String, Map<String, String>> unsubscribeMessage = new HashMap<>();
            unsubscribeMessage.put("header", header);
            unsubscribeMessage.put("body", body);

            String messageJson = objectMapper.writeValueAsString(unsubscribeMessage);
            
            if (webSocketClient != null && webSocketClient.isOpen()) {
                webSocketClient.send(messageJson);
            }

        } catch (Exception e) {
            // 오류 처리 생략
        }
    }

    private void handleWebSocketMessage(String message) {
        try {
            // JSON 형태 메시지 처리
            if (message.startsWith("{")) {
                handleJsonMessage(message);
                return;
            }
            
            // 파이프 구분자로 분할: 암호화유무|TR_ID|데이터건수|응답데이터
            String[] parts = message.split("\\|", 4);
            
            if (parts.length < 4) {
                return;
            }

            String isEncrypted = parts[0];  // 암호화유무 (0:평문, 1:암호화)
            String trId = parts[1];         // TR_ID
            String dataCount = parts[2];    // 데이터건수
            String responseData = parts[3]; // 응답데이터


            // 암호화된 데이터 복호화
            String decryptedData = responseData;
            if ("1".equals(isEncrypted)) {
                // AES 키와 IV가 플레이스홀더인지 확인
                boolean hasValidAesConfig = aesKey != null && aesIv != null &&
                    !aesKey.contains("your-aes-key") && !aesIv.contains("your-aes-iv") &&
                    !aesKey.trim().isEmpty() && !aesIv.trim().isEmpty();
                
                if (hasValidAesConfig) {
                    try {
                        decryptedData = aesCryptoUtil.decrypt(responseData, aesKey, aesIv);
                    } catch (Exception e) {
                        decryptedData = responseData; // 복호화 실패 시 원본 데이터 사용
                    }
                } else {
                    decryptedData = responseData; // 설정이 없으면 원본 데이터 사용
                }
            }

            // TR_ID에 따라 처리
            if ("H0STCNT0".equals(trId)) {
                handleStockExecutionData(decryptedData);
            } else if ("H0STASP0".equals(trId)) {
                handleStockQuoteData(decryptedData);
            }

        } catch (Exception e) {
            // 오류 처리 생략
        }
    }
    
    private void handleJsonMessage(String message) {
        try {
            JsonNode messageJson = objectMapper.readTree(message);
            JsonNode header = messageJson.get("header");
            
            if (header != null) {
                String trId = header.get("tr_id") != null ? header.get("tr_id").asText() : "";
                
                if ("PINGPONG".equals(trId)) {
                    // PINGPONG 메시지는 정상적인 heartbeat이므로 로그 레벨을 debug로 변경
                    return;
                }
                
                if ("H0STCNT0".equals(trId) || "H0STASP0".equals(trId)) {
                    // 구독 응답 메시지 처리
                    JsonNode body = messageJson.get("body");
                    if (body != null) {
                        String rtCd = body.get("rt_cd") != null ? body.get("rt_cd").asText() : "";
                        String msgCd = body.get("msg_cd") != null ? body.get("msg_cd").asText() : "";
                        String msg1 = body.get("msg1") != null ? body.get("msg1").asText() : "";
                        String trKey = header.get("tr_key") != null ? header.get("tr_key").asText() : "";
                        
                        if ("0".equals(rtCd) && "OPSP0000".equals(msgCd)) {
                        } else if ("1".equals(rtCd) && "OPSP0002".equals(msgCd)) {
                        } else {
                        }
                    }
                    return;
                }
                
                if (message.contains("invalid approval")) {
                    // approval_key 갱신 시도
                    try {
                        String newApprovalKey = kisOAuthService.refreshApprovalKey();
                        this.dynamicApprovalKey = newApprovalKey;
                        
                        // WebSocket 재연결
                        if (webSocketClient != null) {
                            webSocketClient.close();
                        }
                        scheduler.schedule(() -> connectToKisWebSocket(), 3, TimeUnit.SECONDS);
                    } catch (Exception e) {
                        if (webSocketClient != null) {
                            webSocketClient.close();
                        }
                    }
                    return;
                }
            }
            
            
        } catch (Exception e) {
            // 오류 처리 생략
        }
    }

    private void handleStockExecutionData(String data) {
        try {
            // H0STCNT0 응답 데이터 파싱 (캐럿 구분자 사용)
            String[] fields = data.split("\\^");
            
            if (fields.length < 6) {
                
                // 데이터 구조 디버깅을 위해 각 필드 출력
                for (int i = 0; i < fields.length; i++) {
                }
                return;
            }
            
            // 전체 필드 개수 로그 (디버깅용)

            // KIS H0STCNT0 실제 명세에 따른 필드 매핑 (정확한 순서)
            // 출력값: MKSC_SHRN_ISCD | STCK_CNTG_HOUR | STCK_PRPR | PRDY_VRSS_SIGN | PRDY_VRSS | PRDY_CTRT | ...
            String mkscShrnIscd = getFieldSafely(fields, 0, "");   // [0] 유가증권 단축 종목코드 
            String stckCntgHour = getFieldSafely(fields, 1, "");  // [1] 주식 체결 시간
            String stckPrpr = getFieldSafely(fields, 2, "0");     // [2] 주식 현재가 ★ 
            String prdyVrssSign = getFieldSafely(fields, 3, "0"); // [3] 전일 대비 부호 ★ (1:상한,2:상승,3:보합,4:하한,5:하락)
            String prdyVrss = getFieldSafely(fields, 4, "0");     // [4] 전일 대비 ★
            String prdyCtrt = getFieldSafely(fields, 5, "0.00"); // [5] 전일 대비율 ★
            String wghnAvrgStckPrc = getFieldSafely(fields, 6, "0"); // [6] 가중 평균 주식 가격
            String stckOprc = getFieldSafely(fields, 7, "0");     // [7] 주식 시가
            String stckHgpr = getFieldSafely(fields, 8, "0");     // [8] 주식 최고가
            String stckLwpr = getFieldSafely(fields, 9, "0");     // [9] 주식 최저가
            String askp1 = getFieldSafely(fields, 10, "0");       // [10] 매도호가1
            String bidp1 = getFieldSafely(fields, 11, "0");       // [11] 매수호가1
            String cntgVol = getFieldSafely(fields, 12, "0");     // [12] 체결 거래량
            String acmlVol = getFieldSafely(fields, 13, "0");     // [13] 누적 거래량
            String acmlTrPbmn = getFieldSafely(fields, 14, "0");  // [14] 누적 거래 대금
            String selnCntgCsnu = getFieldSafely(fields, 15, "0"); // [15] 매도 체결 건수
            String shnuCntgCsnu = getFieldSafely(fields, 16, "0"); // [16] 매수 체결 건수
            String ntbyCntgCsnu = getFieldSafely(fields, 17, "0"); // [17] 순매수 체결 건수
            String cttr = getFieldSafely(fields, 18, "0");        // [18] 체결강도
            String selnCntgSmtn = getFieldSafely(fields, 19, "0"); // [19] 총 매도 수량
            String shnuCntgSmtn = getFieldSafely(fields, 20, "0"); // [20] 총 매수 수량
            String ccldDvsn = getFieldSafely(fields, 21, "0");    // [21] 체결구분
            String shnuRate = getFieldSafely(fields, 22, "0");    // [22] 매수비율
            String prdyVolVrssAcmlVolRate = getFieldSafely(fields, 23, "0"); // [23] 전일 거래량 대비 등락율
            String oprcHour = getFieldSafely(fields, 24, "");     // [24] 시가 시간
            String oprcVrssPrprSign = getFieldSafely(fields, 25, "0"); // [25] 시가대비구분
            String oprcVrssPrpr = getFieldSafely(fields, 26, "0"); // [26] 시가대비
            String hgprHour = getFieldSafely(fields, 27, "");     // [27] 최고가 시간
            String hgprVrssPrprSign = getFieldSafely(fields, 28, "0"); // [28] 고가대비구분
            String hgprVrssPrpr = getFieldSafely(fields, 29, "0"); // [29] 고가대비
            String lwprHour = getFieldSafely(fields, 30, "");     // [30] 최저가 시간
            String lwprVrssPrprSign = getFieldSafely(fields, 31, "0"); // [31] 저가대비구분
            String lwprVrssPrpr = getFieldSafely(fields, 32, "0"); // [32] 저가대비
            String bsopDate = getFieldSafely(fields, 33, "");     // [33] 영업 일자
            String newMkopClsCode = getFieldSafely(fields, 34, "0"); // [34] 신 장운영 구분 코드
            String trhtYn = getFieldSafely(fields, 35, "N");      // [35] 거래정지 여부
            String askpRsqn1 = getFieldSafely(fields, 36, "0");   // [36] 매도호가 잔량1
            String bidpRsqn1 = getFieldSafely(fields, 37, "0");   // [37] 매수호가 잔량1
            String totalAskpRsqn = getFieldSafely(fields, 38, "0"); // [38] 총 매도호가 잔량
            String totalBidpRsqn = getFieldSafely(fields, 39, "0"); // [39] 총 매수호가 잔량
            String volTnrt = getFieldSafely(fields, 40, "0");     // [40] 거래량 회전율
            String prdySmnsHourAcmlVol = getFieldSafely(fields, 41, "0"); // [41] 전일 동시간 누적 거래량
            String prdySmnsHourAcmlVolRate = getFieldSafely(fields, 42, "0"); // [42] 전일 동시간 누적 거래량 비율
            String hourClsCode = getFieldSafely(fields, 43, "0");  // [43] 시간 구분 코드
            String mrktTrtmClsCode = getFieldSafely(fields, 44, "0"); // [44] 임의종료구분코드
            String viStndPrc = getFieldSafely(fields, 45, "0");   // [45] 정적VI발동기준가
            
            // KIS H0STCNT0 명세에 따른 전일대비 부호 처리
            // PRDY_VRSS_SIGN: 1=상한, 2=상승, 3=보합, 4=하한, 5=하락
            String changePrice = prdyVrss;
            String changeRate = prdyCtrt;
            
            // 부호 처리 (명세서 기준)
            if ("1".equals(prdyVrssSign) || "2".equals(prdyVrssSign)) {
                // 상한/상승
                if (!changePrice.startsWith("+") && !changePrice.equals("0")) {
                    changePrice = "+" + changePrice;
                }
                if (!changeRate.startsWith("+") && !changeRate.equals("0.00")) {
                    changeRate = "+" + changeRate;
                }
            } else if ("4".equals(prdyVrssSign) || "5".equals(prdyVrssSign)) {
                // 하한/하락
                if (!changePrice.startsWith("-") && !changePrice.equals("0")) {
                    changePrice = "-" + changePrice;
                }
                if (!changeRate.startsWith("-") && !changeRate.equals("0.00")) {
                    changeRate = "-" + changeRate;
                }
            }
            // 3=보합인 경우 부호 없이 유지
            // 실시간 데이터 처리 완료
            
            // 실시간 주식 체결가 데이터 구조화
            Map<String, Object> executionData = new HashMap<>();
            executionData.put("stockCode", mkscShrnIscd);
            executionData.put("currentPrice", parseDoubleSafely(stckPrpr));      // 주식 현재가
            executionData.put("changePrice", changePrice);                       // 전일 대비 (부호 포함)
            executionData.put("changeRate", changeRate);                         // 전일 대비율 (부호 포함)
            executionData.put("changeSign", prdyVrssSign);                       // 전일 대비 부호
            executionData.put("volume", parseLongSafely(acmlVol));              // 누적 거래량
            executionData.put("executionTime", stckCntgHour);                    // 체결 시간
            executionData.put("executionVolume", parseLongSafely(cntgVol));     // 체결 거래량
            executionData.put("executionStrength", parseDoubleSafely(cttr));     // 체결강도
            executionData.put("openPrice", parseDoubleSafely(stckOprc));         // 시가
            executionData.put("highPrice", parseDoubleSafely(stckHgpr));         // 고가
            executionData.put("lowPrice", parseDoubleSafely(stckLwpr));          // 저가
            executionData.put("weightedAverage", parseDoubleSafely(wghnAvrgStckPrc)); // 가중평균가
            executionData.put("tradingAmount", parseLongSafely(acmlTrPbmn));     // 누적 거래대금
            executionData.put("sellCount", parseLongSafely(selnCntgCsnu));       // 매도 체결 건수
            executionData.put("buyCount", parseLongSafely(shnuCntgCsnu));        // 매수 체결 건수
            executionData.put("netBuyCount", parseLongSafely(ntbyCntgCsnu));     // 순매수 체결 건수
            executionData.put("timestamp", System.currentTimeMillis());
            
            // 호가 정보 (H0STCNT0에서는 1차 호가만 제공)
            Map<String, Object> orderBook = new HashMap<>();
            Map<String, Object> askData = new HashMap<>();
            Map<String, Object> bidData = new HashMap<>();
            
            askData.put("price", parseDoubleSafely(askp1));      // 매도호가1
            askData.put("volume", parseLongSafely(askpRsqn1));   // 매도호가 잔량1
            bidData.put("price", parseDoubleSafely(bidp1));      // 매수호가1  
            bidData.put("volume", parseLongSafely(bidpRsqn1));   // 매수호가 잔량1
            
            orderBook.put("ask", askData);
            orderBook.put("bid", bidData);
            executionData.put("orderBook", orderBook);
            
            // 디버깅: 데이터 확인용 (모든 종목 대상으로 변경)
            if (fields.length > 0) {
                // 현재가 정보 확인
                // 처음 10개 필드만 출력하여 로그 과부하 방지
                for (int i = 0; i < Math.min(fields.length, 10); i++) {
                    // 필드 출력 생략
                }
                if (fields.length > 10) {
                    // 추가 필드 존재
                }
            }

            Consumer<Map<String, Object>> callback = stockSubscribers.get(mkscShrnIscd);
            if (callback != null) {
                callback.accept(executionData);
            }

        } catch (Exception e) {
            // 오류 처리 생략
        }
    }
    
    private void handleStockQuoteData(String data) {
        try {
            // H0STASP0 응답 데이터 파싱 (캐럿 구분자 사용)
            String[] fields = data.split("\\^");
            
            if (fields.length < 40) {
                return;
            }
            
            // H0STASP0 명세에 따른 필드 매핑
            String stockCode = getFieldSafely(fields, 0, "");  // 종목코드
            
            // 매도호가 1~10
            double[] askPrices = new double[10];
            long[] askVolumes = new long[10];
            for (int i = 0; i < 10; i++) {
                askPrices[i] = parseDoubleSafely(getFieldSafely(fields, 1 + i, "0"));
                askVolumes[i] = parseLongSafely(getFieldSafely(fields, 11 + i, "0"));
            }
            
            // 매수호가 1~10
            double[] bidPrices = new double[10];
            long[] bidVolumes = new long[10];
            for (int i = 0; i < 10; i++) {
                bidPrices[i] = parseDoubleSafely(getFieldSafely(fields, 21 + i, "0"));
                bidVolumes[i] = parseLongSafely(getFieldSafely(fields, 31 + i, "0"));
            }
            
            // 총 잔량
            long totalAskVolume = parseLongSafely(getFieldSafely(fields, 41, "0"));
            long totalBidVolume = parseLongSafely(getFieldSafely(fields, 42, "0"));
            
            // 예상 체결가/량
            double expectedPrice = parseDoubleSafely(getFieldSafely(fields, 43, "0"));
            long expectedVolume = parseLongSafely(getFieldSafely(fields, 44, "0"));
            
            // 시장 상태
            String marketStatus = getFieldSafely(fields, 45, "");
            String marketTime = getFieldSafely(fields, 46, "");
            
            // 호가 데이터 처리 완료
            
            // 호가 데이터 구조화
            Map<String, Object> quoteData = new HashMap<>();
            quoteData.put("stockCode", stockCode);
            quoteData.put("timestamp", System.currentTimeMillis());
            quoteData.put("marketStatus", marketStatus);
            quoteData.put("marketTime", marketTime);
            
            // 매도호가 (asks)
            Map<String, Object>[] asks = new Map[10];
            for (int i = 0; i < 10; i++) {
                asks[i] = new HashMap<>();
                asks[i].put("price", askPrices[i]);
                asks[i].put("volume", askVolumes[i]);
                asks[i].put("level", i + 1);
            }
            
            // 매수호가 (bids)
            Map<String, Object>[] bids = new Map[10];
            for (int i = 0; i < 10; i++) {
                bids[i] = new HashMap<>();
                bids[i].put("price", bidPrices[i]);
                bids[i].put("volume", bidVolumes[i]);
                bids[i].put("level", i + 1);
            }
            
            // 호가창 정보
            Map<String, Object> orderBook = new HashMap<>();
            orderBook.put("asks", asks);
            orderBook.put("bids", bids);
            orderBook.put("totalAskVolume", totalAskVolume);
            orderBook.put("totalBidVolume", totalBidVolume);
            
            // 호가 스프레드 계산
            if (askPrices[0] > 0 && bidPrices[0] > 0) {
                double spread = askPrices[0] - bidPrices[0];
                orderBook.put("spread", String.valueOf((int)spread) + "원");
            } else {
                orderBook.put("spread", "-");
            }
            
            quoteData.put("orderBook", orderBook);
            
            // 예상 체결 정보
            Map<String, Object> expectedExecution = new HashMap<>();
            expectedExecution.put("price", expectedPrice);
            expectedExecution.put("volume", expectedVolume);
            quoteData.put("expectedExecution", expectedExecution);

            // 해당 종목 구독자에게 데이터 전송
            Consumer<Map<String, Object>> callback = stockSubscribers.get(stockCode);
            if (callback != null) {
                callback.accept(quoteData);
            } else {
                // 해당 종목 구독자 없음
            }

        } catch (Exception e) {
            // 오류 처리 생략
        }
    }
    
    private String getFieldSafely(String[] fields, int index, String defaultValue) {
        if (index >= 0 && index < fields.length && fields[index] != null) {
            return fields[index].trim();
        }
        return defaultValue;
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

    private void sendHeartbeat() {
        try {
            if (webSocketClient != null && webSocketClient.isOpen()) {
                // 단순 ping 메시지 전송
                webSocketClient.sendPing();
            }
        } catch (Exception e) {
            // 오류 처리 생략
        }
    }

    /**
     * WebSocket 연결 상태 확인
     */
    public boolean isConnected() {
        return webSocketClient != null && webSocketClient.isOpen();
    }

    /**
     * 모든 구독 해제
     */
    public void unsubscribeAll() {
        stockSubscribers.keySet().forEach(this::unsubscribeStockQuote);
    }

    /**
     * 현재 사용 중인 approval_key 반환
     */
    private String getDynamicApprovalKey() {
        return dynamicApprovalKey != null ? dynamicApprovalKey : approvalKey;
    }

    /**
     * 서비스 종료 시 리소스 정리
     */
    public void shutdown() {
        unsubscribeAll();
        if (webSocketClient != null) {
            webSocketClient.close();
        }
        scheduler.shutdown();
    }
}