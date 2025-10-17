package com.hana.securities.exception;

/**
 * 주문 관련 예외
 */
public class OrderException extends BusinessException {
    
    public OrderException(String message) {
        super(message);
    }
    
    public OrderException(String message, Throwable cause) {
        super(message, cause);
    }
    
    public static OrderException orderNotFound(String orderId) {
        return new OrderException("주문을 찾을 수 없습니다: " + orderId);
    }
    
    public static OrderException invalidOrderAmount() {
        return new OrderException("올바르지 않은 주문 금액입니다.");
    }
    
    public static OrderException insufficientBalance() {
        return new OrderException("잔액이 부족합니다.");
    }
    
    public static OrderException orderProcessingFailed(String reason) {
        return new OrderException("주문 처리에 실패했습니다. 사유: " + reason);
    }
    
    public static OrderException accountNotFound(String accountNumber) {
        return new OrderException("증권계좌를 찾을 수 없습니다: " + accountNumber);
    }
    
    public static OrderException balanceUpdateFailed() {
        return new OrderException("증권계좌 잔액 업데이트에 실패했습니다.");
    }
}