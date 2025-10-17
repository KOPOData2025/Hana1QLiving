package com.living.hana.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class KsdClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${external.ksd.base-url:http://localhost:8095}")
    private String baseUrl;

    /**
     * 예탁결제원에 배당 정보 등록
     */
    public boolean registerDividend(String productCode, Integer dividendYear, Integer dividendQuarter,
                                   BigDecimal dividendPerShare, BigDecimal totalDividendAmount,
                                   LocalDate recordDate, LocalDate paymentDate) {
        try {
            String url = baseUrl + "/api/dividend/register";

            Map<String, Object> request = Map.of(
                "productCode", productCode,
                "dividendYear", dividendYear,
                "dividendQuarter", dividendQuarter != null ? dividendQuarter : 0,
                "dividendPerShare", dividendPerShare,
                "totalDividendAmount", totalDividendAmount,
                "recordDate", recordDate.toString(),
                "paymentDate", paymentDate.toString()
            );

            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            log.info("KSD 배당 등록 API 호출: {} - 주당 배당금: {}, 총 배당금: {}",
                productCode, dividendPerShare, totalDividendAmount);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );

            log.info("KSD 배당 등록 응답: {}", response.getStatusCode());

            if (response.getStatusCode().is2xxSuccessful()) {
                Map<String, Object> responseBody = response.getBody();
                if (responseBody != null && (Boolean) responseBody.get("success")) {
                    log.info("KSD 배당 등록 성공: {}", productCode);
                    return true;
                }
            }

            log.error("KSD 배당 등록 실패: {}", response.getBody());
            return false;

        } catch (Exception e) {
            log.error("KSD 배당 등록 API 호출 실패: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * KSD 서버의 배당락일 스케줄러 실행 트리거
     */
    public boolean triggerDividendScheduler(String productCode) {
        try {
            String url = baseUrl + "/api/dividend/trigger-scheduler";

            Map<String, Object> request = Map.of(
                "productCode", productCode,
                "triggerType", "manual"
            );

            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            log.info("KSD 배당락일 스케줄러 실행 트리거 API 호출: {}", productCode);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );

            log.info("KSD 스케줄러 트리거 응답: {}", response.getStatusCode());

            if (response.getStatusCode().is2xxSuccessful()) {
                Map<String, Object> responseBody = response.getBody();
                if (responseBody != null && (Boolean) responseBody.getOrDefault("success", false)) {
                    log.info("KSD 배당락일 스케줄러 트리거 성공: {}", productCode);
                    return true;
                }
            }

            log.error("KSD 배당락일 스케줄러 트리거 실패: {}", response.getBody());
            return false;

        } catch (Exception e) {
            log.error("KSD 배당락일 스케줄러 트리거 API 호출 실패: {} - {}", productCode, e.getMessage(), e);
            return false;
        }
    }

    /**
     * KSD 헬스체크
     */
    public boolean isHealthy() {
        try {
            String url = baseUrl + "/api/dividend/health";

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );

            return response.getStatusCode().is2xxSuccessful();

        } catch (Exception e) {
            log.error("KSD 헬스체크 실패: {}", e.getMessage());
            return false;
        }
    }
}