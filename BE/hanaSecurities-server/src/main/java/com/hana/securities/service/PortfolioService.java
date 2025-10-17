package com.hana.securities.service;

import com.hana.securities.entity.Portfolio;
import com.hana.securities.entity.Order;
import com.hana.securities.entity.ReitsProduct;
import com.hana.securities.mapper.PortfolioMapper;
import com.hana.securities.mapper.OrderMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional
public class PortfolioService {
    
    @Autowired
    private PortfolioMapper portfolioMapper;
    
    @Autowired
    private OrderMapper orderMapper;
    
    @Autowired
    private ReitsProductService reitsProductService;
    
    @Autowired
    private StockPriceService stockPriceService;
    
    public List<Portfolio> getUserPortfolio(Long userId) {
        List<Portfolio> portfolioList = portfolioMapper.findByUserId(userId);
        
        // 포트폴리오가 없으면 기본 데이터 생성 (주석 처리됨)
        // if (portfolioList.isEmpty()) {
        //     initializeUserPortfolio(userId);
        //     portfolioList = portfolioMapper.findByUserId(userId);
        // }
        
        return portfolioList;
    }
    
    public void initializeUserPortfolio(Long userId) {
        // 이미 포트폴리오가 있는지 확인
        List<Portfolio> existingPortfolio = portfolioMapper.findByUserId(userId);
        if (!existingPortfolio.isEmpty()) {
            return;
        }
        
        // 각 사용자마다 기본 3개 상품 생성
        createPortfolio(userId, "REITS001", "하나리츠 오피스 펀드", "REITS", 100, new BigDecimal("10500"));
        createPortfolio(userId, "REITS002", "하나리츠 리테일 펀드", "REITS", 50, new BigDecimal("8900"));
        createPortfolio(userId, "REITS003", "하나리츠 데이터센터 펀드", "REITS", 25, new BigDecimal("12300"));
    }
    
    public Map<String, Object> getPortfolioSummary(Long userId) {
        Map<String, Object> summary = portfolioMapper.getPortfolioSummaryByUserId(userId);
        if (summary == null) {
            return getEmptyPortfolioSummary();
        }
        
        // null 값들을 0으로 변환 (NaN 방지)
        summary.put("productCount", summary.get("productCount") != null ? summary.get("productCount") : 0);
        summary.put("totalInvestedAmount", summary.get("totalInvestedAmount") != null ? summary.get("totalInvestedAmount") : BigDecimal.ZERO);
        summary.put("totalCurrentValue", summary.get("totalCurrentValue") != null ? summary.get("totalCurrentValue") : BigDecimal.ZERO);
        summary.put("totalGainLoss", summary.get("totalGainLoss") != null ? summary.get("totalGainLoss") : BigDecimal.ZERO);
        summary.put("totalReturnRate", summary.get("totalReturnRate") != null ? summary.get("totalReturnRate") : BigDecimal.ZERO);
        
        return summary;
    }
    
    public Map<String, Object> getPortfolioAnalysis(Long userId) {
        Map<String, Object> analysis = new HashMap<>();
        
        // 기본 요약 정보
        Map<String, Object> summary = getPortfolioSummary(userId);
        analysis.put("summary", summary);
        
        // 상품 유형별 분석
        List<Map<String, Object>> typeAnalysis = portfolioMapper.getPortfolioAnalysisByUserId(userId);
        analysis.put("byProductType", typeAnalysis);
        
        // 위험도별 분포는 실제 포트폴리오 데이터에서 계산
        // 목업 데이터 제거 - 실제 데이터만 사용
        
        // 분산투자 지수
        int productCount = ((Number) summary.getOrDefault("productCount", 0)).intValue();
        String diversificationLevel;
        if (productCount >= 10) {
            diversificationLevel = "HIGH";
        } else if (productCount >= 5) {
            diversificationLevel = "MEDIUM";
        } else {
            diversificationLevel = "LOW";
        }
        analysis.put("diversificationLevel", diversificationLevel);
        
        return analysis;
    }
    
