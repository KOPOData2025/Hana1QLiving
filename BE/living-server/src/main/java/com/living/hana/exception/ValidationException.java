package com.living.hana.exception;

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
    
    public static ValidationException invalidEmail() {
        return new ValidationException("이메일", "올바른 이메일 형식이 아닙니다.");
    }
    
    public static ValidationException invalidPhoneNumber() {
        return new ValidationException("전화번호", "올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)");
    }
}