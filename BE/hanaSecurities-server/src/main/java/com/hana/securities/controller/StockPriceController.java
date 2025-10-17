package com.hana.securities.controller;

import com.hana.securities.service.StockPriceService;
import com.hana.securities.util.ApiResponseBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/securities/stock-price")
@RequiredArgsConstructor
@Slf4j
public class StockPriceController {

    private final StockPriceService stockPriceService;

    /**
     * 실시간 주식 가격 조회
     */
    @GetMapping("/{stockCode}")
    public ResponseEntity<Map<String, Object>> getStockPrice(@PathVariable String stockCode) {
        try {
            Map<String, Object> priceData = stockPriceService.getRealtimeStockPrice(stockCode);
            Map<String, Object> responseData = Map.of(
                "data", priceData,
                "stockCode", stockCode
            );
            return ResponseEntity.ok(ApiResponseBuilder.success(responseData));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponseBuilder.error(e, "주식 가격 조회 중 오류가 발생했습니다"));
        }
    }

    /**
     * 여러 종목 가격 일괄 조회
     */
    @PostMapping("/multiple")
    public ResponseEntity<Map<String, Object>> getMultipleStockPrices(@RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            List<String> stockCodes = (List<String>) request.get("stockCodes");
            
            if (stockCodes == null || stockCodes.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponseBuilder.error("종목 코드 목록이 필요합니다."));
            }
            
            Map<String, Map<String, Object>> priceData = 
                stockPriceService.getMultipleRealtimeStockPrices(stockCodes);
            
            Map<String, Object> responseData = Map.of(
                "data", priceData,
                "requestedCount", stockCodes.size()
            );
            
            return ResponseEntity.ok(ApiResponseBuilder.success(responseData));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponseBuilder.error(e, "가격 조회 중 오류가 발생했습니다"));
        }
    }

    /**
     * 포트폴리오 실시간 가격 업데이트
     */
    @PostMapping("/portfolio-updates")
    public ResponseEntity<Map<String, Object>> getPortfolioRealtimePrices(@RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            List<String> stockCodes = (List<String>) request.get("stockCodes");
            
            if (stockCodes == null || stockCodes.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponseBuilder.error("포트폴리오 종목 코드 목록이 필요합니다."));
            }
            
            Map<String, Object> portfolioUpdates = 
                stockPriceService.getPortfolioRealtimePrices(stockCodes);
            
            Map<String, Object> responseData = Map.of(
                "data", portfolioUpdates,
                "connected", stockPriceService.isRealtimeConnected()
            );
            
            return ResponseEntity.ok(ApiResponseBuilder.success(responseData));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponseBuilder.error(e, "포트폴리오 업데이트 중 오류가 발생했습니다"));
        }
    }

    /**
     * 실시간 구독 시작
     */
    @PostMapping("/subscribe/{stockCode}")
    public ResponseEntity<Map<String, Object>> subscribeStock(@PathVariable String stockCode) {
        try {
            stockPriceService.subscribeToStockPrice(stockCode);
            
            Map<String, Object> responseData = Map.of(
                "stockCode", stockCode,
                "connected", stockPriceService.isRealtimeConnected()
            );
            
            return ResponseEntity.ok(ApiResponseBuilder.success("실시간 구독이 시작되었습니다.", "data", responseData));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponseBuilder.error(e, "구독 시작 중 오류가 발생했습니다"));
        }
    }

    /**
     * 실시간 구독 해제
     */
    @DeleteMapping("/unsubscribe/{stockCode}")
    public ResponseEntity<Map<String, Object>> unsubscribeStock(@PathVariable String stockCode) {
        try {
            stockPriceService.unsubscribeFromStockPrice(stockCode);
            
            return ResponseEntity.ok(ApiResponseBuilder.success("실시간 구독이 해제되었습니다.", "stockCode", stockCode));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponseBuilder.error(e, "구독 해제 중 오류가 발생했습니다"));
        }
    }

    /**
     * 실시간 서비스 상태 확인
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getServiceStatus() {
        try {
            boolean connected = stockPriceService.isRealtimeConnected();
            int cachedStockCount = stockPriceService.getCachedStockCount();
            
            Map<String, Object> statusData = Map.of(
                "connected", connected,
                "cachedStockCount", cachedStockCount
            );
            
            return ResponseEntity.ok(ApiResponseBuilder.success(statusData));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponseBuilder.error(e, "상태 확인 중 오류가 발생했습니다"));
        }
    }

    /**
     * 모든 구독 정리
     */
    @PostMapping("/clear-all")
    public ResponseEntity<Map<String, Object>> clearAllSubscriptions() {
        try {
            int beforeCount = stockPriceService.getCachedStockCount();
            stockPriceService.clearAllSubscriptions();
            
            return ResponseEntity.ok(ApiResponseBuilder.success("모든 실시간 구독이 정리되었습니다.", "clearedCount", beforeCount));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponseBuilder.error(e, "구독 정리 중 오류가 발생했습니다"));
        }
    }
}