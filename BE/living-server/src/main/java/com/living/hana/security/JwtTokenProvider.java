package com.living.hana.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
@Slf4j
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    private SecretKey getSigningKey() {
        try {
            byte[] keyBytes = jwtSecret.getBytes();
            if (keyBytes.length >= 64) {
                return Keys.hmacShaKeyFor(keyBytes);
            } else {
                return Jwts.SIG.HS512.key().build();
            }
        } catch (Exception e) {
            log.error("Error creating signing key: {}", e.getMessage());
            return Jwts.SIG.HS512.key().build();
        }
    }

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        // 사용자 타입 구분을 위한 클레임 추가
        if (userDetails instanceof com.living.hana.entity.Admin) {
            claims.put("userType", "ADMIN");
            // Admin의 경우 employeeNumber를 subject로 사용
            return createToken(claims, ((com.living.hana.entity.Admin) userDetails).getEmployeeNumber());
        } else if (userDetails instanceof com.living.hana.entity.User) {
            claims.put("userType", "USER");
            claims.put("userId", ((com.living.hana.entity.User) userDetails).getId());
            // User의 경우 userCi를 subject로 사용
            return createToken(claims, ((com.living.hana.entity.User) userDetails).getUserCi());
        } else {
            claims.put("userType", "USER");
            // 기타 경우 username을 subject로 사용
            return createToken(claims, userDetails.getUsername());
        }
    }

    private String createToken(Map<String, Object> claims, String subject) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(getSigningKey(), Jwts.SIG.HS512)
                .compact();
    }

    public String getEmployeeNumberFromToken(String token) {
        try {
            return getClaimFromToken(token, Claims::getSubject);
        } catch (Exception e) {
            log.error("Error getting employee number from token: {}", e.getMessage());
            return null;
        }
    }

    // 기존 메서드는 하위 호환성을 위해 유지
    @Deprecated
    public String getUsernameFromToken(String token) {
        return getEmployeeNumberFromToken(token);
    }

    public <T> T getClaimFromToken(String token, java.util.function.Function<Claims, T> claimsResolver) {
        final Claims claims = getAllClaimsFromToken(token);
        return claimsResolver.apply(claims);
    }

    private Claims getAllClaimsFromToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }

    public String getUserTypeFromToken(String token) {
        try {
            Claims claims = getAllClaimsFromToken(token);
            return claims.get("userType", String.class);
        } catch (Exception e) {
            log.error("Error getting user type from token: {}", e.getMessage());
            return null;
        }
    }

    public Long getUserIdFromToken(String token) {
        try {
            Claims claims = getAllClaimsFromToken(token);
            Object userIdClaim = claims.get("userId");
            if (userIdClaim != null) {
                if (userIdClaim instanceof Number) {
                    return ((Number) userIdClaim).longValue();
                } else if (userIdClaim instanceof String) {
                    return Long.parseLong((String) userIdClaim);
                }
            }
            return null;
        } catch (Exception e) {
            log.error("Error getting user ID from token: {}", e.getMessage());
            return null;
        }
    }

    // HttpServletRequest에서 토큰 추출
    public String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    // getUserId 메서드 (컨트롤러에서 사용하는 메서드명)
    public Long getUserId(String token) {
        return getUserIdFromToken(token);
    }

    // getUsername 메서드 (컨트롤러에서 사용하는 메서드명)
    public String getUsername(String token) {
        return getUsernameFromToken(token);
    }
}
