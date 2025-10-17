package com.living.hana.service;

import com.living.hana.dto.OrderRequest;
import com.living.hana.dto.OrderResponse;
import com.living.hana.entity.InvestmentProduct;
import com.living.hana.entity.InvestmentTransaction;
import com.living.hana.mapper.InvestmentTransactionMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Service("investmentOrderProcessingService")
@Transactional
public class InvestmentOrderService {
    
    @Autowired
    private InvestmentTransactionService transactionService;
    
    @Autowired
    private InvestmentTransactionMapper transactionMapper;

    @Autowired
    private InvestmentProductService productService;
    
    @Autowired
    private AccountValidationService accountValidationService;
    
    // 수수료율 (0.1%)
    private static final BigDecimal FEE_RATE = new BigDecimal("0.001");
    
    // 세율 (0.15%)
    private static final BigDecimal TAX_RATE = new BigDecimal("0.0015");
    
    public OrderResponse processBuyOrder(OrderRequest orderRequest, String token) {
        try {
            // 1. 계좌 유효성 검증
            AccountValidationService.AccountValidationResult accountValidation = 
                accountValidationService.validateAccountForTrading(
                    orderRequest.getUserId(), 
                    orderRequest.getAccountNumber(), 
                    orderRequest.getPassword(), 
                    token
                );
            
            if (!accountValidation.isValid()) {
                return OrderResponse.failure("계좌 검증 실패", "ACCOUNT_VALIDATION_ERROR", accountValidation.getMessage());
            }
            
            // 2. 기본 주문 유효성 검증
            String validationResult = validateBuyOrder(orderRequest);
            if (validationResult != null) {
                return OrderResponse.failure("주문 검증 실패", "VALIDATION_ERROR", validationResult);
            }
            
            // 3. 상품 정보 조회
            InvestmentProduct product = productService.getProductById(orderRequest.getProductId());
            if (product == null) {
                return OrderResponse.failure("상품을 찾을 수 없습니다.", "PRODUCT_NOT_FOUND", "유효하지 않은 상품 ID");
            }
            
            // 4. 거래 정보 계산
            BigDecimal totalAmount = orderRequest.getTotalAmount();
            BigDecimal fees = calculateFees(totalAmount);
            BigDecimal tax = calculateTax(totalAmount);
            BigDecimal netAmount = totalAmount.add(fees).add(tax);
            
            // 5. 계좌 잔액 확인
            if (!accountValidationService.hasSufficientBalance(
                    orderRequest.getUserId(), 
                    orderRequest.getAccountNumber(), 
                    netAmount.longValue(), 
                    token)) {
                return OrderResponse.failure("계좌 잔액이 부족합니다.", "INSUFFICIENT_BALANCE", 
                    String.format("필요 금액: %,d원 (거래금액 + 수수료 + 세금)", netAmount.longValue()));
            }
            
            // 6. 주문 ID 생성
            String orderId = generateOrderId();
            
            // 7. 거래 기록 생성
            InvestmentTransaction transaction = createTransaction(
                orderRequest, orderId, "BUY", totalAmount, fees, tax, netAmount
            );
            
            transactionMapper.insertTransaction(transaction);
            
            // 8. 포트폴리오 업데이트 (하나증권을 통해 자동 처리됨)
            
            // 9. 계좌 잔액 업데이트 (실제 거래 후)
            Long newBalance = accountValidation.getAccountBalance() - netAmount.longValue();
            accountValidationService.updateAccountBalanceAfterTrade(orderRequest.getAccountNumber(), newBalance);
            
            // 10. 성공 응답 생성
            return OrderResponse.success(
                transaction.getTransactionId(), orderId, "CONFIRMED", "BUY",
                orderRequest.getProductId(), product.getProductName(),
                orderRequest.getQuantity(), orderRequest.getUnitPrice(), totalAmount,
                fees, tax, netAmount, transaction.getTransactionDate(),
                "매수 주문이 성공적으로 처리되었습니다."
            );
            
        } catch (Exception e) {
            return OrderResponse.failure("매수 주문 처리 중 오류가 발생했습니다.", "INTERNAL_ERROR", e.getMessage());
        }
    }
    
