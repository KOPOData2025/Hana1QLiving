package com.living.hana.exception;

/**
 * 하나은행 API 호출 중 발생하는 예외
 */
public class HanabankApiException extends RuntimeException {

    public HanabankApiException(String message) {
        super(message);
    }

    public HanabankApiException(String message, Throwable cause) {
        super(message, cause);
    }
}
