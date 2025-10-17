package com.living.hana.config;

import com.living.hana.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class InitializationConfig implements CommandLineRunner {

    private final UserService userService;

    @Override
    public void run(String... args) {
        try {
            log.info("Starting application initialization");
            
            // 기존 사용자들의 userCi 업데이트 (누락된 것 + 잘못된 것)
            userService.updateMissingUserCi();
            userService.fixInvalidUserCi();  // 새 메서드 추가
            
            log.info("Application initialization completed successfully");
        } catch (Exception e) {
            log.error("Error during application initialization: {}", e.getMessage(), e);
            // 초기화 실패가 애플리케이션 시작을 방해하지 않도록 예외를 먹음
        }
    }
}