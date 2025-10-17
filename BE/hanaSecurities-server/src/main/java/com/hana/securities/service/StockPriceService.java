package com.hana.securities.service;

import com.hana.securities.client.KisWebSocketClient;
import com.hana.securities.service.KisOAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockPriceService {

    private final KisWebSocketClient kisWebSocketClient;
    private final KisOAuthService kisOAuthService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    @Value("${kis.api.base-url:https://openapi.koreainvestment.com:9443}")
    private String baseUrl;
    
    @Value("${kis.api.app-key:}")
    private String appKey;
    
    @Value("${kis.api.app-secret:}")
    private String appSecret;
    
    // 종목별 최신 가격 정보 캐시
    private final Map<String, Map<String, Object>> priceCache = new ConcurrentHashMap<>();
    
    /**
     * 실시간 주식 가격 정보 가져오기
     * @param stockCode 종목코드
     * @return 가격 정보
     */
    public Map<String, Object> getRealtimeStockPrice(String stockCode) {
        try {
            log.info("=== 실시간 주식 가격 조회 시작 - 종목: {} ===", stockCode);
            
            // 캐시에서 최신 데이터 확인
            Map<String, Object> cachedData = priceCache.get(stockCode);
            log.info("캐시 데이터 존재 여부 - 종목: {}, 캐시 있음: {}", stockCode, cachedData != null);
            
            if (cachedData == null) {
                // 캐시된 데이터가 없으면 즉시 구독 시작 (연결도 함께 처리)
                
                try {
                    // 무조건 구독 시도 (내부에서 연결 확인 및 연결 처리)
                    log.info("WebSocket 구독 시도 - 종목: {}", stockCode);
                    subscribeToStockPrice(stockCode);
                    log.info("WebSocket 구독 완료 - 종목: {}", stockCode);
                } catch (Exception e) {
                    log.error("WebSocket 구독 실패 - 종목: {}, 오류: {}", stockCode, e.getMessage());
                }
                
                // 캐시된 데이터가 없으면 즉시 KIS API에서 실제 가격 조회
                log.info("KIS API 실시간 데이터 조회 시작 - 종목: {}", stockCode);
                Map<String, Object> kisData = fetchRealTimeFromKisApi(stockCode);
                if (kisData != null && kisData.containsKey("currentPrice")) {
                    log.info("KIS API 데이터 조회 성공 - 종목: {}, 현재가: {}", stockCode, kisData.get("currentPrice"));
                    // KIS API에서 조회한 실제 데이터 반환
                    return kisData;
                } else {
                    log.warn("KIS API 데이터 조회 실패 - 종목: {}, 응답 데이터: {}", stockCode, kisData);
                }
                
                // KIS API 호출도 실패한 경우에만 NO_DATA 반환
                log.warn("모든 실시간 데이터 조회 실패 - 종목: {}, NO_DATA 반환", stockCode);
                Map<String, Object> response = new HashMap<>();
                response.put("stockCode", stockCode);
                response.put("currentPrice", 0);
                response.put("changePrice", 0);
                response.put("changeRate", 0);
                response.put("volume", 0);
                response.put("status", "NO_DATA");
                response.put("message", "실시간 데이터 조회 실패");
                response.put("timestamp", System.currentTimeMillis());
                
                return response;
            }
            
            // 캐시된 실시간 데이터 반환
            log.info("💾 캐시된 실시간 데이터 반환 - 종목: {}, 현재가: {}, 전일대비: {}, 전일대비율: {}%, 등락: {}", 
                    stockCode, cachedData.get("currentPrice"), 
                    cachedData.get("priceChange"), cachedData.get("priceChangeRate"),
                    cachedData.get("priceChangeSign"));
            Map<String, Object> response = new HashMap<>();
            response.put("stockCode", stockCode);
            response.put("currentPrice", cachedData.get("currentPrice"));
            response.put("changePrice", cachedData.getOrDefault("priceChange", 0)); // WebSocket 필드명 그대로 사용
            response.put("changeRate", cachedData.getOrDefault("priceChangeRate", 0)); // WebSocket 필드명 그대로 사용
            response.put("changeSign", cachedData.getOrDefault("priceChangeSign", "보합"));
            response.put("volume", cachedData.getOrDefault("volume", 0));
            response.put("accVolume", cachedData.getOrDefault("accVolume", 0));
            response.put("timestamp", cachedData.get("timestamp"));
            response.put("status", "REALTIME");
            
            log.info("📤 HanaSecurities 응답 생성 - 종목: {}, changePrice: {}, changeRate: {}, changeSign: {}", 
                    stockCode, response.get("changePrice"), response.get("changeRate"), response.get("changeSign"));
            
            return response;
            
        } catch (Exception e) {
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("stockCode", stockCode);
            errorResponse.put("status", "ERROR");
            errorResponse.put("message", "가격 정보 조회 중 오류가 발생했습니다: " + e.getMessage());
            errorResponse.put("timestamp", System.currentTimeMillis());
            
            return errorResponse;
        }
    }

    /**
     * 여러 종목의 실시간 가격 정보 일괄 조회
     * @param stockCodes 종목코드 목록
     * @return 가격 정보 맵
     */
    public Map<String, Map<String, Object>> getMultipleRealtimeStockPrices(List<String> stockCodes) {
        Map<String, Map<String, Object>> result = new HashMap<>();
        
        for (String stockCode : stockCodes) {
            result.put(stockCode, getRealtimeStockPrice(stockCode));
        }
        
        return result;
    }

    /**
     * 종목 실시간 구독 시작
     * @param stockCode 종목코드
     */
    public void subscribeToStockPrice(String stockCode) {
        try {
            kisWebSocketClient.subscribeStock(stockCode, quoteData -> {
                // 실시간 데이터에서 변화율 재계산
                Map<String, Object> processedData = processRealtimeData(stockCode, quoteData);
                // 실시간 데이터를 캐시에 저장
                priceCache.put(stockCode, processedData);
                log.info("🔄 실시간 데이터 캐시 업데이트 - 종목: {}, 현재가: {}, 변동: {}, 변동률: {}%, 시간: {}",
                    stockCode, processedData.get("currentPrice"), processedData.get("priceChange"),
                    processedData.get("priceChangeRate"), processedData.get("changeSign"),
                    new java.util.Date());
            });
            
            
        } catch (Exception e) {
        }
    }
    
    /**
     * 실시간 데이터를 처리하여 올바른 변화율 계산
     */
    private Map<String, Object> processRealtimeData(String stockCode, Map<String, Object> rawData) {
        // WebSocket 데이터는 이미 계산된 priceChange, priceChangeRate를 포함하고 있음
        // 따라서 그대로 사용하면 됨
        
        return rawData; // WebSocket에서 받은 데이터를 그대로 사용
    }

    /**
     * 종목 실시간 구독 해제
     * @param stockCode 종목코드
     */
    public void unsubscribeFromStockPrice(String stockCode) {
        try {
            kisWebSocketClient.unsubscribeStock(stockCode);
            priceCache.remove(stockCode);
            
            
        } catch (Exception e) {
        }
    }

    /**
     * 가격 변화율 계산
     * @param currentPrice 현재가
     * @param previousPrice 이전가
     * @return 변화율 (%)
     */
    public BigDecimal calculateChangeRate(BigDecimal currentPrice, BigDecimal previousPrice) {
        if (previousPrice == null || previousPrice.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        
        return currentPrice.subtract(previousPrice)
                .divide(previousPrice, 4, BigDecimal.ROUND_HALF_UP)
                .multiply(new BigDecimal("100"));
    }

    /**
     * 포트폴리오용 실시간 가격 업데이트
     * @param stockCodes 포트폴리오 종목 리스트
     * @return 업데이트된 가격 정보
     */
    public Map<String, Object> getPortfolioRealtimePrices(List<String> stockCodes) {
        Map<String, Object> result = new HashMap<>();
        Map<String, Map<String, Object>> priceUpdates = new HashMap<>();
        
        for (String stockCode : stockCodes) {
            Map<String, Object> priceInfo = getRealtimeStockPrice(stockCode);
            priceUpdates.put(stockCode, priceInfo);
        }
        
        result.put("updates", priceUpdates);
        result.put("timestamp", System.currentTimeMillis());
        result.put("updateCount", priceUpdates.size());
        
        return result;
    }

    /**
     * WebSocket 연결 상태 확인
     */
    public boolean isRealtimeConnected() {
        boolean connected = kisWebSocketClient.isConnected();
        log.info("WebSocket 연결 상태 확인: {}", connected);
        return connected;
    }

    /**
     * 캐시된 종목 수 조회
     */
    public int getCachedStockCount() {
        int count = priceCache.size();
        log.info("현재 캐시된 종목 수: {}, 캐시 내용: {}", count, priceCache.keySet());
        return count;
    }

    /**
     * 모든 구독 해제 및 캐시 정리
     */
    public void clearAllSubscriptions() {
        // KisWebSocketClient에서는 개별적으로 구독 해제
        for (String stockCode : priceCache.keySet()) {
            try {
                kisWebSocketClient.unsubscribeStock(stockCode);
            } catch (Exception e) {
            }
        }
        priceCache.clear();
    }
    
    /**
     * KIS WebSocket을 통한 실시간 주식 가격 조회
     */
    private Map<String, Object> fetchRealTimeFromKisApi(String stockCode) {
        try {
            log.info("fetchRealTimeFromKisApi 시작 - 종목: {}", stockCode);
            
            // 웹소켓이 연결되어 있지 않으면 연결 시도
            boolean wasConnected = kisWebSocketClient.isConnected();
            log.info("WebSocket 연결 상태 확인 - 종목: {}, 연결됨: {}", stockCode, wasConnected);
            
            if (!wasConnected) {
                log.info("WebSocket 연결 시도 - 종목: {}", stockCode);
                kisWebSocketClient.connect();
                // 연결 대기 시간
                Thread.sleep(1000);
                log.info("WebSocket 연결 대기 완료 - 종목: {}, 현재 연결 상태: {}", stockCode, kisWebSocketClient.isConnected());
            }
            
            // 웹소켓 구독이 되어있지 않으면 구독 시작
            log.info("WebSocket 구독 시작 - 종목: {}", stockCode);
            subscribeToStockPrice(stockCode);
            
            // 잠시 대기 후 캐시에서 데이터 확인
            log.info("실시간 데이터 대기 시작 - 종목: {} (500ms 대기)", stockCode);
            Thread.sleep(500);
            
            Map<String, Object> cachedData = priceCache.get(stockCode);
            log.info("대기 후 캐시 확인 - 종목: {}, 캐시 데이터 존재: {}", stockCode, cachedData != null);
            
            if (cachedData != null) {
                // 웹소켓으로부터 받은 실시간 데이터 반환
                Map<String, Object> result = new HashMap<>();
                result.put("stockCode", stockCode);
                result.put("currentPrice", cachedData.get("currentPrice"));
                result.put("changePrice", cachedData.getOrDefault("priceChange", 0)); // WebSocket 필드명 그대로
                result.put("changeRate", cachedData.getOrDefault("priceChangeRate", 0)); // WebSocket 필드명 그대로
                result.put("changeSign", cachedData.getOrDefault("priceChangeSign", "보합"));
                result.put("volume", cachedData.getOrDefault("volume", 0));
                result.put("accVolume", cachedData.getOrDefault("accVolume", 0));
                result.put("timestamp", cachedData.get("timestamp"));
                result.put("status", "REALTIME");
                
                return result;
            }
            
            // 웹소켓에서 데이터를 받아오지 못한 경우 REST API로 종가 조회 시도
            log.info("웹소켓에서 실시간 데이터를 받아오지 못함 - 종목: {}, REST API로 종가 조회 시도", stockCode);
            Map<String, Object> closingPriceData = fetchClosingPriceFromKisRestApi(stockCode);
            
            if (closingPriceData != null) {
                log.info("REST API 종가 조회 성공 - 종목: {}, 종가: {}", stockCode, closingPriceData.get("currentPrice"));
                return closingPriceData;
            }
            
            log.warn("모든 KIS API 조회 실패 - 종목: {}", stockCode);
            return null;
            
        } catch (Exception e) {
            log.error("KIS API 데이터 조회 실패 - 종목: {}, 오류: {}", stockCode, e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * KIS REST API를 통한 종가 조회 (시장 마감 후/주말)
     */
    private Map<String, Object> fetchClosingPriceFromKisRestApi(String stockCode) {
        try {
            log.info("=== KIS REST API 종가 조회 시작 - 종목: {} ===", stockCode);
            
            // Access Token 발급 (KisOAuthService에서 관리)
            String accessToken = getAccessToken();
            if (accessToken == null || accessToken.isEmpty()) {
                log.error("Access Token 발급 실패 - 종목: {}", stockCode);
                return null;
            }
            
            // KIS REST API URL (국내 주식 현재가 조회)
            String apiUrl = baseUrl + "/uapi/domestic-stock/v1/quotations/inquire-price";
            log.info("KIS REST API URL: {}", apiUrl);
            
            // 헤더 설정
            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            headers.set("authorization", "Bearer " + accessToken);
            headers.set("appkey", appKey);
            headers.set("appsecret", appSecret);
            headers.set("tr_id", "FHKST01010100"); // 국내주식 현재가 조회
            
            // 요청 URL 구성 (쿼리 파라미터)
            String fullUrl = apiUrl + "?fid_cond_mrkt_div_code=J&fid_input_iscd=" + stockCode;
            log.info("KIS REST API 요청 URL: {}", fullUrl);
            
            HttpEntity<String> request = new HttpEntity<>(headers);
            
            // API 호출
            ResponseEntity<String> response = restTemplate.exchange(
                fullUrl,
                HttpMethod.GET,
                request,
                String.class
            );
            
            log.info("KIS REST API 응답 상태: {}", response.getStatusCode());
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode responseJson = objectMapper.readTree(response.getBody());
                log.info("KIS REST API 응답 내용: {}", response.getBody());
                
                // 오류 응답 확인
                if (responseJson.has("rt_cd") && !"0".equals(responseJson.get("rt_cd").asText())) {
                    String errorCode = responseJson.get("rt_cd").asText();
                    String errorMsg = responseJson.has("msg1") ? responseJson.get("msg1").asText() : "알 수 없는 오류";
                    log.error("KIS REST API 오류 - 종목: {}, 코드: {}, 메시지: {}", stockCode, errorCode, errorMsg);
                    return null;
                }
                
                // 현재가 정보 추출
                JsonNode output = responseJson.get("output");
                if (output != null) {
                    String currentPrice = output.get("stck_prpr").asText(); // 현재가
                    String previousPrice = output.get("stck_sdpr").asText(); // 기준가(전일종가)
                    String priceChange = output.get("prdy_vrss").asText(); // 전일대비
                    String changeRate = output.get("prdy_ctrt").asText(); // 전일대비율
                    String priceChangeSign = output.get("prdy_vrss_sign").asText(); // 전일대비부호
                    String volume = output.get("acml_vol").asText(); // 누적거래량
                    
                    // 전일종가 기준으로 변화율 재계산
                    BigDecimal currentPriceBd = new BigDecimal(currentPrice);
                    BigDecimal previousPriceBd = new BigDecimal(previousPrice);
                    BigDecimal calculatedChangeRate = calculateChangeRate(currentPriceBd, previousPriceBd);
                    BigDecimal calculatedChangePrice = currentPriceBd.subtract(previousPriceBd);
                    
                    Map<String, Object> result = new HashMap<>();
                    result.put("stockCode", stockCode);
                    result.put("currentPrice", Integer.parseInt(currentPrice));
                    result.put("previousPrice", Integer.parseInt(previousPrice)); // 전일종가 추가
                    result.put("changePrice", calculatedChangePrice.intValue()); // 재계산된 가격차이
                    result.put("changeRate", calculatedChangeRate.floatValue()); // 재계산된 변화율
                    result.put("changeSign", convertPriceChangeSign(priceChangeSign));
                    result.put("volume", 0); // 당일 거래량은 REST API에서 바로 제공하지 않음
                    result.put("accVolume", Long.parseLong(volume));
                    result.put("timestamp", System.currentTimeMillis());
                    result.put("status", "CLOSING_PRICE"); // 종가 데이터임을 표시
                    
                    log.info("KIS REST API 종가 조회 성공 - 종목: {}, 현재가: {}, 전일대비: {}, 전일대비율: {}%", 
                            stockCode, currentPrice, priceChange, changeRate);
                    
                    return result;
                } else {
                    log.error("KIS REST API 응답에서 output 데이터를 찾을 수 없음 - 종목: {}", stockCode);
                    return null;
                }
            } else {
                log.error("KIS REST API 호출 실패 - 종목: {}, 상태: {}, 응답: {}", stockCode, response.getStatusCode(), response.getBody());
                return null;
            }
            
        } catch (Exception e) {
            log.error("KIS REST API 종가 조회 중 오류 발생 - 종목: {}, 오류: {}", stockCode, e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * Access Token 발급 (KisOAuthService 활용)
     */
    private String getAccessToken() {
        try {
            // KisOAuthService에서 제공하는 방식과 동일하게 처리
            return kisOAuthService.getAccessToken();
        } catch (Exception e) {
            log.error("Access Token 발급 실패: {}", e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * 전일대비 부호 변환
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

}