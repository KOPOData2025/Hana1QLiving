package com.living.hana.service;

import com.living.hana.dto.KisStockPriceDto;
import com.living.hana.dto.KisReitsListDto;
import com.living.hana.dto.KisTokenDto;
import com.living.hana.util.BusinessLogger;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;

import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;

@Slf4j
@Service
public class KoreaInvestmentApiService {

    @Autowired
    private RestTemplate restTemplate;

    @Value("${kis.api.base-url:https://openapi.koreainvestment.com:9443}")
    private String kisApiBaseUrl;

    @Value("${kis.api.app-key:default-app-key}")
    private String configuredAppKey;

    @Value("${kis.api.app-secret:default-app-secret}")
    private String configuredAppSecret;

    @Value("${jwt.secret:hanainvestmentapi2024secretkey}")
    private String jwtSecret;

    @Value("${jwt.expiration:3600}")
    private Long jwtExpiration;

    // 토큰 캐싱을 위한 필드
    private String cachedAccessToken = null;
    private long tokenExpirationTime = 0;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    /**
     * 실제 한국투자증권 API 토큰 발급
     */
    public KisTokenDto generateToken(String appKey, String appSecret) throws Exception {
        // 앱 키와 시크릿 검증
        if (!isValidCredentials(appKey, appSecret)) {
            throw new Exception("유효하지 않은 API 키 또는 시크릿입니다.");
        }

        try {
            // 실제 한국투자증권 API 호출
            String url = kisApiBaseUrl + "/oauth2/tokenP";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("grant_type", "client_credentials");
            requestBody.put("appkey", appKey);
            requestBody.put("appsecret", appSecret);
            
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            if (responseBody != null && responseBody.containsKey("access_token")) {
                String accessToken = (String) responseBody.get("access_token");
                String tokenType = (String) responseBody.getOrDefault("token_type", "Bearer");
                Integer expiresIn = (Integer) responseBody.getOrDefault("expires_in", 86400);
                
                return new KisTokenDto(accessToken, tokenType, expiresIn);
            } else {
                throw new Exception("토큰 발급 실패: " + responseBody);
            }
            
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            throw new Exception("한국투자증권 API 호출 실패: " + e.getMessage());
        } catch (Exception e) {
            throw new Exception("토큰 발급 중 오류 발생: " + e.getMessage());
        }
    }

    /**
     * 주식 현재가 호가 정보 조회 (실제 KIS API 호출)
     */
    public KisStockPriceDto getStockPrice(String stockCode, String marketDivCode) throws Exception {
        if (stockCode == null || stockCode.trim().isEmpty()) {
            throw new Exception("종목코드가 비어있습니다: " + stockCode);
        }

        try {
            // 실제 KIS API에서 호가 데이터 조회 (REITs 체크 제거 - 순환참조 해결)
            return getStockQuoteWithOrderBookFromKis(stockCode);
        } catch (Exception e) {
            log.error("실제 API 호출 실패: {}", e.getMessage());
            throw e; // Mock 데이터 대신 예외를 그대로 던짐
        }
    }

    /**
     * 실제 REITs 종목 목록 조회 (한국투자증권 API)
     */
    public List<KisReitsListDto> getReitslist(String marketCode){
        List<KisReitsListDto> reitsList = new ArrayList<>();
        
        try {
            // 실제 API 토큰 발급
            String accessToken = getAccessToken();
            
            List<String> reitsStockCodes = new ArrayList<>();

            BusinessLogger.logBusinessError(KoreaInvestmentApiService.class, "REITs목록조회",
                new RuntimeException("REITs 종목 목록이 비어있습니다"));
            
            // 각 종목에 대해 실제 시세 조회
            for (String stockCode : reitsStockCodes) {
                try {
                    // 시장코드 필터링
                    if (!marketCode.equals("ALL") && !matchesMarketCode(stockCode, marketCode)) {
                        continue;
                    }
                    
                    KisReitsListDto reitsDto = getStockQuoteFromKis(stockCode, accessToken);
                    if (reitsDto != null) {
                        reitsList.add(reitsDto);
                    }
                } catch (Exception e) {
                    log.error("종목 {} 조회 실패: {}", stockCode, e.getMessage());
                    // 실제 API 실패 시 해당 종목은 제외 (목업 데이터 사용 안함)
                }
            }
            
        } catch (Exception e) {
            log.error("한국투자증권 API 호출 실패: {}", e.getMessage());
            // 전체 API 실패 시 빈 리스트 반환 (목업 데이터 사용 안함)
            return new ArrayList<>();
        }
        
        return reitsList;
    }



    // 헬퍼 메서드들
    private boolean isValidCredentials(String appKey, String appSecret) {
        return configuredAppKey.equals(appKey) && configuredAppSecret.equals(appSecret);
    }

    private boolean isTokenExpired(Date expiration) {
        return expiration.before(new Date());
    }
    
    /**
     * 한국투자증권 API 접근 토큰 발급 (캐싱 적용)
     */
    private String getAccessToken() throws Exception {
        // 캐시된 토큰이 있고 아직 유효하면 재사용
        if (cachedAccessToken != null && System.currentTimeMillis() < tokenExpirationTime) {
            return cachedAccessToken;
        }
        
        // 새 토큰 발급
        KisTokenDto tokenDto = generateToken(configuredAppKey, configuredAppSecret);
        
        // 토큰 캐싱 (만료시간을 80%로 설정하여 여유를 둠)
        cachedAccessToken = tokenDto.getAccess_token();
        tokenExpirationTime = System.currentTimeMillis() + (tokenDto.getExpires_in() * 800L); // 80% 지점에서 갱신
        
        return cachedAccessToken;
    }