    public Portfolio createPortfolio(Long userId, String productId, String productName, 
                                   String productType, Integer quantity, BigDecimal unitPrice) {
        
        BigDecimal totalInvested = unitPrice.multiply(new BigDecimal(quantity));
        BigDecimal currentPrice = unitPrice; // 초기에는 구매가와 동일
        BigDecimal currentValue = currentPrice.multiply(new BigDecimal(quantity));
        BigDecimal gainLoss = currentValue.subtract(totalInvested);
        BigDecimal returnRate = totalInvested.compareTo(BigDecimal.ZERO) > 0 ? 
            gainLoss.divide(totalInvested, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")) :
            BigDecimal.ZERO;
        
        Portfolio portfolio = new Portfolio();
        portfolio.setUserId(userId);
        portfolio.setProductId(productId);
        portfolio.setProductName(productName);
        portfolio.setProductType(productType != null ? productType : "REITS");
        portfolio.setQuantity(quantity);
        portfolio.setAvgPurchasePrice(unitPrice);
        portfolio.setTotalInvestedAmount(totalInvested);
        portfolio.setCurrentPrice(currentPrice);
        portfolio.setCurrentValue(currentValue);
        portfolio.setUnrealizedGainLoss(gainLoss);
        portfolio.setUnrealizedReturnRate(returnRate);
        portfolio.setStatus("ACTIVE");
        portfolio.setFirstPurchaseDate(LocalDateTime.now());
        portfolio.setLastPurchaseDate(LocalDateTime.now());
        portfolio.setCreatedAt(LocalDateTime.now());
        portfolio.setUpdatedAt(LocalDateTime.now());
        
        portfolioMapper.insertPortfolio(portfolio);
        return portfolio;
    }
    
    
    private Map<String, Object> getEmptyPortfolioSummary() {
        Map<String, Object> summary = new HashMap<>();
        summary.put("productCount", 0);
        summary.put("totalInvestedAmount", BigDecimal.ZERO);
        summary.put("totalCurrentValue", BigDecimal.ZERO);
        summary.put("totalGainLoss", BigDecimal.ZERO);
        summary.put("totalReturnRate", BigDecimal.ZERO);
        summary.put("firstInvestmentDate", null);
        summary.put("lastInvestmentDate", null);
        return summary;
    }
    
    // 목업 데이터 생성 메서드 제거 - 실제 데이터만 사용
    
    /**
     * 주문 데이터를 기반으로 포트폴리오를 동적으로 생성
     */
    public List<Map<String, Object>> generatePortfolioFromOrders(String customerId) {
        try {
            // 해당 고객의 모든 체결된 주문 조회
            List<Order> orders = orderMapper.findOrdersByCustomerId(customerId);
            
            if (orders == null || orders.isEmpty()) {
                return new ArrayList<>();
            }
            
            // ⭐ 중요: 주문을 시간순으로 정렬 (매수/매도 순서가 포트폴리오에 영향)
            orders.sort((o1, o2) -> {
                if (o1.getOrderTime() == null && o2.getOrderTime() == null) return 0;
                if (o1.getOrderTime() == null) return 1;
                if (o2.getOrderTime() == null) return -1;
                return o1.getOrderTime().compareTo(o2.getOrderTime());
            });
            
            
            // 상품별로 주문 집계
            Map<String, PortfolioPosition> positions = new HashMap<>();
            
            for (Order order : orders) {
                if (!"EXECUTED".equals(order.getStatus())) {
                    continue; // 체결되지 않은 주문은 제외
                }
                
                String productId = order.getProductId();
                String orderType = order.getOrderType();
                Long orderQuantity = order.getQuantity();
                
                
                PortfolioPosition position = positions.computeIfAbsent(productId, k -> new PortfolioPosition(productId));
                
                if ("BUY".equals(orderType)) {
                    // 매수: 수량 증가, 평균 매수가 계산
                    BigDecimal newTotalCost = position.totalCost.add(order.getTotalAmount());
                    Long newTotalQuantity = position.quantity + orderQuantity;
                    
                    position.quantity = newTotalQuantity;
                    position.totalCost = newTotalCost;
                    position.avgPurchasePrice = newTotalQuantity > 0 ? 
                        newTotalCost.divide(new BigDecimal(newTotalQuantity), 2, RoundingMode.HALF_UP) : 
                        BigDecimal.ZERO;
                    
                        
                } else if ("SELL".equals(orderType)) {
                    
                    // 매도: 수량 감소
                    Long newQuantity = position.quantity - orderQuantity;
                    
                    if (newQuantity <= 0) {
                        // 전량 매도 또는 초과 매도인 경우 포지션 완전 제거
                        positions.remove(productId);
                    } else {
                        // 부분 매도인 경우
                        position.quantity = newQuantity;
                        
                        // 총 투자 비용을 비례적으로 감소 (FIFO 방식)
                        BigDecimal sellRatio = new BigDecimal(orderQuantity).divide(new BigDecimal(position.quantity + orderQuantity), 4, RoundingMode.HALF_UP);
                        position.totalCost = position.totalCost.subtract(position.totalCost.multiply(sellRatio));
                        
                    }
                }
            }
            
            for (String productId : positions.keySet()) {
                PortfolioPosition pos = positions.get(productId);
                System.out.println("   상품: " + productId + ", 수량: " + pos.quantity + ", 총 비용: " + pos.totalCost);
            }
            
            // 포지션을 Map 형태로 변환
            List<Map<String, Object>> portfolioList = new ArrayList<>();
            
            for (PortfolioPosition position : positions.values()) {
                if (position.quantity > 0) {
                    Map<String, Object> portfolioItem = new HashMap<>();
                    portfolioItem.put("id", Math.abs(position.productId.hashCode())); // 포지션 고유 ID
                    portfolioItem.put("productId", position.productId);
                    portfolioItem.put("productName", getProductName(position.productId));
                    portfolioItem.put("productType", "REITS");
                    portfolioItem.put("quantity", position.quantity);
                    portfolioItem.put("averagePrice", position.avgPurchasePrice); // 프론트엔드 필드명에 맞게 변경
                    portfolioItem.put("totalCost", position.totalCost); // 프론트엔드 필드명에 맞게 변경
                    
                    // 실제 상품의 현재가 조회
                    BigDecimal currentPrice = getCurrentPrice(position.productId);
                    portfolioItem.put("currentPrice", currentPrice);
                    
                    // 평가 금액
                    BigDecimal currentValue = currentPrice.multiply(new BigDecimal(position.quantity));
                    portfolioItem.put("currentValue", currentValue);
                    
                    // 손익
                    BigDecimal gainLoss = currentValue.subtract(position.totalCost);
                    portfolioItem.put("unrealizedProfitLoss", gainLoss); // 프론트엔드 필드명에 맞게 변경
                    
                    // 수익률
                    BigDecimal returnRate = position.totalCost.compareTo(BigDecimal.ZERO) > 0 ?
                        gainLoss.divide(position.totalCost, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")) :
                        BigDecimal.ZERO;
                    portfolioItem.put("profitLossRate", returnRate); // 프론트엔드 필드명에 맞게 변경
                    
                    portfolioItem.put("status", "ACTIVE");
                    portfolioItem.put("lastUpdated", LocalDateTime.now().toString()); // 프론트엔드 필드명에 맞게 변경
                    
                    portfolioList.add(portfolioItem);
                }
            }
            
            
            return portfolioList;
            
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
    
    /**
     * 주문 데이터를 기반으로 포트폴리오 요약 정보를 동적으로 생성
     */
    public Map<String, Object> generatePortfolioSummaryFromOrders(String customerId) {
        try {
            
            // 포트폴리오 데이터 생성
            List<Map<String, Object>> portfolioList = generatePortfolioFromOrders(customerId);
            
            Map<String, Object> summary = new HashMap<>();
            
            if (portfolioList.isEmpty()) {
                // 빈 포트폴리오인 경우
                summary.put("productCount", 0);
                summary.put("totalInvestedAmount", BigDecimal.ZERO);
                summary.put("totalCurrentValue", BigDecimal.ZERO);
                summary.put("totalGainLoss", BigDecimal.ZERO);
                summary.put("totalReturnRate", BigDecimal.ZERO);
                summary.put("firstInvestmentDate", null);
                summary.put("lastInvestmentDate", null);
            } else {
                int productCount = portfolioList.size();
                BigDecimal totalInvested = BigDecimal.ZERO;
                BigDecimal totalCurrentValue = BigDecimal.ZERO;
                
                // 각 상품별 데이터 집계
                for (Map<String, Object> portfolio : portfolioList) {
                    BigDecimal invested = (BigDecimal) portfolio.get("totalCost");  // 필드명 수정
                    BigDecimal currentValue = (BigDecimal) portfolio.get("currentValue");
                    
                    if (invested != null) {
                        totalInvested = totalInvested.add(invested);
                    }
                    if (currentValue != null) {
                        totalCurrentValue = totalCurrentValue.add(currentValue);
                    }
                }
                
                // 총 손익 계산
                BigDecimal totalGainLoss = totalCurrentValue.subtract(totalInvested);
                
                // 총 수익률 계산
                BigDecimal totalReturnRate = BigDecimal.ZERO;
                if (totalInvested.compareTo(BigDecimal.ZERO) > 0) {
                    totalReturnRate = totalGainLoss.divide(totalInvested, 4, RoundingMode.HALF_UP)
                                                   .multiply(new BigDecimal("100"));
                }
                
                summary.put("productCount", productCount);
                summary.put("totalInvestedAmount", totalInvested);
                summary.put("totalCurrentValue", totalCurrentValue);
                summary.put("totalGainLoss", totalGainLoss);
                summary.put("totalReturnRate", totalReturnRate);
                // 실제 투자 날짜는 주문 데이터에서 계산하도록 개선 필요
                summary.put("firstInvestmentDate", null);
                summary.put("lastInvestmentDate", null);
            }
            
            return summary;
            
        } catch (Exception e) {
            return getEmptyPortfolioSummary();
        }
    }
    
    private String getProductName(String productId) {
        try {
            // 실제 상품 데이터에서 상품명 조회
            ReitsProduct product = reitsProductService.getProductById(productId);
            if (product != null && product.getProductName() != null) {
                return product.getProductName();
            }
            
            // 상품이 없으면 기본명 반환
            return "알 수 없는 상품 (ID: " + productId + ")";
            
        } catch (Exception e) {
            return "상품명 조회 실패 (ID: " + productId + ")";
        }
    }
    
    private BigDecimal getCurrentPrice(String productId) {
        try {
            // 실시간 주식 가격 조회 시도
            Map<String, Object> realtimePriceResponse = stockPriceService.getRealtimeStockPrice(productId);
            if (realtimePriceResponse != null && "REALTIME".equals(realtimePriceResponse.get("status"))) {
                Object currentPriceObj = realtimePriceResponse.get("currentPrice");
                if (currentPriceObj != null) {
                    return convertToBigDecimal(currentPriceObj);
                }
            }
            
            // 실시간 데이터가 없을 경우 기본값 사용
            return getDefaultPrice(productId);
            
        } catch (Exception e) {
            return getDefaultPrice(productId);
        }
    }
    
    private BigDecimal convertToBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        
        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        } else if (value instanceof Double) {
            return BigDecimal.valueOf((Double) value);
        } else if (value instanceof Integer) {
            return new BigDecimal((Integer) value);
        } else if (value instanceof String) {
            try {
                return new BigDecimal((String) value);
            } catch (NumberFormatException e) {
                return BigDecimal.ZERO;
            }
        }
        
        return BigDecimal.ZERO;
    }
    
    private BigDecimal getDefaultPrice(String productId) {
        // 백업용 기본값 (WebSocket이나 API 실패 시에만 사용)
        switch (productId) {
            case "REITS001": return new BigDecimal("10500");
            case "REITS002": return new BigDecimal("8900");
            case "REITS003": return new BigDecimal("12300");
            case "REITS004": return new BigDecimal("9800");
            case "REITS005": return new BigDecimal("11200");
            case "338100": return new BigDecimal("4125");
            case "330590": return new BigDecimal("2805");
            case "395400": return new BigDecimal("5080");
            case "293940": return new BigDecimal("7600");
            default: return new BigDecimal("10000");
        }
    }
    
    // 포지션 정보를 담는 내부 클래스
    private static class PortfolioPosition {
        String productId;
        Long quantity = 0L;
        BigDecimal totalCost = BigDecimal.ZERO;
        BigDecimal avgPurchasePrice = BigDecimal.ZERO;
        
        PortfolioPosition(String productId) {
            this.productId = productId;
        }
    }
    
    // 주문 데이터를 기반으로 포트폴리오 분석 생성 (userCi 기반)
    public Map<String, Object> generatePortfolioAnalysisFromOrders(String customerId) {
        Map<String, Object> analysis = new HashMap<>();
        
        try {
            // 먼저 포트폴리오 데이터를 가져옴
            List<Map<String, Object>> portfolio = generatePortfolioFromOrders(customerId);
            
            if (portfolio.isEmpty()) {
                return getEmptyAnalysis();
            }
            
            // 위험도 분포 분석
            Map<Integer, BigDecimal> riskDistribution = new HashMap<>();
            Map<String, BigDecimal> categoryDistribution = new HashMap<>();
            
            BigDecimal totalValue = BigDecimal.ZERO;
            Map<String, BigDecimal> productProfitRates = new HashMap<>();
            
            for (Map<String, Object> holding : portfolio) {
                BigDecimal currentValue = (BigDecimal) holding.get("currentValue");
                totalValue = totalValue.add(currentValue);
                
                // 위험도별 분류 (실제 상품 데이터에서 가져오기)
                int riskLevel = getRiskLevelFromProduct((String) holding.get("productId"));
                if (riskLevel > 0) {
                    riskDistribution.put(riskLevel, riskDistribution.getOrDefault(riskLevel, BigDecimal.ZERO).add(currentValue));
                }
                
                // 카테고리별 분류 (실제 상품 데이터에서 가져오기)  
                String category = getCategoryFromProduct((String) holding.get("productId"));
                if (category != null) {
                    categoryDistribution.put(category, categoryDistribution.getOrDefault(category, BigDecimal.ZERO).add(currentValue));
                }
                
                // 수익률 계산
                BigDecimal totalCost = (BigDecimal) holding.get("totalCost");
                if (totalCost.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal profitRate = currentValue.subtract(totalCost).divide(totalCost, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
                    productProfitRates.put((String) holding.get("productName"), profitRate);
                }
            }
            
            // 위험도 분포 변환
            List<Map<String, Object>> riskDistList = new ArrayList<>();
            for (Map.Entry<Integer, BigDecimal> entry : riskDistribution.entrySet()) {
                Map<String, Object> riskItem = new HashMap<>();
                riskItem.put("level", entry.getKey());
                riskItem.put("value", entry.getValue());
                if (totalValue.compareTo(BigDecimal.ZERO) > 0) {
                    riskItem.put("percentage", entry.getValue().divide(totalValue, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
                } else {
                    riskItem.put("percentage", BigDecimal.ZERO);
                }
                riskDistList.add(riskItem);
            }
            
            // 카테고리 분포 변환
            List<Map<String, Object>> categoryDistList = new ArrayList<>();
            for (Map.Entry<String, BigDecimal> entry : categoryDistribution.entrySet()) {
                Map<String, Object> categoryItem = new HashMap<>();
                categoryItem.put("category", entry.getKey());
                categoryItem.put("value", entry.getValue());
                if (totalValue.compareTo(BigDecimal.ZERO) > 0) {
                    categoryItem.put("percentage", entry.getValue().divide(totalValue, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
                } else {
                    categoryItem.put("percentage", BigDecimal.ZERO);
                }
                categoryDistList.add(categoryItem);
            }
            
            // 수익률 분석
            Map<String, Object> performanceAnalysis = new HashMap<>();
            if (!productProfitRates.isEmpty()) {
                String bestProduct = productProfitRates.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse("N/A");
                    
                String worstProduct = productProfitRates.entrySet().stream()
                    .min(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse("N/A");
                
                BigDecimal avgReturn = productProfitRates.values().stream()
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(new BigDecimal(productProfitRates.size()), 4, RoundingMode.HALF_UP);
                
                Map<String, Object> bestPerforming = new HashMap<>();
                bestPerforming.put("productName", bestProduct);
                bestPerforming.put("profitRate", productProfitRates.get(bestProduct));
                
                Map<String, Object> worstPerforming = new HashMap<>();
                worstPerforming.put("productName", worstProduct);
                worstPerforming.put("profitRate", productProfitRates.get(worstProduct));
                
                performanceAnalysis.put("bestPerforming", bestPerforming);
                performanceAnalysis.put("worstPerforming", worstPerforming);
                performanceAnalysis.put("averageReturn", avgReturn);
            } else {
                performanceAnalysis = getEmptyPerformanceAnalysis();
            }
            
            analysis.put("riskDistribution", riskDistList);
            analysis.put("categoryDistribution", categoryDistList);
            analysis.put("performanceAnalysis", performanceAnalysis);
            
        } catch (Exception e) {
            return getEmptyAnalysis();
        }
        
        return analysis;
    }
    
    private Map<String, Object> getEmptyAnalysis() {
        Map<String, Object> emptyAnalysis = new HashMap<>();
        emptyAnalysis.put("riskDistribution", new ArrayList<>());
        emptyAnalysis.put("categoryDistribution", new ArrayList<>());
        emptyAnalysis.put("performanceAnalysis", getEmptyPerformanceAnalysis());
        return emptyAnalysis;
    }
    
    private Map<String, Object> getEmptyPerformanceAnalysis() {
        Map<String, Object> emptyPerformance = new HashMap<>();
        Map<String, Object> emptyProduct = new HashMap<>();
        emptyProduct.put("productName", "N/A");
        emptyProduct.put("profitRate", BigDecimal.ZERO);
        
        emptyPerformance.put("bestPerforming", emptyProduct);
        emptyPerformance.put("worstPerforming", emptyProduct);
        emptyPerformance.put("averageReturn", BigDecimal.ZERO);
        return emptyPerformance;
    }
    
    private int getRiskLevelFromProduct(String productId) {
        try {
            // 실제 상품 데이터에서 위험도 조회
            ReitsProduct product = reitsProductService.getProductById(productId);
            if (product != null) {
                String riskLevel = product.getRiskLevel();
                if (riskLevel != null) {
                    // 위험도 문자열을 숫자로 변환
                    switch (riskLevel) {
                        case "저위험": return 1;
                        case "중위험": return 3;
                        case "고위험": return 5;
                        default: return 3; // 기본값
                    }
                }
            }
            return 3; // 기본값
        } catch (Exception e) {
            return 3; // 기본값
        }
    }
    
    private String getCategoryFromProduct(String productId) {
        try {
            // 실제 상품 데이터에서 카테고리(상품타입) 조회
            ReitsProduct product = reitsProductService.getProductById(productId);
            if (product != null && product.getProductType() != null) {
                // 상품 타입을 한국어 카테고리로 변환
                switch (product.getProductType()) {
                    case "OFFICE": return "오피스";
                    case "RETAIL": return "리테일";
                    case "DATACENTER": return "데이터센터";
                    case "LOGISTICS": return "물류";
                    case "HOTEL": return "호텔";
                    default: return product.getProductType();
                }
            }
            return "기타";
        } catch (Exception e) {
            return "기타";
        }
    }
}