package com.living.hana.service;

import com.living.hana.annotation.Logging;
import com.living.hana.dto.AuthRequest;
import com.living.hana.dto.AuthResponse;
import com.living.hana.dto.UserRegistrationRequest;
import com.living.hana.entity.User;
import com.living.hana.exception.BusinessException;
import com.living.hana.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;

    @Logging(operation = "사용자 로그인", category = "AUTH", maskSensitive = true)
    public AuthResponse login(AuthRequest request) {
        try {
            log.info("[AUTH] 로그인 시도: {}", request.getEmail());

            if (userService.authenticateUser(request.getEmail(), request.getPassword())) {
                User user = userService.findByEmail(request.getEmail());
                String token = jwtTokenProvider.generateToken(user);

                log.info("[AUTH] 로그인 성공: userId={}, email={}", user.getId(), user.getEmail());
                return new AuthResponse(token, user.getEmail(), user.getRole(), user.getName(), user.getId(), user.getPhone(), user.getBeforeAddress(), user.getUserCi(), user.getUsername());
            }

            log.warn("[AUTH] 로그인 실패: {}, 원인: 잘못된 인증정보", request.getEmail());
            throw new BusinessException("로그인 실패");
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("[AUTH] 로그인 예외: {}", e.getMessage(), e);
            throw e;
        }
    }

    @Logging(operation = "사용자 회원가입", category = "AUTH", maskSensitive = true)
    public AuthResponse register(UserRegistrationRequest request) {
        try {
            log.info("[AUTH] 회원가입 시도: {}", request.getEmail());

            User user = new User();
            user.setPassword(request.getPassword());
            user.setName(request.getName());
            user.setEmail(request.getEmail());
            user.setPhone(request.getPhone());
            user.setBeforeAddress(request.getBeforeAddress());
            user.setAgreeMarketing(request.getAgreeMarketing());

            User createdUser = userService.createUser(user);

            if (createdUser != null) {
                // 토큰 생성
                String token = jwtTokenProvider.generateToken(createdUser);

                log.info("[AUTH] 회원가입 성공: userId={}, email={}", createdUser.getId(), createdUser.getEmail());
                return new AuthResponse(token, createdUser.getEmail(), createdUser.getRole(),
                        createdUser.getName(), createdUser.getId(), createdUser.getPhone(), createdUser.getBeforeAddress(), createdUser.getUserCi(), createdUser.getUsername());
            } else {
                log.error("[AUTH] 회원가입 실패: 사용자 생성 실패, email={}", request.getEmail());
                throw new BusinessException("사용자 생성에 실패했습니다.");
            }

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("[AUTH] 회원가입 예외: {}", e.getMessage(), e);
            throw e;
        }
    }
}