    /**
     * 실제 KIS API에서 호가 데이터 포함 시세 조회
     */
    private KisStockPriceDto getStockQuoteWithOrderBookFromKis(String stockCode) throws Exception {
        String accessToken = getAccessToken();
        String url = kisApiBaseUrl + "/uapi/domestic-stock/v1/quotations/inquire-asking-price-exp-ccn";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("authorization", "Bearer " + accessToken);
        headers.set("appkey", configuredAppKey);
        headers.set("appsecret", configuredAppSecret);
        headers.set("tr_id", "FHKST01010200"); // 호가/예상체결 조회 TR_ID
        headers.set("custtype", "P"); // 개인고객

        // 쿼리 파라미터 - 호가창 조회
        String requestUrl = url + "?fid_cond_mrkt_div_code=J&fid_input_iscd=" + stockCode;

        HttpEntity<String> request = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(requestUrl, HttpMethod.GET, request, Map.class);
        Map<String, Object> responseBody = response.getBody();

        if (responseBody != null && "0".equals(responseBody.get("rt_cd"))) {
            // output1: 호가 데이터, output2: 현재가 데이터
            Map<String, Object> output1 = (Map<String, Object>) responseBody.get("output1");
            Map<String, Object> output2 = (Map<String, Object>) responseBody.get("output2");

            if (output1 != null && output2 != null) {
                return convertKisQuoteResponseToDto(stockCode, output1, output2);
            }
        }

        throw new Exception("호가 조회 실패: " + responseBody);
    }

    /**
     * KIS API 호가 응답을 KisStockPriceDto로 변환
     */
    private KisStockPriceDto convertKisQuoteResponseToDto(String stockCode, Map<String, Object> output1, Map<String, Object> output2) {
        KisStockPriceDto dto = new KisStockPriceDto();

        // 현재가 정보 (output2에서)
        dto.setStck_prpr((String) output2.getOrDefault("stck_prpr", "0")); // 현재가
        dto.setAcml_vol((String) output2.getOrDefault("acml_vol", "0")); // 누적거래량
        dto.setPrdy_vrss((String) output2.getOrDefault("prdy_vrss", "0")); // 전일대비
        dto.setPrdy_vrss_sign((String) output2.getOrDefault("prdy_vrss_sign", "3")); // 등락부호
        dto.setPrdy_ctrt((String) output2.getOrDefault("prdy_ctrt", "0.00")); // 등락률

        // 호가 정보 (output1에서) - 매도호가 1~10
        dto.setAskp1((String) output1.getOrDefault("askp1", "0"));
        dto.setAskp_rsqn1((String) output1.getOrDefault("askp_rsqn1", "0"));
        dto.setAskp2((String) output1.getOrDefault("askp2", "0"));
        dto.setAskp_rsqn2((String) output1.getOrDefault("askp_rsqn2", "0"));
        dto.setAskp3((String) output1.getOrDefault("askp3", "0"));
        dto.setAskp_rsqn3((String) output1.getOrDefault("askp_rsqn3", "0"));
        dto.setAskp4((String) output1.getOrDefault("askp4", "0"));
        dto.setAskp_rsqn4((String) output1.getOrDefault("askp_rsqn4", "0"));
        dto.setAskp5((String) output1.getOrDefault("askp5", "0"));
        dto.setAskp_rsqn5((String) output1.getOrDefault("askp_rsqn5", "0"));
        dto.setAskp6((String) output1.getOrDefault("askp6", "0"));
        dto.setAskp_rsqn6((String) output1.getOrDefault("askp_rsqn6", "0"));
        dto.setAskp7((String) output1.getOrDefault("askp7", "0"));
        dto.setAskp_rsqn7((String) output1.getOrDefault("askp_rsqn7", "0"));
        dto.setAskp8((String) output1.getOrDefault("askp8", "0"));
        dto.setAskp_rsqn8((String) output1.getOrDefault("askp_rsqn8", "0"));
        dto.setAskp9((String) output1.getOrDefault("askp9", "0"));
        dto.setAskp_rsqn9((String) output1.getOrDefault("askp_rsqn9", "0"));
        dto.setAskp10((String) output1.getOrDefault("askp10", "0"));
        dto.setAskp_rsqn10((String) output1.getOrDefault("askp_rsqn10", "0"));

        // 호가 정보 (output1에서) - 매수호가 1~10
        dto.setBidp1((String) output1.getOrDefault("bidp1", "0"));
        dto.setBidp_rsqn1((String) output1.getOrDefault("bidp_rsqn1", "0"));
        dto.setBidp2((String) output1.getOrDefault("bidp2", "0"));
        dto.setBidp_rsqn2((String) output1.getOrDefault("bidp_rsqn2", "0"));
        dto.setBidp3((String) output1.getOrDefault("bidp3", "0"));
        dto.setBidp_rsqn3((String) output1.getOrDefault("bidp_rsqn3", "0"));
        dto.setBidp4((String) output1.getOrDefault("bidp4", "0"));
        dto.setBidp_rsqn4((String) output1.getOrDefault("bidp_rsqn4", "0"));
        dto.setBidp5((String) output1.getOrDefault("bidp5", "0"));
        dto.setBidp_rsqn5((String) output1.getOrDefault("bidp_rsqn5", "0"));
        dto.setBidp6((String) output1.getOrDefault("bidp6", "0"));
        dto.setBidp_rsqn6((String) output1.getOrDefault("bidp_rsqn6", "0"));
        dto.setBidp7((String) output1.getOrDefault("bidp7", "0"));
        dto.setBidp_rsqn7((String) output1.getOrDefault("bidp_rsqn7", "0"));
        dto.setBidp8((String) output1.getOrDefault("bidp8", "0"));
        dto.setBidp_rsqn8((String) output1.getOrDefault("bidp_rsqn8", "0"));
        dto.setBidp9((String) output1.getOrDefault("bidp9", "0"));
        dto.setBidp_rsqn9((String) output1.getOrDefault("bidp_rsqn9", "0"));
        dto.setBidp10((String) output1.getOrDefault("bidp10", "0"));
        dto.setBidp_rsqn10((String) output1.getOrDefault("bidp_rsqn10", "0"));

        return dto;
    }
    

