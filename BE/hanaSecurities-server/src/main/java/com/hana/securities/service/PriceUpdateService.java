package com.hana.securities.service;

import com.hana.securities.config.InvestmentWebSocketHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Slf4j
@EnableScheduling
public class PriceUpdateService {

    private final InvestmentWebSocketHandler webSocketHandler;
    
    // 각 상품의 현재 가격을 저장 (실제로는 DB나 캐시 사용)
    private final Map<String, Double> currentPrices = new ConcurrentHashMap<>();
    
    // 기본 가격 설정 (실제로는 DB에서 가져와야 함)
    private final Map<String, Double> basePrices = Map.of(
        "069500", 10000.0,  // KODEX 200
        "226490", 15000.0,  // KODEX 코스닥150
        "152100", 20000.0,  // ARIRANG 200
        "114800", 25000.0,  // KODEX 인버스
        "233740", 12000.0   // KODEX 코스닥150 레버리지
    );

    /**
     * 실시간 가격 업데이트 스케줄러
     * 매 5초마다 실행되어 구독된 상품들의 가격을 업데이트
     */
    @Scheduled(fixedRate = 5000) // 5초마다 실행
    public void updatePrices() {
        try {
            // 연결된 세션이 없으면 업데이트하지 않음
            if (webSocketHandler.getConnectedSessionsCount() == 0) {
                return;
            }

            // 각 기본 상품에 대해 가격 업데이트 생성
            basePrices.forEach((productId, basePrice) -> {
                if (webSocketHandler.getSubscriberCount(productId) > 0) {
                    updateProductPrice(productId, basePrice);
                }
            });
            
        } catch (Exception e) {
        }
    }

    /**
     * 특정 상품의 가격 업데이트
     */
    private void updateProductPrice(String productId, double basePrice) {
        try {
            // 현재 가격을 가져오거나 기본값 설정
            double currentPrice = currentPrices.getOrDefault(productId, basePrice);
            
            // 랜덤한 변동률 생성 (-2% ~ +2%)
            double changePercent = (ThreadLocalRandom.current().nextDouble() - 0.5) * 4.0;
            double change = currentPrice * changePercent / 100;
            double newPrice = currentPrice + change;
            
            // 가격이 너무 많이 벗어나지 않도록 제한
            if (newPrice < basePrice * 0.8) {
                newPrice = basePrice * 0.8;
                changePercent = -20.0;
                change = newPrice - currentPrice;
            } else if (newPrice > basePrice * 1.2) {
                newPrice = basePrice * 1.2;
                changePercent = 20.0;
                change = newPrice - currentPrice;
            }
            
            // 소수점 둘째 자리까지 반올림
            newPrice = Math.round(newPrice * 100.0) / 100.0;
            change = Math.round(change * 100.0) / 100.0;
            changePercent = Math.round(changePercent * 100.0) / 100.0;
            
            // 새로운 가격 저장
            currentPrices.put(productId, newPrice);
            
            // 가격 업데이트 데이터 생성
            Map<String, Object> priceData = Map.of(
                "currentPrice", newPrice,
                "change", change,
                "changePercent", changePercent,
                "orderBook", generateOrderBook(newPrice)
            );
            
            // WebSocket을 통해 브로드캐스트
            webSocketHandler.broadcastPriceUpdate(productId, priceData);
                
        } catch (Exception e) {
        }
    }

    /**
     * 호가창 데이터 생성
     */
    private Map<String, Object> generateOrderBook(double currentPrice) {
        // 매도 호가 (현재가보다 높음)
        java.util.List<Map<String, Object>> asks = java.util.List.of(
            Map.of("price", Math.round((currentPrice + 50) * 100.0) / 100.0, "quantity", ThreadLocalRandom.current().nextInt(50, 300), "level", 1),
            Map.of("price", Math.round((currentPrice + 100) * 100.0) / 100.0, "quantity", ThreadLocalRandom.current().nextInt(50, 300), "level", 2),
            Map.of("price", Math.round((currentPrice + 150) * 100.0) / 100.0, "quantity", ThreadLocalRandom.current().nextInt(50, 300), "level", 3),
            Map.of("price", Math.round((currentPrice + 200) * 100.0) / 100.0, "quantity", ThreadLocalRandom.current().nextInt(50, 300), "level", 4),
            Map.of("price", Math.round((currentPrice + 250) * 100.0) / 100.0, "quantity", ThreadLocalRandom.current().nextInt(50, 300), "level", 5)
        );
        
        // 매수 호가 (현재가보다 낮음)
        java.util.List<Map<String, Object>> bids = java.util.List.of(
            Map.of("price", Math.round((currentPrice - 50) * 100.0) / 100.0, "quantity", ThreadLocalRandom.current().nextInt(50, 300), "level", 1),
            Map.of("price", Math.round((currentPrice - 100) * 100.0) / 100.0, "quantity", ThreadLocalRandom.current().nextInt(50, 300), "level", 2),
            Map.of("price", Math.round((currentPrice - 150) * 100.0) / 100.0, "quantity", ThreadLocalRandom.current().nextInt(50, 300), "level", 3),
            Map.of("price", Math.round((currentPrice - 200) * 100.0) / 100.0, "quantity", ThreadLocalRandom.current().nextInt(50, 300), "level", 4),
            Map.of("price", Math.round((currentPrice - 250) * 100.0) / 100.0, "quantity", ThreadLocalRandom.current().nextInt(50, 300), "level", 5)
        );
        
        return Map.of(
            "asks", asks,
            "bids", bids,
            "spread", "50"
        );
    }

    /**
     * 특정 상품의 현재 가격 조회
     */
    public double getCurrentPrice(String productId) {
        return currentPrices.getOrDefault(productId, basePrices.getOrDefault(productId, 0.0));
    }

    /**
     * 수동으로 특정 상품 가격 업데이트 트리거
     */
    public void triggerPriceUpdate(String productId) {
        Double basePrice = basePrices.get(productId);
        if (basePrice != null) {
            updateProductPrice(productId, basePrice);
        }
    }
}