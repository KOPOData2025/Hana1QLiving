package com.living.hana.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

/**
 * 실무용 비즈니스 로깅 유틸리티
 * - 구조화된 로그 메시지
 * - MDC를 활용한 추적 정보
 * - 표준화된 로그 포맷
 * - 비즈니스 중요 이벤트만 로깅
 */
public class BusinessLogger {

    /**
     * 핵심 비즈니스 작업 시작 로깅 (회원가입, 계약생성, 결제처리 등)
     */
    public static void logBusinessOperation(Class<?> clazz, String operation, String userId) {
        Logger logger = LoggerFactory.getLogger(clazz);

        MDC.put("userId", userId != null ? userId : "system");
        MDC.put("operation", operation);
        MDC.put("status", "START");

        logger.info("비즈니스 작업 시작 - operation: {}", operation);
    }

    /**
     * 비즈니스 작업 성공 로깅
     */
    public static void logBusinessSuccess(Class<?> clazz, String operation, String result) {
        Logger logger = LoggerFactory.getLogger(clazz);

        MDC.put("status", "SUCCESS");
        MDC.put("result", result);

        logger.info("비즈니스 작업 성공 - operation: {}, result: {}", operation, result);

        MDC.clear();
    }

    /**
     * 비즈니스 오류 로깅
     */
    public static void logBusinessError(Class<?> clazz, String operation, Exception e) {
        Logger logger = LoggerFactory.getLogger(clazz);

        MDC.put("status", "ERROR");
        MDC.put("errorType", e.getClass().getSimpleName());
        MDC.put("errorMessage", e.getMessage());

        logger.error("비즈니스 작업 실패 - operation: {}, error: {}", operation, e.getMessage(), e);

        MDC.clear();
    }

    /**
     * 입력값 검증 오류 로깅
     */
    public static void logValidationError(Class<?> clazz, String field, String value, String error) {
        Logger logger = LoggerFactory.getLogger(clazz);

        MDC.put("validationField", field);
        MDC.put("inputValue", value != null ? value : "null");
        MDC.put("validationError", error);

        logger.warn("입력값 검증 실패 - field: {}, error: {}", field, error);

        MDC.clear();
    }

    /**
     * 중요한 데이터 접근 로깅 (생성/수정/삭제만, 단순 조회 제외)
     */
    public static void logDataAccess(Class<?> clazz, String operation, String table, int affectedRows) {
        Logger logger = LoggerFactory.getLogger(clazz);

        MDC.put("dataOperation", operation);
        MDC.put("table", table);
        MDC.put("affectedRows", String.valueOf(affectedRows));

        if ("INSERT".equals(operation) || "UPDATE".equals(operation) || "DELETE".equals(operation)) {
            logger.info("데이터 변경 - operation: {}, table: {}, affected: {}", operation, table, affectedRows);
        }

        MDC.clear();
    }

    /**
     * 시스템 오류 로깅 (복구 불가능한 기술적 오류)
     */
    public static void logSystemError(Class<?> clazz, String operation, Exception e) {
        Logger logger = LoggerFactory.getLogger(clazz);

        MDC.put("systemError", "true");
        MDC.put("operation", operation);
        MDC.put("errorType", e.getClass().getSimpleName());
        MDC.put("errorMessage", e.getMessage());

        logger.error("시스템 오류 - operation: {}, error: {}", operation, e.getMessage(), e);

        MDC.clear();
    }

    // 기존 메소드들 (하위 호환성 유지)

    public static void logBusinessStart(Class<?> clazz, String operation, String userId) {
        logBusinessOperation(clazz, operation, userId);
    }

    public static void logApiCall(Class<?> clazz, String apiName, String endpoint, long responseTime) {
        Logger logger = LoggerFactory.getLogger(clazz);

        MDC.put("apiName", apiName);
        MDC.put("endpoint", endpoint);
        MDC.put("responseTime", String.valueOf(responseTime));

        if (responseTime > 3000) {
            logger.warn("API 호출 지연 - api: {}, endpoint: {}, responseTime: {}ms", apiName, endpoint, responseTime);
        } else {
            logger.info("API 호출 완료 - api: {}, endpoint: {}, responseTime: {}ms", apiName, endpoint, responseTime);
        }

        MDC.clear();
    }

    public static void logSecurityEvent(Class<?> clazz, String event, String userId, String details) {
        Logger logger = LoggerFactory.getLogger(clazz);

        MDC.put("securityEvent", event);
        MDC.put("userId", userId);
        MDC.put("details", details);

        logger.warn("보안 이벤트 - event: {}, userId: {}, details: {}", event, userId, details);

        MDC.clear();
    }

    public static void logPerformance(Class<?> clazz, String operation, long executionTime) {
        Logger logger = LoggerFactory.getLogger(clazz);

        if (executionTime > 1000) {
            MDC.put("performanceIssue", "true");
            logger.warn("성능 이슈 감지 - operation: {}, executionTime: {}ms", operation, executionTime);
        }

        MDC.clear();
    }
}