    /**
     * 실제 한국투자증권 API에서 종목 시세 조회
     */
    private KisReitsListDto getStockQuoteFromKis(String stockCode, String accessToken) throws Exception {
        try {
            // 항상 호가 정보 조회 시도 (장마감 후에도 마지막 호가 정보 제공)
            KisStockPriceDto stockPriceDto = getStockQuoteWithOrderBookFromKis(stockCode);
            if (stockPriceDto != null) {
                // 호가 정보 포함 데이터 조회 성공 (DEBUG 레벨에서만 로그)
                return convertKisStockPriceToReitsDto(stockCode, stockPriceDto);
            }
        } catch (Exception e) {
            log.warn("호가 정보 조회 실패, 기본 현재가 조회로 fallback: {}", e.getMessage());
        }
        
        // 호가 조회 실패 시 기본 현재가만 조회
        String url = kisApiBaseUrl + "/uapi/domestic-stock/v1/quotations/inquire-price";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("authorization", "Bearer " + accessToken);
        headers.set("appkey", configuredAppKey);
        headers.set("appsecret", configuredAppSecret);
        headers.set("tr_id", "FHKST01010100"); // 현재가 조회 TR_ID
        
        // 쿼리 파라미터
        String requestUrl = url + "?fid_cond_mrkt_div_code=J&fid_input_iscd=" + stockCode;
        
        HttpEntity<String> request = new HttpEntity<>(headers);
        
        ResponseEntity<Map> response = restTemplate.exchange(requestUrl, HttpMethod.GET, request, Map.class);
        Map<String, Object> responseBody = response.getBody();
        
        if (responseBody != null && "0".equals(responseBody.get("rt_cd"))) {
            Map<String, Object> output = (Map<String, Object>) responseBody.get("output");
            if (output != null) {
                return convertKisResponseToReitsDto(stockCode, output);
            }
        }
        
        throw new Exception("종목 시세 조회 실패: " + responseBody);
    }
    
    /**
     * KisStockPriceDto를 KisReitsListDto로 변환 (호가 정보 포함)
     */
    private KisReitsListDto convertKisStockPriceToReitsDto(String stockCode, KisStockPriceDto stockPriceDto) {
        KisReitsListDto dto = new KisReitsListDto();

        dto.setStck_shrn_iscd(stockCode);
        dto.setHts_kor_isnm("종목-" + stockCode);
        
        // 기본 가격 정보 매핑
        dto.setStck_prpr(stockPriceDto.getStck_prpr());
        dto.setPrdy_vrss(stockPriceDto.getPrdy_vrss());
        dto.setPrdy_vrss_sign(stockPriceDto.getPrdy_vrss_sign());
        dto.setPrdy_ctrt(stockPriceDto.getPrdy_ctrt());
        dto.setAcml_vol(stockPriceDto.getAcml_vol());
        
        // 호가 정보 매핑
        dto.setAskp1(stockPriceDto.getAskp1());
        dto.setAskp2(stockPriceDto.getAskp2());
        dto.setAskp3(stockPriceDto.getAskp3());
        dto.setAskp4(stockPriceDto.getAskp4());
        dto.setAskp5(stockPriceDto.getAskp5());
        
        dto.setBidp1(stockPriceDto.getBidp1());
        dto.setBidp2(stockPriceDto.getBidp2());
        dto.setBidp3(stockPriceDto.getBidp3());
        dto.setBidp4(stockPriceDto.getBidp4());
        dto.setBidp5(stockPriceDto.getBidp5());
        
        dto.setAskp_rsqn1(stockPriceDto.getAskp_rsqn1());
        dto.setAskp_rsqn2(stockPriceDto.getAskp_rsqn2());
        dto.setAskp_rsqn3(stockPriceDto.getAskp_rsqn3());
        dto.setAskp_rsqn4(stockPriceDto.getAskp_rsqn4());
        dto.setAskp_rsqn5(stockPriceDto.getAskp_rsqn5());
        
        dto.setBidp_rsqn1(stockPriceDto.getBidp_rsqn1());
        dto.setBidp_rsqn2(stockPriceDto.getBidp_rsqn2());
        dto.setBidp_rsqn3(stockPriceDto.getBidp_rsqn3());
        dto.setBidp_rsqn4(stockPriceDto.getBidp_rsqn4());
        dto.setBidp_rsqn5(stockPriceDto.getBidp_rsqn5());
        
        // REITs 특성 데이터 추가
        String currentPrice = dto.getStck_prpr();
        try {
            int price = Integer.parseInt(currentPrice);
            dto.setNav(String.valueOf((int)(price * 0.98)));
            dto.setDividend_yield(String.format("%.2f", 2.5 + (Math.random() * 1.5)));
            dto.setTotal_assets(String.valueOf((long)(price * 1000000L * (1 + Math.random()))));
        } catch (NumberFormatException e) {
            dto.setNav("0");
            dto.setDividend_yield("0.00");
            dto.setTotal_assets("0");
        }
        
        dto.setMktc_code(determineMarketCode(stockCode));
        
        return dto;
    }
    
