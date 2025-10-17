package com.living.hana.exception;

/**
 * 투자 관련 예외
 */
public class InvestmentException extends BusinessException {
    
    public InvestmentException(String message) {
        super(message);
    }
    
    public InvestmentException(String message, Throwable cause) {
        super(message, cause);
    }
    
    public static InvestmentException orderFailed(String reason) {
        return new InvestmentException("주문 실행에 실패했습니다. 사유: " + reason);
    }
    
    public static InvestmentException insufficientBalance() {
        return new InvestmentException("잔액이 부족합니다.");
    }
    
    public static InvestmentException productNotFound(String productId) {
        return new InvestmentException("투자 상품을 찾을 수 없습니다: " + productId);
    }
    
    public static InvestmentException invalidOrderAmount() {
        return new InvestmentException("올바르지 않은 주문 금액입니다.");
    }
    
    public static InvestmentException marketClosed() {
        return new InvestmentException("장이 열려있지 않습니다.");
    }
}