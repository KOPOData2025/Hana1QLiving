package com.hana.securities.service;

import com.hana.securities.entity.Order;
import com.hana.securities.entity.SecuritiesAccount;
import com.hana.securities.mapper.OrderMapper;
import com.hana.securities.exception.OrderException;
import com.hana.securities.exception.DatabaseException;
import com.hana.securities.exception.ValidationException;
import com.hana.securities.util.ServiceLogger;
import com.hana.securities.util.StringUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {
    
    private final OrderMapper orderMapper;
    private final SecuritiesAccountService securitiesAccountService;
    private final ServiceLogger serviceLogger;
    
    @Transactional
    public void saveOrder(Order order) {
        serviceLogger.executeWithLogging("주문 저장", 
            Map.of("orderId", order.getOrderId(), "customerId", order.getCustomerId(), 
                   "orderType", order.getOrderType(), "totalAmount", order.getTotalAmount()), () -> {
            
            validateOrder(order);
            
            if ("BUY".equals(order.getOrderType())) {
                processBuyOrder(order);
            } else if ("SELL".equals(order.getOrderType())) {
                processSellOrder(order);
            }
            
            insertOrderToDatabase(order);
            return null;
        });
    }
    
    @Transactional
    public void updateOrderStatus(String orderId, String status, LocalDateTime executedTime, String failureReason) {
        serviceLogger.executeWithLogging("주문 상태 업데이트", 
            Map.of("orderId", orderId, "status", status), () -> {
            
            if (StringUtils.isEmpty(orderId)) {
                throw ValidationException.requiredField("주문ID");
            }
            
            try {
                orderMapper.updateOrderStatus(orderId, status, executedTime, failureReason);
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                throw DatabaseException.dataIntegrityViolation(e.getMessage());
            } catch (Exception e) {
                throw DatabaseException.queryExecutionFailed("주문 상태 업데이트", e);
            }
            
            return null;
        });
    }
    
    public Order getOrderById(String orderId) {
        return serviceLogger.executeDbQuery("주문", "단건 조회", orderId, () -> {
            if (StringUtils.isEmpty(orderId)) {
                throw ValidationException.requiredField("주문ID");
            }
            return orderMapper.findOrderById(orderId);
        });
    }
    
    public List<Order> getOrdersByCustomerId(String customerId) {
        return serviceLogger.executeDbQuery("주문", "고객별 조회", customerId, () -> {
            if (StringUtils.isEmpty(customerId)) {
                throw ValidationException.requiredField("고객ID");
            }
            
            List<Order> orders = orderMapper.findOrdersByCustomerId(customerId);
            
            return orders != null ? orders : new ArrayList<>();
        });
    }
    
    public List<Order> getOrdersByStatus(String status) {
        return serviceLogger.executeDbQuery("주문", "상태별 조회", status, () -> {
            if (StringUtils.isEmpty(status)) {
                throw ValidationException.requiredField("주문상태");
            }
            return orderMapper.findOrdersByStatus(status);
        });
    }
    
    public List<Order> getAllOrders() {
        return serviceLogger.executeDbQuery("주문", "전체 조회", null, () -> {
            return orderMapper.findAllOrders();
        });
    }
    
    public boolean orderExists(String orderId) {
        return serviceLogger.executeDbQuery("주문", "존재 여부 확인", orderId, () -> {
            if (StringUtils.isEmpty(orderId)) {
                return false;
            }
            return orderMapper.existsByOrderId(orderId);
        });
    }
    
    @Transactional
    public boolean deleteOrder(String orderId) {
        return serviceLogger.executeWithLogging("주문 삭제", orderId, () -> {
            if (StringUtils.isEmpty(orderId)) {
                throw ValidationException.requiredField("주문ID");
            }
            
            try {
                int deletedRows = orderMapper.deleteOrder(orderId);
                boolean success = deletedRows > 0;
                // 주문 삭제 처리 완료
                return success;
            } catch (Exception e) {
                throw DatabaseException.queryExecutionFailed("주문 삭제", e);
            }
        });
    }
    
    private void validateOrder(Order order) {
        if (order == null) {
            throw ValidationException.requiredField("주문 정보");
        }
        
        if (StringUtils.isEmpty(order.getOrderId())) {
            throw ValidationException.requiredField("주문ID");
        }
        
        if (StringUtils.isEmpty(order.getCustomerId())) {
            throw ValidationException.requiredField("고객ID");
        }
        
        if (StringUtils.isEmpty(order.getProductId())) {
            throw ValidationException.requiredField("상품ID");
        }
        
        if (StringUtils.isEmpty(order.getOrderType())) {
            throw ValidationException.requiredField("주문유형");
        }
        
        if (!"BUY".equals(order.getOrderType()) && !"SELL".equals(order.getOrderType())) {
            throw ValidationException.invalidOrderType();
        }
        
        if (order.getTotalAmount() == null || order.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw ValidationException.invalidAmount();
        }
        
        serviceLogger.logValidation("주문 유효성 검증", order.getOrderId(), true, "모든 검증 통과");
    }
    
    private void processBuyOrder(Order order) {
        String userCi = order.getCustomerId(); // user_ci로 사용
        
        // user_ci로 계좌 찾기
        List<SecuritiesAccount> accounts = securitiesAccountService.getAccountsByUserCi(userCi);
        if (accounts == null || accounts.isEmpty()) {
            throw OrderException.accountNotFound(userCi);
        }
        
        // 첫 번째 활성 계좌 사용
        SecuritiesAccount account = accounts.stream()
            .filter(acc -> "ACTIVE".equals(acc.getStatus()))
            .findFirst()
            .orElse(null);
        
        if (account == null) {
            throw OrderException.accountNotFound(userCi);
        }
        
        Long currentBalance = account.getBalance();
        BigDecimal totalAmount = order.getTotalAmount();
        
        if (currentBalance < totalAmount.longValue()) {
            throw OrderException.insufficientBalance();
        }
        
        Long newBalance = currentBalance - totalAmount.longValue();
        boolean updateResult = securitiesAccountService.updateBalance(account.getAccountNumber(), newBalance);
        if (!updateResult) {
            throw OrderException.balanceUpdateFailed();
        }
        
    }
    
    private void processSellOrder(Order order) {
        String userCi = order.getCustomerId(); // user_ci로 사용
        
        // user_ci로 계좌 찾기
        List<SecuritiesAccount> accounts = securitiesAccountService.getAccountsByUserCi(userCi);
        if (accounts == null || accounts.isEmpty()) {
            throw OrderException.accountNotFound(userCi);
        }
        
        // 첫 번째 활성 계좌 사용
        SecuritiesAccount account = accounts.stream()
            .filter(acc -> "ACTIVE".equals(acc.getStatus()))
            .findFirst()
            .orElse(null);
        
        if (account == null) {
            throw OrderException.accountNotFound(userCi);
        }
        
        Long currentBalance = account.getBalance();
        BigDecimal totalAmount = order.getTotalAmount();
        Long newBalance = currentBalance + totalAmount.longValue();
        
        boolean updateResult = securitiesAccountService.updateBalance(account.getAccountNumber(), newBalance);
        if (!updateResult) {
            throw OrderException.balanceUpdateFailed();
        }
        
    }
    
    private void insertOrderToDatabase(Order order) {
        serviceLogger.logDatabaseConnectionStatus("주문 저장");
        
        try {
            orderMapper.insertOrder(order);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw DatabaseException.dataIntegrityViolation(e.getMessage());
        } catch (org.mybatis.spring.MyBatisSystemException e) {
            if (e.getRootCause() != null) {
                // 근본 원인 확인
            }
            throw DatabaseException.queryExecutionFailed("주문 저장", e);
        } catch (Exception e) {
            throw DatabaseException.queryExecutionFailed("주문 저장", e);
        }
    }
}