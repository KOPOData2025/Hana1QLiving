package com.living.hana.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * 모든 HTTP 요청/응답을 자동으로 로깅하는 Filter
 * - 요청 ID 자동 생성 및 MDC 등록
 * - 요청/응답 시간 측정
 * - 민감정보 자동 마스킹
 */
@Slf4j
@Component
@Order(2)  // UserContextFilter(Order=1) 다음에 실행
public class HttpLoggingFilter extends OncePerRequestFilter {

    private static final int MAX_PAYLOAD_LENGTH = 1000;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {

        // Actuator, Prometheus 엔드포인트는 로깅 제외
        if (isExcludedPath(request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }

        // 요청 ID 생성 및 MDC 등록
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("requestId", requestId);
        MDC.put("method", request.getMethod());
        MDC.put("uri", request.getRequestURI());

        // Request/Response Body 캐싱을 위한 Wrapper
        ContentCachingRequestWrapper cachingRequest = new ContentCachingRequestWrapper(request);
        ContentCachingResponseWrapper cachingResponse = new ContentCachingResponseWrapper(response);

        long startTime = System.currentTimeMillis();

        try {
            // 요청 로그
            logRequest(cachingRequest, requestId);

            // 실제 요청 처리
            filterChain.doFilter(cachingRequest, cachingResponse);

        } finally {
            long duration = System.currentTimeMillis() - startTime;

            // 응답 로그
            logResponse(cachingRequest, cachingResponse, requestId, duration);

            // Response Body를 실제 응답으로 복사 (중요!)
            cachingResponse.copyBodyToResponse();

            // MDC 정리
            MDC.clear();
        }
    }

    private void logRequest(ContentCachingRequestWrapper request, String requestId) {
        String clientIp = getClientIP(request);
        String queryString = request.getQueryString() != null ? "?" + request.getQueryString() : "";
        String userId = MDC.get("userId");  // UserContextFilter에서 설정한 userId

        log.info("[HTTP_REQUEST] {} {} | requestId={} | userId={} | ip={}",
                request.getMethod(),
                request.getRequestURI() + queryString,
                requestId,
                userId != null ? userId : "anonymous",
                clientIp);

        // POST/PUT/PATCH 요청인 경우 Body 로깅 (민감정보 마스킹)
        if (shouldLogRequestBody(request)) {
            String body = getRequestBody(request);
        }
    }

    private void logResponse(ContentCachingRequestWrapper request,
                             ContentCachingResponseWrapper response,
                             String requestId,
                             long duration) {

        int status = response.getStatus();
        String logLevel = getLogLevel(status);

        String logMessage = String.format("[HTTP_RESPONSE] %s %s | requestId=%s | status=%d | duration=%dms",
                request.getMethod(),
                request.getRequestURI(),
                requestId,
                status,
                duration);

        // 상태 코드별 로그 레벨 적용
        switch (logLevel) {
            case "ERROR":
                log.error(logMessage);
                break;
            case "WARN":
                log.warn(logMessage);
                break;
            default:
                log.info(logMessage);
        }

        // 에러 응답인 경우 Response Body 로깅
        if (status >= 400) {
            String responseBody = getResponseBody(response);
            if (responseBody != null && !responseBody.isEmpty()) {
                log.error("[HTTP_RESPONSE_BODY] requestId={} | status={} | body={}",
                         requestId, status, maskSensitiveData(responseBody));
            }
        }
    }

    private String getRequestBody(ContentCachingRequestWrapper request) {
        byte[] content = request.getContentAsByteArray();
        if (content.length == 0) {
            return null;
        }
        String body = new String(content, StandardCharsets.UTF_8);
        return body.length() > MAX_PAYLOAD_LENGTH
               ? body.substring(0, MAX_PAYLOAD_LENGTH) + "... (truncated)"
               : body;
    }

    private String getResponseBody(ContentCachingResponseWrapper response) {
        byte[] content = response.getContentAsByteArray();
        if (content.length == 0) {
            return null;
        }
        String body = new String(content, StandardCharsets.UTF_8);
        return body.length() > MAX_PAYLOAD_LENGTH
               ? body.substring(0, MAX_PAYLOAD_LENGTH) + "... (truncated)"
               : body;
    }

    private String getClientIP(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }

    private String maskSensitiveData(String data) {
        if (data == null) return null;

        return data
                .replaceAll("(\"password\"\\s*:\\s*\")[^\"]*\"", "$1***\"")
                .replaceAll("(\"token\"\\s*:\\s*\")[^\"]*\"", "$1***\"")
                .replaceAll("(\"secret\"\\s*:\\s*\")[^\"]*\"", "$1***\"")
                .replaceAll("(\"authorization\"\\s*:\\s*\")[^\"]*\"", "$1***\"")
                .replaceAll("(\\d{4})(\\d{4})(\\d{4})(\\d{4})", "$1-****-****-$4"); // 카드번호
    }

    private boolean shouldLogRequestBody(HttpServletRequest request) {
        String method = request.getMethod();
        return "POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method);
    }

    private String getLogLevel(int status) {
        if (status >= 500) return "ERROR";
        if (status >= 400) return "WARN";
        return "INFO";
    }

    private boolean isExcludedPath(String path) {
        return path.startsWith("/actuator")
            || path.startsWith("/prometheus")
            || path.startsWith("/health")
            || path.startsWith("/metrics");
    }
}