    private String validateBuyOrder(OrderRequest orderRequest) {
        // 상품 투자 가능성 확인
        if (!productService.canInvest(orderRequest.getProductId(), orderRequest.getTotalAmount().doubleValue())) {
            return "투자 조건을 만족하지 않습니다.";
        }
        
        // 계좌 유효성 검증 (여기서는 간단히 처리)
        if (orderRequest.getAccountNumber() == null || orderRequest.getAccountNumber().length() < 10) {
            return "유효하지 않은 계좌번호입니다.";
        }
        
        // 비밀번호 검증 (여기서는 간단히 처리)
        if (orderRequest.getPassword() == null || orderRequest.getPassword().length() < 4) {
            return "비밀번호가 올바르지 않습니다.";
        }
        
        return null; // 검증 통과
    }

    private InvestmentTransaction createTransaction(OrderRequest orderRequest, String orderId, 
                                                  String transactionType, BigDecimal totalAmount,
                                                  BigDecimal fees, BigDecimal tax, BigDecimal netAmount) {
        InvestmentTransaction transaction = new InvestmentTransaction();
        transaction.setUserId(orderRequest.getUserId());
        transaction.setProductId(orderRequest.getProductId());
        transaction.setOrderId(orderId);
        transaction.setTransactionType(transactionType);
        transaction.setQuantity(orderRequest.getQuantity());
        transaction.setUnitPrice(orderRequest.getUnitPrice());
        transaction.setTransactionAmount(totalAmount);
        transaction.setFees(fees);
        transaction.setTax(tax);
        transaction.setNetAmount(netAmount);
        transaction.setTransactionDate(LocalDateTime.now());
        transaction.setSettlementDate(LocalDate.now().plusDays(2)); // T+2 결제
        transaction.setStatus("CONFIRMED");
        transaction.setChannel(orderRequest.getChannel());
        return transaction;
    }
    
    private BigDecimal calculateFees(BigDecimal amount) {
        return amount.multiply(FEE_RATE).setScale(2, RoundingMode.HALF_UP);
    }
    
    private BigDecimal calculateTax(BigDecimal amount) {
        return amount.multiply(TAX_RATE).setScale(2, RoundingMode.HALF_UP);
    }
    
    private String generateOrderId() {
        return "ORDER_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
    
    public InvestmentTransaction getTransactionById(Long transactionId) {
        return transactionService.getTransactionById(transactionId);
    }
    
    public InvestmentTransaction getTransactionByOrderId(String orderId) {
        return transactionService.getTransactionByOrderId(orderId);
    }
    
    public boolean cancelOrder(Long transactionId, Long userId) {
        InvestmentTransaction transaction = transactionService.getTransactionById(transactionId);
        
        if (transaction == null || !transaction.getUserId().equals(userId)) {
            return false;
        }
        
        if (!"PENDING".equals(transaction.getStatus())) {
            return false;
        }
        
        int result = transactionMapper.updateTransactionStatus(transactionId, "CANCELLED", null, "사용자 취소");
        return result > 0;
    }
    
    public java.util.List<InvestmentTransaction> getUserOrders(Long userId) {
        return transactionService.getUserTransactions(userId);
    }
    
    public boolean cancelOrderByOrderId(String orderId, Long userId) {
        InvestmentTransaction transaction = transactionService.getTransactionByOrderId(orderId);
        
        if (transaction == null || !transaction.getUserId().equals(userId)) {
            return false;
        }
        
        if (!"PENDING".equals(transaction.getStatus())) {
            return false;
        }
        
        int result = transactionMapper.updateTransactionStatus(transaction.getTransactionId(), "CANCELLED", null, "사용자 취소");
        return result > 0;
    }
}