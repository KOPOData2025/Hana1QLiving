package com.hana.securities.controller;

import com.hana.securities.entity.Order;
import com.hana.securities.entity.OrderRequest;
import com.hana.securities.entity.ReitsProduct;
import com.hana.securities.service.OrderService;
import com.hana.securities.service.PortfolioService;
import com.hana.securities.service.ReitsProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;
    
    @Autowired
    private PortfolioService portfolioService;
    
    @Autowired
    private ReitsProductService reitsProductService;

    @PostMapping("/buy")
    public ResponseEntity<Map<String, Object>> buyOrder(@RequestBody Map<String, Object> rawRequest) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Map을 OrderRequest로 변환
            OrderRequest request = convertMapToOrderRequest(rawRequest);
            
            // 입력 검증
            if (!isValidOrderRequest(request, "BUY")) {
                response.put("success", false);
                response.put("message", "잘못된 주문 정보입니다.");
                return ResponseEntity.badRequest().body(response);
            }

        // 주문 생성
        String orderId = generateOrderId();
        BigDecimal totalAmount = request.getUnitPrice().multiply(new BigDecimal(request.getQuantity()));
        
        Order order = new Order(
            orderId,
            request.getCustomerId(),
            request.getProductId(),
            "BUY",
            request.getQuantity(),
            request.getUnitPrice(),
            totalAmount
        );

        // Order 객체 디버깅 생략

        // DB에 주문 저장
        orderService.saveOrder(order);
        
        // 주문 체결 처리
        order.setStatus("EXECUTED");
        order.setExecutedTime(LocalDateTime.now());
        orderService.updateOrderStatus(orderId, "EXECUTED", order.getExecutedTime(), null);
        
        // 매수 주문 성공 후 포트폴리오 즉시 재생성
        try {
            String customerId = request.getCustomerId();
            
            // 포트폴리오 재생성으로 매수 반영
            List<Map<String, Object>> updatedPortfolio = portfolioService.generatePortfolioFromOrders(customerId);
            
            // 포트폴리오 요약도 재생성
            Map<String, Object> updatedSummary = portfolioService.generatePortfolioSummaryFromOrders(customerId);
            System.out.println("📈 매수 후 포트폴리오 요약 재생성 완료");
            
        } catch (Exception portfolioError) {
            // 포트폴리오 재생성 실패해도 주문 성공은 유지
        }
        
        response.put("success", true);
        response.put("orderId", orderId);
        response.put("status", "EXECUTED");
        response.put("executedTime", order.getExecutedTime());
        response.put("totalAmount", totalAmount);
        response.put("message", "매수 주문이 체결되었습니다.");
        

        return ResponseEntity.ok(response);
        
        } catch (Exception e) {
            System.err.println("🏦 매수 주문 처리 중 오류: " + e.getMessage());
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "주문 처리 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/sell")
    public ResponseEntity<Map<String, Object>> sellOrder(@RequestBody Map<String, Object> rawRequest) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Map을 OrderRequest로 변환
            OrderRequest request = convertMapToOrderRequest(rawRequest);
            
            // 입력 검증
            if (!isValidOrderRequest(request, "SELL")) {
                response.put("success", false);
                response.put("message", "잘못된 주문 정보입니다.");
                return ResponseEntity.badRequest().body(response);
            }

        // 주문 생성
        String orderId = generateOrderId();
        BigDecimal totalAmount = request.getUnitPrice().multiply(new BigDecimal(request.getQuantity()));
        
        Order order = new Order(
            orderId,
            request.getCustomerId(),
            request.getProductId(),
            "SELL",
            request.getQuantity(),
            request.getUnitPrice(),
            totalAmount
        );

        // Order 객체 디버깅 생략

        // DB에 주문 저장
        orderService.saveOrder(order);
        
        // 주문 체결 처리
        order.setStatus("EXECUTED");
        order.setExecutedTime(LocalDateTime.now());
        orderService.updateOrderStatus(orderId, "EXECUTED", order.getExecutedTime(), null);
        
        // 매도 주문 성공 후 포트폴리오 즉시 재생성 (중요!)
        try {
            String customerId = request.getCustomerId();
            
            // 포트폴리오 재생성으로 매도 반영
            List<Map<String, Object>> updatedPortfolio = portfolioService.generatePortfolioFromOrders(customerId);
            
            // 포트폴리오 요약도 재생성
            Map<String, Object> updatedSummary = portfolioService.generatePortfolioSummaryFromOrders(customerId);
            System.out.println("📈 매도 후 포트폴리오 요약 재생성 완료");
            
        } catch (Exception portfolioError) {
            // 포트폴리오 재생성 실패해도 주문 성공은 유지
        }
        
        response.put("success", true);
        response.put("orderId", orderId);
        response.put("status", "EXECUTED");
        response.put("executedTime", order.getExecutedTime());
        response.put("totalAmount", totalAmount);
        response.put("message", "매도 주문이 체결되었습니다.");
        

        return ResponseEntity.ok(response);
        
        } catch (Exception e) {
            System.err.println("🏦 매도 주문 처리 중 오류: " + e.getMessage());
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "주문 처리 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/history/{customerId}")
    public ResponseEntity<Map<String, Object>> getOrderHistory(@PathVariable String customerId) {
        try {
            List<Order> customerOrders = orderService.getOrdersByCustomerId(customerId);
            
            // 주문 데이터를 Map으로 변환하여 productName 추가
            List<Map<String, Object>> ordersWithProductName = new ArrayList<>();
            if (customerOrders != null) {
                for (Order order : customerOrders) {
                    Map<String, Object> orderMap = new HashMap<>();
                    orderMap.put("orderId", order.getOrderId());
                    orderMap.put("customerId", order.getCustomerId());
                    orderMap.put("productId", order.getProductId());
                    orderMap.put("orderType", order.getOrderType());
                    orderMap.put("quantity", order.getQuantity());
                    orderMap.put("unitPrice", order.getUnitPrice());
                    orderMap.put("totalAmount", order.getTotalAmount());
                    orderMap.put("status", order.getStatus());
                    orderMap.put("orderTime", order.getOrderTime());
                    orderMap.put("executedTime", order.getExecutedTime());
                    orderMap.put("failureReason", order.getFailureReason());
                    
                    // productName 추가 - 예외를 던지지 않는 메서드 사용
                    ReitsProduct product = reitsProductService.findProductById(order.getProductId());
                    if (product != null && product.getProductName() != null) {
                        orderMap.put("productName", product.getProductName());
                    } else {
                        orderMap.put("productName", "상품명 없음 (ID: " + order.getProductId() + ")");
                    }
                    
                    ordersWithProductName.add(orderMap);
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", ordersWithProductName);
            response.put("count", ordersWithProductName.size());
            response.put("customerId", customerId);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("🏦 하나증권: 거래내역 조회 실패 - " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "거래내역 조회 실패");
            errorResponse.put("error", e.getMessage());
            
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<Order> getOrder(@PathVariable String orderId) {
        Order order = orderService.getOrderById(orderId);
        
        if (order != null) {
            return ResponseEntity.ok(order);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{orderId}")
    public ResponseEntity<Map<String, Object>> cancelOrder(@PathVariable String orderId) {
        Map<String, Object> response = new HashMap<>();
        
        Order order = orderService.getOrderById(orderId);
        
        if (order == null) {
            response.put("success", false);
            response.put("message", "주문을 찾을 수 없습니다.");
            return ResponseEntity.notFound().build();
        }
        
        if (!"PENDING".equals(order.getStatus())) {
            response.put("success", false);
            response.put("message", "취소할 수 없는 주문입니다.");
            return ResponseEntity.badRequest().body(response);
        }
        
        orderService.updateOrderStatus(orderId, "CANCELLED", null, null);
        response.put("success", true);
        response.put("message", "주문이 취소되었습니다.");
        
        return ResponseEntity.ok(response);
    }

    private boolean isValidOrderRequest(OrderRequest request, String expectedType) {
        return request != null &&
               request.getCustomerId() != null && !request.getCustomerId().trim().isEmpty() &&
               request.getProductId() != null && !request.getProductId().trim().isEmpty() &&
               expectedType.equals(request.getOrderType()) &&
               request.getQuantity() != null && request.getQuantity() > 0 &&
               request.getUnitPrice() != null && request.getUnitPrice().compareTo(BigDecimal.ZERO) > 0 &&
               request.getAccountNumber() != null && !request.getAccountNumber().trim().isEmpty();
    }

    private String generateOrderId() {
        return "ORD" + System.currentTimeMillis() + String.format("%03d", System.nanoTime() % 1000);
    }
    
    // Map을 OrderRequest로 변환하는 메소드
    private OrderRequest convertMapToOrderRequest(Map<String, Object> rawRequest) {
        OrderRequest request = new OrderRequest();
        
        request.setCustomerId(rawRequest.get("customerId") != null ? 
            rawRequest.get("customerId").toString() : null);
        request.setProductId(rawRequest.get("productId") != null ? 
            rawRequest.get("productId").toString() : null);
        request.setOrderType(rawRequest.get("orderType") != null ? 
            rawRequest.get("orderType").toString() : null);
        
        // quantity 변환
        if (rawRequest.get("quantity") != null) {
            request.setQuantity(Long.valueOf(rawRequest.get("quantity").toString()));
        }
        
        // unitPrice 변환 (Long → BigDecimal)
        if (rawRequest.get("unitPrice") != null) {
            Long unitPriceValue = Long.valueOf(rawRequest.get("unitPrice").toString());
            request.setUnitPrice(new BigDecimal(unitPriceValue));
        }
        
        request.setAccountNumber(rawRequest.get("accountNumber") != null ? 
            rawRequest.get("accountNumber").toString() : null);
        request.setPassword(rawRequest.get("password") != null ? 
            rawRequest.get("password").toString() : null);
        
        // 주문 요청 변환 완료
        
        return request;
    }
    

}