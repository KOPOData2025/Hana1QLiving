package com.living.hana.aspect;

import com.living.hana.annotation.Logging;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.UUID;

@Aspect
@Component
public class LoggingAspect {

    @Around("@annotation(logging)")
    public Object logMethodExecution(ProceedingJoinPoint joinPoint, Logging logging) throws Throwable {
        Logger logger = LoggerFactory.getLogger(joinPoint.getTarget().getClass());

        String traceId = UUID.randomUUID().toString().substring(0, 8);
        String methodName = joinPoint.getSignature().getName();
        String className = joinPoint.getTarget().getClass().getSimpleName();
        String operation = logging.operation().isEmpty() ? methodName : logging.operation();

        long startTime = System.currentTimeMillis();

        try {
            logMethodStart(joinPoint, logging, operation, traceId, className, logger);
            Object result = joinPoint.proceed();
            logMethodSuccess(result, logging, operation, startTime, traceId, className, logger);
            return result;
        } catch (Exception e) {
            logMethodError(e, operation, startTime, traceId, className, logger);
            throw e;
        }
    }

    private void logMethodStart(ProceedingJoinPoint joinPoint, Logging logging, String operation, String traceId, String className, Logger logger) {
        StringBuilder logMessage = new StringBuilder();
        logMessage.append("[START] [").append(traceId).append("] ")
                 .append("[").append(logging.category()).append("] ")
                 .append(operation).append(" 시작");

        if (logging.includeParams()) {
            String params = maskSensitiveData(Arrays.toString(joinPoint.getArgs()), logging.maskSensitive());
            logMessage.append(" | params=").append(params);
        }

        logWithLevel(logging.level(), logger, logMessage.toString());
    }

    private void logMethodSuccess(Object result, Logging logging, String operation, long startTime, String traceId, String className, Logger logger) {
        long duration = System.currentTimeMillis() - startTime;

        StringBuilder logMessage = new StringBuilder();
        logMessage.append("[SUCCESS] [").append(traceId).append("] ")
                 .append("[").append(logging.category()).append("] ")
                 .append(operation).append(" 완료");

        if (logging.measureTime()) {
            logMessage.append(" | duration=").append(duration).append("ms");
        }

        if (logging.includeResult() && result != null) {
            String resultStr = maskSensitiveData(result.toString(), logging.maskSensitive());
            logMessage.append(" | result=").append(resultStr);
        }

        logWithLevel(logging.level(), logger, logMessage.toString());
    }

    private void logMethodError(Exception e, String operation, long startTime, String traceId, String className, Logger logger) {
        long duration = System.currentTimeMillis() - startTime;

        String logMessage = String.format("[ERROR] [%s] [ERROR] %s 실패 | duration=%dms | error=%s | message=%s",
                traceId, operation, duration, e.getClass().getSimpleName(), e.getMessage());

        logger.error(logMessage);
    }

    private String maskSensitiveData(String data, boolean maskSensitive) {
        if (!maskSensitive || data == null) {
            return data;
        }

        return data
                .replaceAll("(password|pwd|secret|token|key|authorization)=[^,\\]\\s]*", "$1=***")
                .replaceAll("(\\d{4})(\\d{4})(\\d{4})(\\d{4})", "$1-****-****-$4")
                .replaceAll("([\\w._%+-]+)@([\\w.-]+\\.[a-zA-Z]{2,})", "$1***@***.$2");
    }

    private void logWithLevel(String level, Logger logger, String message) {
        switch (level.toUpperCase()) {
            case "DEBUG":
                logger.debug(message);
                break;
            case "WARN":
                logger.warn(message);
                break;
            case "ERROR":
                logger.error(message);
                break;
            case "INFO":
            default:
                logger.info(message);
                break;
        }
    }
}