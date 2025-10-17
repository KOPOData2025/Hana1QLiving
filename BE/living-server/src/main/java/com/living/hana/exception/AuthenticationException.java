package com.living.hana.exception;

/**
 * 인증 관련 예외
 */
public class AuthenticationException extends BusinessException {
    
    public AuthenticationException(String message) {
        super(message);
    }
    
    public AuthenticationException(String message, Throwable cause) {
        super(message, cause);
    }
    
    public static AuthenticationException loginFailed() {
        return new AuthenticationException("로그인에 실패했습니다.");
    }
    
    public static AuthenticationException invalidCredentials() {
        return new AuthenticationException("잘못된 인증 정보입니다.");
    }
    
    public static AuthenticationException userNotFound() {
        return new AuthenticationException("사용자를 찾을 수 없습니다.");
    }
}