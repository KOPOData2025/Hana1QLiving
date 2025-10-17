package com.living.hana.security;

import com.living.hana.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final ApplicationContext applicationContext;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && jwtTokenProvider.validateToken(jwt)) {
                String employeeNumber = jwtTokenProvider.getEmployeeNumberFromToken(jwt);
                String userType = jwtTokenProvider.getUserTypeFromToken(jwt);
                
                UserDetails userDetails = null;
                
                // 사용자 타입에 따라 적절한 서비스 호출
                if ("ADMIN".equals(userType)) {
                    try {
                        com.living.hana.service.AdminService adminService = 
                            applicationContext.getBean(com.living.hana.service.AdminService.class);
                        userDetails = adminService.loadUserByUsername(employeeNumber);
                    } catch (Exception ex) {
                        log.error("Could not load admin details for employeeNumber: {}", employeeNumber, ex);
                    }
                } else if ("USER".equals(userType)) {
                    try {
                        UserService userService = applicationContext.getBean(UserService.class);
                        userDetails = userService.loadUserByUsername(employeeNumber);
                    } catch (Exception ex) {
                        log.error("Could not load user details for username: {}", employeeNumber, ex);
                    }
                } else {
                    // userType이 없는 기존 토큰 처리: 먼저 AdminService로 시도, 실패하면 UserService로 시도
                    try {
                        com.living.hana.service.AdminService adminService =
                            applicationContext.getBean(com.living.hana.service.AdminService.class);
                        userDetails = adminService.loadUserByUsername(employeeNumber);
                    } catch (Exception ex) {
                        try {
                            UserService userService = applicationContext.getBean(UserService.class);
                            userDetails = userService.loadUserByUsername(employeeNumber);
                        } catch (Exception userEx) {
                            log.error("Both AdminService and UserService failed for employeeNumber: {}", employeeNumber, userEx);
                        }
                    }
                }
                
                if (userDetails != null) {
                    UsernamePasswordAuthenticationToken authentication = 
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    
                    // Investment API를 위해 userId와 userCi를 request 속성에 설정
                    if (userDetails instanceof com.living.hana.entity.User user) {
                        request.setAttribute("userId", user.getId());
                        request.setAttribute("userCi", user.getUserCi());
                    } else if (userDetails instanceof com.living.hana.entity.Admin admin) {
                        request.setAttribute("userId", admin.getId());
                    }
                }
            }
        } catch (BeansException ex) {
            log.error("Could not get service bean", ex);
        } catch (Exception ex) {
            log.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
