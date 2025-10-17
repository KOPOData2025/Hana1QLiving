package com.living.hana.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.living.hana.security.JwtTokenProvider;
import com.living.hana.service.UserService;
import com.living.hana.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Transactional
public class InvestmentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserService userService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String testUserToken;
    private User testUser;

    @BeforeEach
    void setUp() {
        // 테스트 사용자 생성
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@hanaoneq.com");
        testUser.setName("테스트사용자");
        testUser.setPhone("010-1234-5678");
        testUser.setPassword(passwordEncoder.encode("test123"));
        testUser.setRole("ROLE_USER");
        testUser.setStatus("ACTIVE");
        testUser.setAgreeMarketing(true);
        testUser.setBeforeAddress("서울시 강남구");
        testUser.setCurrentAddress("하나원큐리빙 오피스텔 101호");

        // JWT 토큰 생성
        testUserToken = jwtTokenProvider.generateToken(testUser);
    }

    @Test
    void testInvestmentServiceIntegration() throws Exception {
        // 1. 기존 사용자 프로필 조회 기능 테스트
        mockMvc.perform(get("/api/proxy/user/profile")
                .header("Authorization", "Bearer " + testUserToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("테스트사용자"));

        // 2. 특정 사용자 정보 조회 테스트
        mockMvc.perform(get("/api/proxy/user/1")
                .header("Authorization", "Bearer " + testUserToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1));

        // 3. 투자 서비스 헬스체크 테스트
        mockMvc.perform(get("/api/proxy/investment/health")
                .header("Authorization", "Bearer " + testUserToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void testInvestmentProductsAccess() throws Exception {
        // 1. 투자 상품 목록 조회 테스트
        mockMvc.perform(get("/api/proxy/investment/products")
                .header("Authorization", "Bearer " + testUserToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 2. 추천 상품 조회 테스트
        mockMvc.perform(get("/api/proxy/investment/products/recommended")
                .header("Authorization", "Bearer " + testUserToken)
                .param("userRiskLevel", "3")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void testPortfolioAccess() throws Exception {
        // 1. 포트폴리오 조회 테스트
        mockMvc.perform(get("/api/proxy/investment/portfolio")
                .header("Authorization", "Bearer " + testUserToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 2. 포트폴리오 요약 조회 테스트
        mockMvc.perform(get("/api/proxy/investment/portfolio/summary")
                .header("Authorization", "Bearer " + testUserToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 3. 포트폴리오 분석 조회 테스트
        mockMvc.perform(get("/api/proxy/investment/portfolio/analysis")
                .header("Authorization", "Bearer " + testUserToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void testOrderProcessing() throws Exception {
        // 1. 주문 예상 계산 테스트
        Map<String, Object> estimateRequest = new HashMap<>();
        estimateRequest.put("productId", "HANA_REITS_001");
        estimateRequest.put("orderType", "BUY");
        estimateRequest.put("quantity", 10);
        estimateRequest.put("unitPrice", 10000);

        mockMvc.perform(post("/api/proxy/investment/orders/estimate")
                .header("Authorization", "Bearer " + testUserToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(estimateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 2. 매수 주문 처리 테스트
        Map<String, Object> buyRequest = new HashMap<>();
        buyRequest.put("userId", 1L);
        buyRequest.put("productId", "HANA_REITS_001");
        buyRequest.put("orderType", "BUY");
        buyRequest.put("quantity", 5);
        buyRequest.put("unitPrice", 10000);
        buyRequest.put("accountNumber", "110-123-456789");
        buyRequest.put("password", "1234");
        buyRequest.put("channel", "APP");

        mockMvc.perform(post("/api/proxy/investment/orders/buy")
                .header("Authorization", "Bearer " + testUserToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buyRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void testTransactionHistory() throws Exception {
        // 1. 거래내역 조회 테스트
        mockMvc.perform(get("/api/proxy/investment/transactions")
                .header("Authorization", "Bearer " + testUserToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 2. 최근 거래내역 조회 테스트
        mockMvc.perform(get("/api/proxy/investment/transactions/recent")
                .header("Authorization", "Bearer " + testUserToken)
                .param("limit", "5")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 3. 거래 통계 조회 테스트
        mockMvc.perform(get("/api/proxy/investment/statistics")
                .header("Authorization", "Bearer " + testUserToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void testUnauthorizedAccess() throws Exception {
        // 1. 토큰 없이 접근 테스트
        mockMvc.perform(get("/api/proxy/investment/portfolio")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());

        // 2. 잘못된 토큰으로 접근 테스트
        mockMvc.perform(get("/api/proxy/investment/portfolio")
                .header("Authorization", "Bearer invalid_token")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());

        // 3. 다른 사용자 정보 접근 테스트
        mockMvc.perform(get("/api/proxy/user/999")
                .header("Authorization", "Bearer " + testUserToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    void testServiceConnectivity() throws Exception {
        // 1. 투자 서비스 연결 상태 확인
        mockMvc.perform(get("/api/proxy/investment/health")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 2. 외부 데이터 동기화 테스트
        mockMvc.perform(post("/api/proxy/investment/sync-data")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 3. 시장 데이터 조회 테스트
        mockMvc.perform(get("/api/proxy/investment/market-data")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void testTokenValidation() throws Exception {
        // 1. 토큰 검증 테스트
        mockMvc.perform(get("/api/proxy/user/validate-token")
                .header("Authorization", "Bearer " + testUserToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.userId").value(1));

        // 2. 만료된 토큰 테스트 (시뮬레이션)
        mockMvc.perform(get("/api/proxy/user/validate-token")
                .header("Authorization", "Bearer expired_token")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.valid").value(false));
    }

    @Test
    void testErrorHandling() throws Exception {
        // 1. 잘못된 상품 ID로 조회 테스트
        mockMvc.perform(get("/api/proxy/investment/products/INVALID_PRODUCT")
                .header("Authorization", "Bearer " + testUserToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());

        // 2. 잘못된 주문 데이터 테스트
        Map<String, Object> invalidOrder = new HashMap<>();
        invalidOrder.put("productId", ""); // 빈 상품 ID
        invalidOrder.put("quantity", -1);   // 음수 수량

        mockMvc.perform(post("/api/proxy/investment/orders/buy")
                .header("Authorization", "Bearer " + testUserToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidOrder)))
                .andExpect(status().isBadRequest());
    }
}