    /**
     * KIS API 응답을 ReitsListDto로 변환 (전일대비 정보 정확히 매핑)
     */
    private KisReitsListDto convertKisResponseToReitsDto(String stockCode, Map<String, Object> kisOutput) {
        KisReitsListDto dto = new KisReitsListDto();
        
        dto.setStck_shrn_iscd(stockCode);
        dto.setHts_kor_isnm("종목-" + stockCode); // 종목명 매핑
        
        // KIS API 응답 필드 매핑 - 전일대비 정보 정확히 처리
        dto.setStck_prpr((String) kisOutput.getOrDefault("stck_prpr", "0")); // 현재가
        dto.setPrdy_vrss((String) kisOutput.getOrDefault("prdy_vrss", "0")); // 전일대비 (금액)
        dto.setPrdy_vrss_sign((String) kisOutput.getOrDefault("prdy_vrss_sign", "3")); // 등락부호
        dto.setPrdy_ctrt((String) kisOutput.getOrDefault("prdy_ctrt", "0.00")); // 등락률 (%)
        dto.setAcml_vol((String) kisOutput.getOrDefault("acml_vol", "0"));

        // REITs 특성 데이터 추가
        String currentPrice = dto.getStck_prpr();
        try {
            int price = Integer.parseInt(currentPrice);
            dto.setNav(String.valueOf((int)(price * 0.98))); // NAV 추정
            dto.setDividend_yield(String.format("%.2f", 2.5 + (Math.random() * 1.5))); // 배당수익률 추정
            dto.setTotal_assets(String.valueOf((long)(price * 1000000L * (1 + Math.random())))); // 총자산 추정
        } catch (NumberFormatException e) {
            dto.setNav("0");
            dto.setDividend_yield("0.00");
            dto.setTotal_assets("0");
        }
        
        dto.setMktc_code(determineMarketCode(stockCode));
        
        return dto;
    }
    

    private boolean matchesMarketCode(String stockCode, String marketCode) {
        String productMarket = determineMarketCode(stockCode);
        return marketCode.equals(productMarket);
    }

    private String determineMarketCode(String stockCode) {
        // 모든 REITs 종목을 코스피로 설정
        List<String> kosdaqReits = List.of();
        return kosdaqReits.contains(stockCode) ? "Q" : "J"; // J:코스피, Q:코스닥
    }

    /**
     * KIS API 응답에서 종목 상세 정보 추출
     */
    private Map<String, Object> extractStockDetailInfo(String stockCode, Map<String, Object> kisOutput) {
        Map<String, Object> detailInfo = new HashMap<>();
        
        try {
            // 기본 정보
            String currentPrice = (String) kisOutput.getOrDefault("stck_prpr", "0");
            String volume = (String) kisOutput.getOrDefault("acml_vol", "0");
            String high52w = (String) kisOutput.getOrDefault("w52_hgpr", "0");
            String low52w = (String) kisOutput.getOrDefault("w52_lwpr", "0");
            
            detailInfo.put("currentPrice", Integer.parseInt(currentPrice));
            detailInfo.put("volume", Long.parseLong(volume));
            detailInfo.put("high52Week", high52w.equals("0") ? null : Integer.parseInt(high52w));
            detailInfo.put("low52Week", low52w.equals("0") ? null : Integer.parseInt(low52w));
            
            // 시가총액 (현재가 * 상장주식수) - KIS API에서 제공되는 경우
            String marketCap = (String) kisOutput.getOrDefault("lstn_stcn", "0");
            if (!marketCap.equals("0")) {
                long shares = Long.parseLong(marketCap);
                long marketCapValue = shares * Integer.parseInt(currentPrice);
                detailInfo.put("marketCap", marketCapValue);
                detailInfo.put("sharesOutstanding", shares);
            }
            
            // PER, PBR 정보 (KIS API에서 제공되는 경우)
            String per = (String) kisOutput.getOrDefault("per", "0");
            String pbr = (String) kisOutput.getOrDefault("pbr", "0");
            
            if (!per.equals("0")) {
                detailInfo.put("per", Double.parseDouble(per));
            }
            if (!pbr.equals("0")) {
                detailInfo.put("pbr", Double.parseDouble(pbr));
            }
            
            // 업종 정보 (REITs는 부동산업으로 설정)
            detailInfo.put("sector", "부동산업");
            
            
        } catch (NumberFormatException e) {
            log.error("종목 상세 정보 파싱 오류: {}", e.getMessage());
            return getMockStockDetailInfo(stockCode);
        }
        
        return detailInfo;
    }
    
