package com.hana.securities.controller;

import com.hana.securities.service.DividendService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class DividendController {

    private final DividendService dividendService;

    /**
     * 특정 상품을 보유한 증권계좌 목록 조회 (KSD에서 호출)
     */
    @GetMapping("/accounts/by-product/{productCode}")
    public ResponseEntity<List<Map<String, Object>>> getAccountsByProduct(@PathVariable String productCode) {
        log.info("상품별 계좌 조회 요청: {}", productCode);

        try {
            List<Map<String, Object>> accounts = dividendService.getAccountsByProduct(productCode);
            log.info("상품별 계좌 조회 결과: {} 건", accounts.size());
            return ResponseEntity.ok(accounts);

        } catch (Exception e) {
            log.error("상품별 계좌 조회 실패: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 증권계좌에 배당금 지급 (KSD에서 호출)
     */
    @PostMapping("/accounts/dividend")
    public ResponseEntity<Map<String, Object>> payDividend(@RequestBody Map<String, Object> request) {
        String accountNumber = (String) request.get("accountNumber");
        String productCode = (String) request.get("productCode");
        Double amount = (Double) request.get("amount");
        String description = (String) request.get("description");

        log.info("배당금 지급 요청: {} -> {} ({})", accountNumber, amount, productCode);

        try {
            boolean success = dividendService.payDividend(accountNumber, productCode, amount, description);

            Map<String, Object> response = Map.of(
                "success", success,
                "message", success ? "배당금 지급 완료" : "배당금 지급 실패",
                "accountNumber", accountNumber,
                "amount", amount
            );

            if (success) {
                log.info("배당금 지급 성공: {} -> {}", accountNumber, amount);
                return ResponseEntity.ok(response);
            } else {
                log.error("배당금 지급 실패: {} -> {}", accountNumber, amount);
                return ResponseEntity.badRequest().body(response);
            }

        } catch (Exception e) {
            log.error("배당금 지급 중 예외: {} -> {}", accountNumber, e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "배당금 지급 실패: " + e.getMessage(),
                "accountNumber", accountNumber,
                "amount", amount
            ));
        }
    }

    /**
     * 사용자별 배당 수익 내역 조회 (모바일 앱에서 호출)
     */
    @GetMapping("/accounts/{userCi}/dividends")
    public ResponseEntity<List<Map<String, Object>>> getDividendHistory(@PathVariable String userCi) {
        log.info("사용자별 배당 내역 조회 - userCi: {}", userCi);

        try {
            List<Map<String, Object>> dividends = dividendService.getDividendHistory(userCi);
            log.info("배당 내역 조회 결과: {} 건", dividends.size());
            return ResponseEntity.ok(dividends);

        } catch (Exception e) {
            log.error("배당 내역 조회 실패: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 전체 배당 통계 (관리용)
     */
    @GetMapping("/dividends/statistics")
    public ResponseEntity<Map<String, Object>> getDividendStatistics() {
        log.info("배당 통계 조회 요청");

        try {
            Map<String, Object> statistics = dividendService.getDividendStatistics();
            return ResponseEntity.ok(statistics);

        } catch (Exception e) {
            log.error("배당 통계 조회 실패: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }
}