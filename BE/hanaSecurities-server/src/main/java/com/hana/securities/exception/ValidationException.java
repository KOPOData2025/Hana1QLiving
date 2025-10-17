package com.hana.securities.exception;

/**
 * 입력값 검증 실패 시 발생하는 예외
 */
public class ValidationException extends BusinessException {
    
    public ValidationException(String message) {
        super(message);
    }
    
    public ValidationException(String field, String message) {
        super(String.format("%s: %s", field, message));
    }
    
    public static ValidationException requiredField(String fieldName) {
        return new ValidationException(fieldName, "필수 입력 항목입니다.");
    }
    
    public static ValidationException invalidFormat(String fieldName) {
        return new ValidationException(fieldName, "올바르지 않은 형식입니다.");
    }
    
    public static ValidationException invalidRange(String fieldName, String range) {
        return new ValidationException(fieldName, "유효 범위를 벗어났습니다: " + range);
    }
    
    public static ValidationException invalidOrderType() {
        return new ValidationException("주문유형", "BUY 또는 SELL만 허용됩니다.");
    }
    
    public static ValidationException invalidAmount() {
        return new ValidationException("금액", "0보다 큰 값이어야 합니다.");
    }
}