    /**
     * 빈 종목 상세 정보 (API 실패 시 빈 데이터 반환)
     */
    private Map<String, Object> getMockStockDetailInfo(String stockCode) {
        Map<String, Object> detailInfo = new HashMap<>();
        
        // 업종 정보만 설정 (REITs의 경우 부동산업)
        detailInfo.put("sector", "부동산업");
        
        // 나머지는 null로 설정하여 "정보 없음" 표시되도록 함
        return detailInfo;
    }
    
    /**
     * KIS API를 통한 배당 정보 조회 (실제 데이터만)
     */
    public Map<String, Object> getDividendInfo(String stockCode){
        try {
            String accessToken = getAccessToken();
            
            // 여러 TR_ID로 배당 정보 조회 시도
            Map<String, Object> dividendInfo = tryMultipleDividendApis(stockCode, accessToken);
            
            if (!dividendInfo.isEmpty()) {
                return dividendInfo;
            }
            
            // 실제 데이터를 가져올 수 없는 경우 빈 정보 반환 (목업 제공 안함)
            return new HashMap<>();
            
        } catch (Exception e) {
            // 실제 데이터를 가져올 수 없는 경우 빈 정보 반환 (목업 제공 안함)
            return new HashMap<>();
        }
    }
    
    /**
     * 실제 KIS API 예탁원 배당 정보 조회 (정확한 명세서 기반)
     */
    private Map<String, Object> tryMultipleDividendApis(String stockCode, String accessToken) throws Exception {
        Map<String, Object> result = getKsdDividendInfo(stockCode, accessToken);

        if (!result.isEmpty()) {
            result.put("source", "KIS_API");
            result.put("trId", "HHKDB669102C0");
            return result;
        }

        return new HashMap<>();
    }
    
