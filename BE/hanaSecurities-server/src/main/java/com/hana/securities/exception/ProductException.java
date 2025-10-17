package com.hana.securities.exception;

/**
 * 상품 관련 예외
 */
public class ProductException extends BusinessException {
    
    public ProductException(String message) {
        super(message);
    }
    
    public ProductException(String message, Throwable cause) {
        super(message, cause);
    }
    
    public static ProductException productNotFound(String productId) {
        return new ProductException("상품을 찾을 수 없습니다: " + productId);
    }
    
    public static ProductException invalidProductData(String reason) {
        return new ProductException("올바르지 않은 상품 데이터입니다: " + reason);
    }
    
    public static ProductException productAlreadyExists(String productId) {
        return new ProductException("이미 존재하는 상품입니다: " + productId);
    }
    
    public static ProductException productCreationFailed(String reason) {
        return new ProductException("상품 생성에 실패했습니다: " + reason);
    }
    
    public static ProductException productUpdateFailed(String reason) {
        return new ProductException("상품 업데이트에 실패했습니다: " + reason);
    }
    
    public static ProductException productDeletionFailed(String reason) {
        return new ProductException("상품 삭제에 실패했습니다: " + reason);
    }
}