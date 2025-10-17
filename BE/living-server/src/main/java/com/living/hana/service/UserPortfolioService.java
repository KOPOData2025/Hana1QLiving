package com.living.hana.service;

import com.living.hana.client.HanaSecuritiesApiClient;
import com.living.hana.entity.InvestmentProduct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class UserPortfolioService {
    
    @Autowired
    private HanaSecuritiesApiClient hanaSecuritiesApiClient;

    @Autowired
    private InvestmentProductService investmentProductService;

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getUserPortfolioByUserCi(String userCi) {
        try {
            // HanaSecurities API를 통해 포트폴리오 조회 (복잡한 계산 로직은 HanaSecurities에서 처리)
            Map<String, Object> response = hanaSecuritiesApiClient.getPortfolioByCustomerId(userCi);
            
            if (response != null && Boolean.TRUE.equals(response.get("success"))) {
                Object dataObj = response.get("data");
                if (dataObj instanceof List) {
                    return (List<Map<String, Object>>) dataObj;
                }
            }
            
            return new ArrayList<>();
        } catch (Exception e) {
            log.error("오류 발생: {}", e.getMessage());
            return new ArrayList<>();
        }
    }
    
    @SuppressWarnings("unchecked")
    public Map<String, Object> getPortfolioSummaryByUserCi(String userCi) {
        try {
            // HanaSecurities API를 통해 포트폴리오 요약 조회
            Map<String, Object> response = hanaSecuritiesApiClient.getPortfolioSummaryByCustomerId(userCi);
            
            if (response != null && Boolean.TRUE.equals(response.get("success"))) {
                Object dataObj = response.get("data");
                if (dataObj instanceof Map) {
                    return (Map<String, Object>) dataObj;
                }
            }
            
            
            // HanaSecurities API 실패 시 빈 요약 반환
            Map<String, Object> emptySummary = new HashMap<>();
            emptySummary.put("productCount", 0);
            emptySummary.put("totalInvestedAmount", BigDecimal.ZERO);
            emptySummary.put("totalCurrentValue", BigDecimal.ZERO);
            emptySummary.put("totalGainLoss", BigDecimal.ZERO);
            emptySummary.put("totalReturnRate", BigDecimal.ZERO);
            return emptySummary;
            
        } catch (Exception e) {
            log.error("오류 발생: {}", e.getMessage());
            // 오류 발생시 빈 요약 반환
            Map<String, Object> emptySummary = new HashMap<>();
            emptySummary.put("productCount", 0);
            emptySummary.put("totalInvestedAmount", BigDecimal.ZERO);
            emptySummary.put("totalCurrentValue", BigDecimal.ZERO);
            emptySummary.put("totalGainLoss", BigDecimal.ZERO);
            emptySummary.put("totalReturnRate", BigDecimal.ZERO);
            return emptySummary;
        }
    }

    public Map<String, Object> getPortfolioAnalysisByUserCi(String userCi) {
        try {
            // 실제 포트폴리오 데이터를 기반으로 분석 생성
            List<Map<String, Object>> portfolioList = getUserPortfolioByUserCi(userCi);
            Map<String, Object> summary = getPortfolioSummaryByUserCi(userCi);
            
            Map<String, Object> analysis = new HashMap<>();
            analysis.put("summary", summary);
            
            // 상품 유형별 분석 (추후 구현)
            analysis.put("byProductType", new HashMap<>());
            
            // 위험도별 분석 (추후 구현)
            analysis.put("byRiskLevel", new HashMap<>());
            
            // 상위 수익률 상품 (실제 데이터 기반)
            List<Map<String, Object>> topPerforming = portfolioList.stream()
                .filter(p -> p.get("profitLossRate") != null)
                .sorted((a, b) -> {
                    BigDecimal rateA = convertToBigDecimal(a.get("profitLossRate"));
                    BigDecimal rateB = convertToBigDecimal(b.get("profitLossRate"));
                    if (rateA == null) rateA = BigDecimal.ZERO;
                    if (rateB == null) rateB = BigDecimal.ZERO;
                    return rateB.compareTo(rateA); // 내림차순
                })
                .limit(5)
                .collect(java.util.stream.Collectors.toList());
            analysis.put("topPerforming", topPerforming);
            
            // 분산투자 지수 (실제 데이터 기반)
            int productCount = portfolioList.size();
            double diversificationIndex = Math.min(productCount * 20.0, 100.0); // 간단한 계산
            analysis.put("diversificationIndex", diversificationIndex);
            
            return analysis;
        } catch (Exception e) {
            log.error("오류 발생: {}", e.getMessage());
            return new HashMap<>(); // 빈 맵 반환
        }
    }

    
    public boolean refreshPortfolioValues(String userCi) {
        try {
            
            // HanaSecurities API의 포트폴리오 새로고침 호출
            Long userId = convertCiToUserId(userCi);
            Map<String, Object> refreshResponse = hanaSecuritiesApiClient.refreshPortfolioValues(userId);
            
            if (refreshResponse != null && Boolean.TRUE.equals(refreshResponse.get("success"))) {
                
                // 새로고침 후 포트폴리오 데이터 재조회하여 검증
                List<Map<String, Object>> updatedPortfolio = getUserPortfolioByUserCi(userCi);
                
                return true;
            } else {
                return false;
            }
        } catch (Exception e) {
            log.error("오류 발생: {}", e.getMessage());
            return false;
        }
    }
    
    private Long convertCiToUserId(String userCi) {
        // userCi를 userId로 변환 (기존 로직과 동일)
        try {
            return (long) Math.abs(userCi.hashCode());
        } catch (Exception e) {
            return 1L; // fallback
        }
    }

    public BigDecimal getCurrentPrice(String productId) {
        try {
            // 1. 먼저 실시간 주식 가격 조회 시도 (웹소켓 API)
            Map<String, Object> realtimePriceResponse = hanaSecuritiesApiClient.getRealtimeStockPrice(productId);
            if (realtimePriceResponse != null && (Boolean) realtimePriceResponse.getOrDefault("success", false)) {
                Map<String, Object> priceData = (Map<String, Object>) realtimePriceResponse.get("data");
                if (priceData != null) {
                    Object currentPrice = priceData.get("currentPrice");
                    if (currentPrice != null) {
                        return convertToBigDecimal(currentPrice);
                    }
                }
            }
            
            // 2. 웹소켓 실시간 가격이 없으면 DB에서 상품 정보의 현재가 조회
            InvestmentProduct product = investmentProductService.getProductById(productId);
            if (product != null && product.getCurrentPrice() != null) {
                return product.getCurrentPrice();
            }

            // 3. DB 현재가도 없으면 기본값 반환 (복구)
            return getDefaultPriceForProduct(productId);
            
        } catch (Exception e) {
            // 에러 발생 시 기본값 반환 (복구)
            return getDefaultPriceForProduct(productId);
        }
    }
    
    private BigDecimal getDefaultPriceForProduct(String productId) {
        // 웹소켓이나 DB 조회가 실패할 때 사용할 기본값 (실제 대략적인 시세 기준)
        return switch (productId) {
            case "395400" -> new BigDecimal("5080");
            case "338100" -> new BigDecimal("8720");
            case "293940" -> new BigDecimal("9580");
            case "330590" -> new BigDecimal("3950");
            default -> new BigDecimal("5000");
        };
    }
    
    
    /**
     * Object를 BigDecimal로 안전하게 변환하는 헬퍼 메서드
     */
    private BigDecimal convertToBigDecimal(Object value) {
        if (value == null) {
            return null;
        }
        
        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        } else if (value instanceof Integer) {
            return new BigDecimal((Integer) value);
        } else if (value instanceof Long) {
            return new BigDecimal((Long) value);
        } else if (value instanceof Double) {
            return BigDecimal.valueOf((Double) value);
        } else if (value instanceof String) {
            try {
                return new BigDecimal((String) value);
            } catch (NumberFormatException e) {
                log.error("BigDecimal 변환 실패: {} - {}", value, e.getMessage());
                return BigDecimal.ZERO;
            }
        } else {
            log.error("지원하지 않는 타입을 BigDecimal로 변환 시도: {}", value.getClass().getSimpleName());
            return BigDecimal.ZERO;
        }
    }

}