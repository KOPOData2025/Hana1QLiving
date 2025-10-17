package com.living.hana.controller;

import com.living.hana.dto.OrderRequest;
import com.living.hana.dto.OrderResponse;
import com.living.hana.entity.InvestmentTransaction;
import com.living.hana.service.InvestmentOrderService;
import com.living.hana.service.UserPortfolioService;
import com.living.hana.client.HanaSecuritiesApiClient;
import com.living.hana.service.UserService;
import com.living.hana.entity.User;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/investment/orders")
public class InvestmentOrderController {
    
    @Autowired
    @org.springframework.beans.factory.annotation.Qualifier("investmentOrderProcessingService")
    private InvestmentOrderService investmentOrderService;
    
    @Autowired
    private HanaSecuritiesApiClient hanaSecuritiesApiClient;

    @Autowired
    private UserService userService;
    
    @Autowired
    private UserPortfolioService userPortfolioService;
    
    @PostMapping("/buy")
    public ResponseEntity<OrderResponse> processBuyOrder(
            @Valid @RequestBody OrderRequest orderRequest, HttpServletRequest request) throws Exception {
        try {
            // JWT 토큰에서 추출한 사용자 정보
            Long tokenUserId = (Long) request.getAttribute("userId");
            String token = extractToken(request);
            
            if (tokenUserId != null && !tokenUserId.equals(orderRequest.getUserId())) {
                OrderResponse errorResponse = OrderResponse.failure(
                    "다른 사용자의 계정으로 주문할 수 없습니다.", "AUTHORIZATION_ERROR", "User ID mismatch"
                );
                return ResponseEntity.status(403).body(errorResponse);
            }
            
            // 내부 UserService를 통해 사용자 정보 조회
            User user = userService.findById(orderRequest.getUserId());
            
            if (user == null) {
                OrderResponse errorResponse = OrderResponse.failure(
                    "사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", "User not found with ID: " + orderRequest.getUserId()
                );
                return ResponseEntity.status(400).body(errorResponse);
            }
            
            String userCi = user.getUserCi();
            
            if (userCi == null || userCi.trim().isEmpty()) {
                OrderResponse errorResponse = OrderResponse.failure(
                    "사용자 CI 정보를 찾을 수 없습니다.", "USER_CI_NOT_FOUND", "User CI is required for order processing"
                );
                return ResponseEntity.status(400).body(errorResponse);
            }
            
            orderRequest.setOrderType("BUY");

            // 하나증권으로 직접 주문 전송
            Map<String, Object> mockOrderRequest = createMockOrderRequest(orderRequest, userCi);
            Map<String, Object> mockResponse = hanaSecuritiesApiClient.processBuyOrder(mockOrderRequest);
            
            if (mockResponse != null && Boolean.TRUE.equals(mockResponse.get("success"))) {
                
                // 주문 성공 후 바로 해당 userCi로 거래내역 조회해보기
                Map<String, Object> historyCheck = hanaSecuritiesApiClient.getOrderHistory(userCi);

                // 포트폴리오 새로고침으로 매수 반영 확실히 처리
                boolean refreshed = userPortfolioService.refreshPortfolioValues(userCi);

                OrderResponse response = convertMockResponseToOrderResponse(mockResponse, orderRequest);
                return ResponseEntity.ok(response);
            } else {
                OrderResponse errorResponse = OrderResponse.failure(
                    "하나증권 매수 주문 실패", "EXTERNAL_API_ERROR", 
                    mockResponse != null ? String.valueOf(mockResponse.get("message")) : "Unknown error"
                );
                return ResponseEntity.badRequest().body(errorResponse);
            }
        } catch (Exception e) {
            log.error("매수 주문 처리 중 오류: {}", e.getMessage());
            OrderResponse errorResponse = OrderResponse.failure(
                "매수 주문 처리 중 오류가 발생했습니다.", "INTERNAL_ERROR", e.getMessage()
            );
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    @PostMapping("/sell")
    public ResponseEntity<OrderResponse> processSellOrder(
            @Valid @RequestBody OrderRequest orderRequest, HttpServletRequest request) throws Exception {
        try {
            // JWT 토큰에서 추출한 사용자 정보
            Long tokenUserId = (Long) request.getAttribute("userId");
            String token = extractToken(request);
            
            if (tokenUserId != null && !tokenUserId.equals(orderRequest.getUserId())) {
                OrderResponse errorResponse = OrderResponse.failure(
                    "다른 사용자의 계정으로 주문할 수 없습니다.", "AUTHORIZATION_ERROR", "User ID mismatch"
                );
                return ResponseEntity.status(403).body(errorResponse);
            }
            
            // 내부 UserService를 통해 사용자 정보 조회
            User user = userService.findById(orderRequest.getUserId());
            
            if (user == null) {
                OrderResponse errorResponse = OrderResponse.failure(
                    "사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", "User not found with ID: " + orderRequest.getUserId()
                );
                return ResponseEntity.status(400).body(errorResponse);
            }
            
            String userCi = user.getUserCi();
            
            if (userCi == null || userCi.trim().isEmpty()) {
                OrderResponse errorResponse = OrderResponse.failure(
                    "사용자 CI 정보를 찾을 수 없습니다.", "USER_CI_NOT_FOUND", "User CI is required for order processing"
                );
                return ResponseEntity.status(400).body(errorResponse);
            }
            
            orderRequest.setOrderType("SELL");

            Map<String, Object> mockOrderRequest = createMockOrderRequest(orderRequest, userCi);
            Map<String, Object> mockResponse = hanaSecuritiesApiClient.processSellOrder(mockOrderRequest);
            
            if (mockResponse != null && Boolean.TRUE.equals(mockResponse.get("success"))) {
                
                // 매도 주문 성공 후 바로 해당 userCi로 거래내역 조회
                Map<String, Object> historyCheck = hanaSecuritiesApiClient.getOrderHistory(userCi);

                // 포트폴리오 새로고침으로 매도 반영 확실히 처리
                boolean refreshed = userPortfolioService.refreshPortfolioValues(userCi);

                OrderResponse response = convertMockResponseToOrderResponse(mockResponse, orderRequest);
                return ResponseEntity.ok(response);
            } else {
                OrderResponse errorResponse = OrderResponse.failure(
                    "하나증권 매도 주문 실패", "EXTERNAL_API_ERROR", 
                    mockResponse != null ? String.valueOf(mockResponse.get("message")) : "Unknown error"
                );
                return ResponseEntity.badRequest().body(errorResponse);
            }
        } catch (Exception e) {
            log.error("매도 주문 처리 중 오류: {}", e.getMessage());
            OrderResponse errorResponse = OrderResponse.failure(
                "매도 주문 처리 중 오류가 발생했습니다.", "INTERNAL_ERROR", e.getMessage()
            );
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    
    @GetMapping("/order/{orderId}")
    public ResponseEntity<Map<String, Object>> getTransactionByOrderId(@PathVariable String orderId) {
        Map<String, Object> response = new HashMap<>();
        try {
            InvestmentTransaction transaction = investmentOrderService.getTransactionByOrderId(orderId);
            
            if (transaction != null) {
                response.put("success", true);
                response.put("data", transaction);
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "주문을 찾을 수 없습니다.");
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "주문 조회 중 오류가 발생했습니다.");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    @PostMapping("/cancel")
    public ResponseEntity<Map<String, Object>> cancelOrder(
            @RequestParam Long transactionId,
            @RequestParam Long userId) {
        
        Map<String, Object> response = new HashMap<>();
        try {
            boolean cancelled = investmentOrderService.cancelOrder(transactionId, userId);
            
            if (cancelled) {
                response.put("success", true);
                response.put("message", "주문이 취소되었습니다.");
                response.put("transactionId", transactionId);
            } else {
                response.put("success", false);
                response.put("message", "주문 취소에 실패했습니다. 이미 처리되었거나 유효하지 않은 주문입니다.");
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "주문 취소 중 오류가 발생했습니다.");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    @PostMapping("/estimate")
    public ResponseEntity<Map<String, Object>> estimateOrder(@RequestBody OrderRequest orderRequest) {
        Map<String, Object> response = new HashMap<>();
        try {
            // 거래 예상 비용 계산 - 주식 거래는 수수료 없음
            java.math.BigDecimal totalAmount = orderRequest.getTotalAmount();
            java.math.BigDecimal fees = java.math.BigDecimal.ZERO; // 주식 거래 수수료 없음
            Map<String, Object> estimate = getStringObjectMap(orderRequest, totalAmount, fees);

            response.put("success", true);
            response.put("data", estimate);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "거래 비용 계산 중 오류가 발생했습니다.");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @NotNull
    private static Map<String, Object> getStringObjectMap(OrderRequest orderRequest, BigDecimal totalAmount, BigDecimal fees) {
        BigDecimal tax = BigDecimal.ZERO;  // 주식 거래 세금 없음

        Map<String, Object> estimate = new HashMap<>();
        estimate.put("orderType", orderRequest.getOrderType());
        estimate.put("productId", orderRequest.getProductId());
        estimate.put("quantity", orderRequest.getQuantity());
        estimate.put("unitPrice", orderRequest.getUnitPrice());
        estimate.put("totalAmount", totalAmount);
        estimate.put("fees", fees);
        estimate.put("tax", tax);

        if ("BUY".equals(orderRequest.getOrderType())) {
            estimate.put("netAmount", totalAmount); // 수수료 없이 총액과 동일
            estimate.put("description", "매수 시 총 필요금액 (수수료 없음)");
        } else {
            estimate.put("netAmount", totalAmount); // 수수료 없이 총액과 동일
            estimate.put("description", "매도 시 실수령금액 (수수료 없음)");
        }
        return estimate;
    }

    // JWT 토큰에서 사용자 ID를 자동으로 추출하여 주문내역 조회
    @GetMapping
    public ResponseEntity<Map<String, Object>> getMyOrders(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                response.put("success", false);
                response.put("message", "인증 정보가 필요합니다.");
                return ResponseEntity.status(401).body(response);
            }
            
            // 사용자의 모든 거래내역 조회 (주문내역과 동일)
            java.util.List<InvestmentTransaction> orders =
                investmentOrderService.getUserOrders(userId);
            response.put("success", true);
            response.put("data", orders);
            response.put("count", orders.size());
            response.put("userId", userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "주문내역 조회 중 오류가 발생했습니다.");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    @DeleteMapping("/{orderId}")
    public ResponseEntity<Map<String, Object>> cancelOrderByOrderId(
            @PathVariable String orderId, HttpServletRequest request) {
        
        Map<String, Object> response = new HashMap<>();
        try {
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                response.put("success", false);
                response.put("message", "인증 정보가 필요합니다.");
                return ResponseEntity.status(401).body(response);
            }
            
            boolean cancelled = investmentOrderService.cancelOrderByOrderId(orderId, userId);
            
            if (cancelled) {
                response.put("success", true);
                response.put("message", "주문이 취소되었습니다.");
                response.put("orderId", orderId);
            } else {
                response.put("success", false);
                response.put("message", "주문 취소에 실패했습니다. 이미 처리되었거나 유효하지 않은 주문입니다.");
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "주문 취소 중 오류가 발생했습니다.");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * HTTP 요청에서 JWT 토큰 추출
     */
    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
    
    private Map<String, Object> createMockOrderRequest(OrderRequest orderRequest, String userCi) {
        Map<String, Object> mockRequest = new HashMap<>();
        
        // JWT에서 추출한 실제 userCi를 customerId로 사용
        String customerId = userCi != null ? userCi : "UNKNOWN_CI";
        
        mockRequest.put("customerId", customerId);
        mockRequest.put("productId", orderRequest.getProductId());
        mockRequest.put("orderType", orderRequest.getOrderType());
        mockRequest.put("quantity", orderRequest.getQuantity());
        mockRequest.put("unitPrice", orderRequest.getUnitPrice());
        mockRequest.put("accountNumber", orderRequest.getAccountNumber());
        mockRequest.put("password", orderRequest.getPassword());
        
        
        return mockRequest;
    }
    
    private OrderResponse convertMockResponseToOrderResponse(Map<String, Object> mockResponse, OrderRequest originalRequest) {
        try {
            String orderId = String.valueOf(mockResponse.get("orderId"));
            String status = String.valueOf(mockResponse.get("status"));
            
            // executedTime 안전 변환
            LocalDateTime executedTime = parseExecutedTime(mockResponse.get("executedTime"));
            
            return OrderResponse.success(
                System.currentTimeMillis(), // transactionId
                orderId,
                status,
                originalRequest.getOrderType(),
                originalRequest.getProductId(),
                null, // productName
                originalRequest.getQuantity(),
                originalRequest.getUnitPrice(),
                originalRequest.getTotalAmount(),
                BigDecimal.ZERO, // fees
                BigDecimal.ZERO, // tax
                originalRequest.getTotalAmount(), // netAmount
                executedTime != null ? executedTime : LocalDateTime.now(),
                String.valueOf(mockResponse.get("message"))
            );
        } catch (Exception e) {
            log.error("하나증권 응답 변환 중 오류: {}", e.getMessage());
            return OrderResponse.failure("응답 변환 실패", "CONVERSION_ERROR", e.getMessage());
        }
    }
    
    /**
     * executedTime을 안전하게 LocalDateTime으로 변환
     */
    private LocalDateTime parseExecutedTime(Object executedTimeObj) {
        if (executedTimeObj == null) {
            return null;
        }
        
        try {
            // 이미 LocalDateTime인 경우
            if (executedTimeObj instanceof LocalDateTime) {
                return (LocalDateTime) executedTimeObj;
            }
            
            // String인 경우 파싱 시도
            if (executedTimeObj instanceof String timeStr) {
                if (timeStr.isEmpty() || "null".equals(timeStr)) {
                    return null;
                }
                
                // ISO 형태 파싱 시도 (예: 2025-09-01T15:31:12.345879600)
                try {
                    return LocalDateTime.parse(timeStr);
                } catch (Exception e1) {
                    // 다른 형태 파싱 시도
                    try {
                        return LocalDateTime.parse(timeStr, java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                    } catch (Exception e2) {
                        log.error("executedTime 파싱 실패: {}", timeStr);
                        return LocalDateTime.now(); // 폴백
                    }
                }
            }
            
            // 기타 타입은 현재 시간 사용
            log.error("알 수 없는 executedTime 타입: {}", executedTimeObj.getClass());
            return LocalDateTime.now();

        } catch (Exception e) {
            log.error("executedTime 변환 중 예외: {}", e.getMessage());
            return LocalDateTime.now();
        }
    }
}