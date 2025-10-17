package com.living.hana.filter;

import com.living.hana.security.JwtTokenProvider;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;

/**
 * 모든 요청에 대해 userId를 MDC에 자동 설정하는 필터
 * - JWT 토큰에서 userId 추출
 * - MDC에 설정하여 모든 로그에 자동 포함
 * - 요청 완료 후 MDC 정리
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(1)
public class UserContextFilter implements Filter {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        try {
            String userId = extractUserIdFromRequest((HttpServletRequest) request);
            MDC.put("userId", userId != null ? userId : "anonymous");

            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }

    private String extractUserIdFromRequest(HttpServletRequest request) {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && jwtTokenProvider.validateToken(jwt)) {
                String userType = jwtTokenProvider.getUserTypeFromToken(jwt);

                if ("USER".equals(userType)) {
                    Long userId = jwtTokenProvider.getUserIdFromToken(jwt);
                    return userId != null ? userId.toString() : null;
                } else if ("ADMIN".equals(userType)) {
                    String employeeNumber = jwtTokenProvider.getEmployeeNumberFromToken(jwt);
                    return "admin_" + employeeNumber;
                }
            }

            return null;
        } catch (Exception e) {
            // 토큰 파싱 실패는 조용히 처리 (anonymous로 처리됨)
            return null;
        }
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}