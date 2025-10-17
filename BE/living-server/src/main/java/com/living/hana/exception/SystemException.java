package com.living.hana.exception;

/**
 * 시스템 오류 예외
 * - 데이터베이스 연결 실패, 외부 API 오류 등
 * - 복구 불가능한 기술적 오류
 */
public class SystemException extends RuntimeException {

    public SystemException(String message) {
        super(message);
    }

    public SystemException(String message, Throwable cause) {
        super(message, cause);
    }
}