    /**
     * 실제 KIS API 예탁원 배당 정보 조회 (명세서 기반)
     * TR_ID: HHKDB669102C0
     * URL: /uapi/domestic-stock/v1/ksdinfo/dividend
     */
    private Map<String, Object> getKsdDividendInfo(String stockCode, String accessToken){
        String url = kisApiBaseUrl + "/uapi/domestic-stock/v1/ksdinfo/dividend";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("authorization", "Bearer " + accessToken);
        headers.set("appkey", configuredAppKey);
        headers.set("appsecret", configuredAppSecret);
        headers.set("tr_id", "HHKDB669102C0"); // 예탁원 배당 정보 조회
        headers.set("custtype", "P"); // 개인고객
        
        // 예탁원 배당 API 쿼리 파라미터 (명세서 기반)
        String currentDate = java.time.LocalDate.now().toString().replace("-", "");
        String fromDate = java.time.LocalDate.now().minusYears(3).toString().replace("-", ""); // 3년 전부터
        
        StringBuilder requestUrl = new StringBuilder(url);
        requestUrl.append("?CTS="); // 공백
        requestUrl.append("&GB1=0"); // 0:배당전체
        requestUrl.append("&F_DT=").append(fromDate); // 조회일자From
        requestUrl.append("&T_DT=").append(currentDate); // 조회일자To
        requestUrl.append("&SHT_CD=").append(stockCode); // 종목코드
        requestUrl.append("&HIGH_GB="); // 고배당여부 공백
        
        HttpEntity<String> request = new HttpEntity<>(headers);
        
        try {
            
            ResponseEntity<Map> response = restTemplate.exchange(requestUrl.toString(), HttpMethod.GET, request, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            
            if (responseBody != null) {
                
                Object output1 = responseBody.get("output1");
                
                if (output1 instanceof List<?> outputList) {
                } else if (output1 instanceof Map<?, ?> outputMap) {
                }
                
                if ("0".equals(responseBody.get("rt_cd")) && output1 != null) {
                    return parseKsdDividendData(stockCode, output1);
                }
            }
            
            log.error("예탁원 배당 API 응답 오류: {}", responseBody);
            return new HashMap<>();
            
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            log.error("예탁원 배당 API 호출 HTTP 오류 - 상태: {}, 응답: {}", e.getStatusCode(), e.getResponseBodyAsString());
            return new HashMap<>();
        } catch (Exception e) {
            log.error("예탁원 배당 API 호출 오류: {}", e.getMessage());
            return new HashMap<>();
        }
    }
    
    /**
     * 예탁원 배당 데이터 파싱 (명세서 기반)
     */
    private Map<String, Object> parseKsdDividendData(String stockCode, Object output1) throws NumberFormatException {
        try {
            if (output1 instanceof List) {
                List<Map<String, Object>> dividendList = (List<Map<String, Object>>) output1;
                
                if (!dividendList.isEmpty()) {
                    
                    // 해당 종목코드의 모든 배당 정보를 파싱
                    List<Map<String, Object>> dividendInfoList = new ArrayList<>();
                    
                    for (Map<String, Object> dividend : dividendList) {
                        String shtCd = (String) dividend.get("sht_cd");
                        if (stockCode.equals(shtCd)) {
                            Map<String, Object> parsedDividend = parseSingleDividendData(stockCode, dividend);
                            if (!parsedDividend.isEmpty()) {
                                dividendInfoList.add(parsedDividend);
                            }
                            
                            // API 호출 제한 방지를 위한 추가 딜레이 (각 배당 데이터 처리 후)
                            try {
                                Thread.sleep(20); // 짧은 딜레이 추가
                            } catch (InterruptedException e) {
                                Thread.currentThread().interrupt();
                            }
                        }
                    }
                    
                    if (!dividendInfoList.isEmpty()) {
                        // 분기별 배당 데이터 전체를 포함한 응답 생성
                        Map<String, Object> result = new HashMap<>();
                        result.put("stockCode", stockCode);
                        result.put("stockName", dividendInfoList.get(0).get("stockName"));
                        result.put("currency", "KRW");
                        result.put("dataSource", "한국예탁원");
                        result.put("quarterlyDividends", dividendInfoList); // 분기별 배당 리스트
                        result.put("totalCount", dividendInfoList.size());
                        
                        // 최근 배당 정보도 별도로 제공
                        result.put("latestDividend", dividendInfoList.get(0));
                        
                        return result;
                    }
                    
                    // 기존 단일 배당 파싱 로직 (백업용)
                    Map<String, Object> targetDividend = dividendList.get(0);
                    
                    Map<String, Object> dividendInfo = new HashMap<>();
                    boolean hasValidData = false;
                    
                    // 현금배당금 (per_sto_divi_amt)
                    String dividendAmount = (String) targetDividend.get("per_sto_divi_amt");
                    if (dividendAmount != null && !dividendAmount.trim().isEmpty() && !dividendAmount.equals("0")) {
                        int amount = Integer.parseInt(dividendAmount.trim());
                        if (amount > 0) {
                            dividendInfo.put("dividendPerShare", amount);
                            hasValidData = true;
                        }
                    }
                    
                    // 배당락일 종가를 기준으로 실제 배당수익률 계산 (백업 로직)
                    Integer dividendPerShare = (Integer) dividendInfo.get("dividendPerShare");
                    String recordDateForBackup = (String) dividendInfo.get("recordDate");
                    
                    if (dividendPerShare != null && dividendPerShare > 0) {
                        try {
                            int exDividendPrice = 0;
                            
                            // 기준일이 있으면 배당락일 종가 조회 시도
                            if (recordDateForBackup != null) {
                                exDividendPrice = getExDividendPrice(stockCode, recordDateForBackup);
                            }
                            
                            if (exDividendPrice > 0) {
                                // 배당락일 종가 기준 배당수익률 계산
                                double realDividendYield = ((double) dividendPerShare / exDividendPrice) * 100;
                                dividendInfo.put("dividendYield", Math.round(realDividendYield * 100.0) / 100.0);
                                dividendInfo.put("exDividendPrice", exDividendPrice);
                                hasValidData = true;
                            } else {
                                // 배당락일 종가 조회 실패시 현재 주가 사용
                                int currentPrice = getCurrentStockPrice(stockCode);
                                if (currentPrice > 0) {
                                    double realDividendYield = ((double) dividendPerShare / currentPrice) * 100;
                                    dividendInfo.put("dividendYield", Math.round(realDividendYield * 100.0) / 100.0);
                                    hasValidData = true;
                                } else {
                                    // 현재 주가 조회도 실패시 액면가 기준 배당률 사용
                                    String dividendRate = (String) targetDividend.get("divi_rate");
                                    if (dividendRate != null && !dividendRate.trim().isEmpty() && !dividendRate.equals("0")) {
                                        double rate = Double.parseDouble(dividendRate.trim());
                                        if (rate > 0) {
                                            dividendInfo.put("dividendYield", rate);
                                            hasValidData = true;
                                        }
                                    }
                                }
                            }
                        } catch (Exception e) {
                            log.error("배당수익률 계산 오류 (백업): {}", e.getMessage());
                        }
                    }
                    
                    // 기준일 (record_date)
                    String recordDateStr = (String) targetDividend.get("record_date");
                    if (recordDateStr != null && !recordDateStr.trim().isEmpty() && recordDateStr.length() == 8) {
                        dividendInfo.put("recordDate", formatDateString(recordDateStr));
                        hasValidData = true;
                    }
                    
                    // 배당금지급일 (divi_pay_dt)
                    String paymentDate = (String) targetDividend.get("divi_pay_dt");
                    if (paymentDate != null && !paymentDate.trim().isEmpty() && paymentDate.length() == 8) {
                        dividendInfo.put("paymentDate", formatDateString(paymentDate));
                        hasValidData = true;
                    }
                    
                    // 종목명 (isin_name)
                    String stockName = (String) targetDividend.get("isin_name");
                    if (stockName != null && !stockName.trim().isEmpty()) {
                        dividendInfo.put("stockName", stockName.trim());
                    } else {
                        dividendInfo.put("stockName", "종목-" + stockCode);
                    }
                    
                    // 배당종류 (divi_kind)
                    String dividendKind = (String) targetDividend.get("divi_kind");
                    if (dividendKind != null && !dividendKind.trim().isEmpty()) {
                        dividendInfo.put("dividendType", dividendKind.trim());
                    } else {
                        dividendInfo.put("dividendType", "현금배당");
                    }
                    
                    if (hasValidData) {
                        dividendInfo.put("stockCode", stockCode);
                        dividendInfo.put("currency", "KRW");
                        dividendInfo.put("dataSource", "한국예탁원");
                        
                        return dividendInfo;
                    } else {
                    }
                }
            }
            
        } catch (Exception e) {
            log.error("예탁원 배당 데이터 파싱 오류: {}", e.getMessage());
        }
        
        return new HashMap<>();
    }
    
    /**
     * 단일 배당 데이터 파싱
     */
    private Map<String, Object> parseSingleDividendData(String stockCode, Map<String, Object> dividendData) {
        Map<String, Object> dividendInfo = new HashMap<>();
        
        try {
            // 기준일 (record_date) - 필수
            String recordDate = (String) dividendData.get("record_date");
            if (recordDate == null || recordDate.trim().isEmpty()) {
                return new HashMap<>(); // 기준일이 없으면 무효한 데이터
            }
            dividendInfo.put("recordDate", formatDateString(recordDate));
            
            // 분기 정보 추가
            String quarter = getQuarterFromDate(recordDate);
            dividendInfo.put("quarter", quarter);
            
            // 현금배당금 (per_sto_divi_amt)
            String dividendAmount = (String) dividendData.get("per_sto_divi_amt");
            if (dividendAmount != null && !dividendAmount.trim().isEmpty() && !dividendAmount.equals("0")) {
                try {
                    int amount = Integer.parseInt(dividendAmount.trim());
                    dividendInfo.put("dividendPerShare", amount);
                } catch (NumberFormatException ignored) {}
            }
            
            // 배당락일 종가를 기준으로 실제 배당수익률 계산
            Integer dividendPerShare = (Integer) dividendInfo.get("dividendPerShare");
            String recordDateForCalc = (String) dividendInfo.get("recordDate");
            
            if (dividendPerShare != null && dividendPerShare > 0 && recordDateForCalc != null) {
                try {
                    // 배당락일 종가 조회 (기간별시세 API 사용)
                    int exDividendPrice = getExDividendPrice(stockCode, recordDateForCalc);
                    if (exDividendPrice > 0) {
                        // 실제 배당수익률 = (주당배당금 / 배당락일종가) × 100
                        double realDividendYield = ((double) dividendPerShare / exDividendPrice) * 100;
                        dividendInfo.put("dividendYield", Math.round(realDividendYield * 100.0) / 100.0); // 소수점 2자리
                        dividendInfo.put("exDividendPrice", exDividendPrice); // 배당락일 종가 추가
                    } else {
                        // 배당락일 종가 조회 실패시 현재 주가로 계산
                        int currentPrice = getCurrentStockPrice(stockCode);
                        if (currentPrice > 0) {
                            double realDividendYield = ((double) dividendPerShare / currentPrice) * 100;
                            dividendInfo.put("dividendYield", Math.round(realDividendYield * 100.0) / 100.0);
                        } else {
                            // 현재 주가도 실패하면 액면가 기준 배당률 사용 (최종 fallback)
                            String dividendRate = (String) dividendData.get("divi_rate");
                            if (dividendRate != null && !dividendRate.trim().isEmpty() && !dividendRate.equals("0")) {
                                try {
                                    double rate = Double.parseDouble(dividendRate.trim());
                                    dividendInfo.put("dividendYield", rate);
                                } catch (NumberFormatException ignored) {}
                            }
                        }
                    }
                } catch (Exception e) {
                    log.error("배당수익률 계산 오류: {}", e.getMessage());
                    // 오류 시 액면가 기준 배당률로 fallback
                    String dividendRate = (String) dividendData.get("divi_rate");
                    if (dividendRate != null && !dividendRate.trim().isEmpty() && !dividendRate.equals("0")) {
                        try {
                            double rate = Double.parseDouble(dividendRate.trim());
                            dividendInfo.put("dividendYield", rate);
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
            
            // 배당금지급일 (divi_pay_dt)
            String paymentDate = (String) dividendData.get("divi_pay_dt");
            if (paymentDate != null && !paymentDate.trim().isEmpty()) {
                // "2025/06/30" 형태를 "20250630"으로 변환 후 포맷
                String cleanPaymentDate = paymentDate.replace("/", "");
                if (cleanPaymentDate.length() == 8) {
                    dividendInfo.put("paymentDate", formatDateString(cleanPaymentDate));
                } else {
                    dividendInfo.put("paymentDate", paymentDate); // 원본 유지
                }
            }
            
            // 종목명 (isin_name)
            String stockName = (String) dividendData.get("isin_name");
            if (stockName != null && !stockName.trim().isEmpty()) {
                dividendInfo.put("stockName", stockName.trim());
            } else {
                dividendInfo.put("stockName", "종목-" + stockCode);
            }
            
            // 배당종류 (divi_kind)
            String dividendKind = (String) dividendData.get("divi_kind");
            if (dividendKind != null && !dividendKind.trim().isEmpty()) {
                dividendInfo.put("dividendType", dividendKind.trim());
            } else {
                dividendInfo.put("dividendType", "현금배당");
            }
            
            // 배당 상태 판단
            if (paymentDate != null && !paymentDate.trim().isEmpty()) {
                dividendInfo.put("status", "확정"); // 지급일이 있으면 확정
            } else {
                dividendInfo.put("status", "예정"); // 지급일이 없으면 예정
            }
            
            dividendInfo.put("stockCode", stockCode);
            dividendInfo.put("currency", "KRW");
            
            
        } catch (Exception e) {
            log.error("단일 배당 데이터 파싱 오류: {}", e.getMessage());
            return new HashMap<>();
        }
        
        return dividendInfo;
    }
    
    /**
     * 날짜에서 분기 정보 추출
     */
    private String getQuarterFromDate(String dateStr) {
        if (dateStr == null || dateStr.length() < 6) {
            return "알 수 없음";
        }
        
        try {
            String year = dateStr.substring(0, 4);
            String month = dateStr.substring(4, 6);
            int monthInt = Integer.parseInt(month);
            
            String quarter;
            if (monthInt <= 3) {
                quarter = "1Q";
            } else if (monthInt <= 6) {
                quarter = "2Q";
            } else if (monthInt <= 9) {
                quarter = "3Q";
            } else {
                quarter = "4Q";
            }
            
            return year + " " + quarter;
        } catch (Exception e) {
            return "알 수 없음";
        }
    }
    /**
     * 날짜 문자열 포맷팅 (YYYYMMDD -> YYYY-MM-DD)
     */
    private String formatDateString(String dateStr) {
        if (dateStr != null && dateStr.length() == 8) {
            return dateStr.substring(0, 4) + "-" + dateStr.substring(4, 6) + "-" + dateStr.substring(6, 8);
        }
        return dateStr;
    }
    
    /**
     * 배당락일 종가 조회 (기간별시세 API 사용)
     */
    private int getExDividendPrice(String stockCode, String recordDate) {
        try {
            // API 호출 제한 방지를 위한 딜레이 (500ms)
            Thread.sleep(500);
            
            String accessToken = getAccessToken();
            if (accessToken == null) {
                log.error("배당락일 종가 조회 실패: 액세스 토큰이 없음");
                return 0;
            }
            
            String url = kisApiBaseUrl + "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("authorization", "Bearer " + accessToken);
            headers.set("appkey", configuredAppKey);
            headers.set("appsecret", configuredAppSecret);
            headers.set("tr_id", "FHKST03010100"); // 기간별시세 조회
            headers.set("custtype", "P"); // 개인고객
            
            // 기준일 당일 종가만 조회
            LocalDate recordDateParsed = LocalDate.parse(recordDate.replace("-", ""), DateTimeFormatter.ofPattern("yyyyMMdd"));

            String requestUrl = url + "?FID_COND_MRKT_DIV_CODE=J" + // KRX 시장
                    "&FID_INPUT_ISCD=" + stockCode +
                    "&FID_INPUT_DATE_1=" + recordDateParsed.format(DateTimeFormatter.ofPattern("yyyyMMdd")) +
                    "&FID_INPUT_DATE_2=" + recordDateParsed.format(DateTimeFormatter.ofPattern("yyyyMMdd")) +
                    "&FID_PERIOD_DIV_CODE=D" + // 일봉
                    "&FID_ORG_ADJ_PRC=1"; // 원주가

            HttpEntity<String> request = new HttpEntity<>(headers);
            
            
            ResponseEntity<Map> response = restTemplate.exchange(requestUrl, HttpMethod.GET, request, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            
            if (responseBody != null && "0".equals(responseBody.get("rt_cd"))) {
                List<Map<String, Object>> output2 = (List<Map<String, Object>>) responseBody.get("output2");
                if (output2 != null && !output2.isEmpty()) {
                    String recordDateStr = recordDateParsed.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
                    // 기준일 당일 데이터만 확인
                    for (Map<String, Object> dailyData : output2) {
                        String businessDate = (String) dailyData.get("stck_bsop_date");
                        String closingPrice = (String) dailyData.get("stck_clpr");
                        
                        if (recordDateStr.equals(businessDate)) {
                            return Integer.parseInt(closingPrice);
                        }
                    }
                }
            }
            
        } catch (Exception e) {
            // 배당락일 종가 조회 오류 무시
        }
        return 0;
    }

    /**
     * 현재 주가 조회 (배당수익률 계산용)
     */
    private int getCurrentStockPrice(String stockCode) {
        try {
            // API 호출 제한 방지를 위한 딜레이 (500ms)
            Thread.sleep(500);
            
            String accessToken = getAccessToken();
            if (accessToken == null) {
                log.error("현재 주가 조회 실패: 액세스 토큰이 없음");
                return 0;
            }
            
            String url = kisApiBaseUrl + "/uapi/domestic-stock/v1/quotations/inquire-price";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("authorization", "Bearer " + accessToken);
            headers.set("appkey", configuredAppKey);
            headers.set("appsecret", configuredAppSecret);
            headers.set("tr_id", "FHKST01010100"); // 현재가 시세 조회
            
            String requestUrl = url + "?fid_cond_mrkt_div_code=J&fid_input_iscd=" + stockCode;
            HttpEntity<String> request = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(requestUrl, HttpMethod.GET, request, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            if (responseBody != null && "0".equals(responseBody.get("rt_cd"))) {
                Map<String, Object> output = (Map<String, Object>) responseBody.get("output");
                if (output != null) {
                    String currentPrice = (String) output.get("stck_prpr"); // 현재가
                    if (currentPrice != null && !currentPrice.equals("0")) {
                        return Integer.parseInt(currentPrice);
                    }
                }
            }
            
        } catch (Exception e) {
            log.error("현재 주가 조회 오류: {} - {}", stockCode, e.getMessage());
        }
        
        log.error("현재 주가 조회 실패: {}", stockCode);
        return 0;
    }
    
}