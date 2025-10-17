package com.living.hana.exception;

/**
 * 외부 API 호출 관련 예외
 */
public class ExternalApiException extends BusinessException {
    
    public ExternalApiException(String message) {
        super(message);
    }
    
    public ExternalApiException(String message, Throwable cause) {
        super(message, cause);
    }
    
    public static ExternalApiException apiCallFailed(String apiName) {
        return new ExternalApiException(apiName + " API 호출에 실패했습니다.");
    }
    
    public static ExternalApiException apiCallFailed(String apiName, Throwable cause) {
        return new ExternalApiException(apiName + " API 호출에 실패했습니다.", cause);
    }
    
    public static ExternalApiException timeout(String apiName) {
        return new ExternalApiException(apiName + " API 응답 시간이 초과되었습니다.");
    }
    
    public static ExternalApiException invalidResponse(String apiName) {
        return new ExternalApiException(apiName + " API 응답이 올바르지 않습니다.");
    }
}