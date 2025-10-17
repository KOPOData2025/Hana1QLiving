package com.living.hana.controller;

import com.living.hana.dto.ApiResponse;
import com.living.hana.service.DividendCalculationService;
import com.living.hana.service.DividendService;
import com.living.hana.service.ReitProductService;
import com.living.hana.entity.ReitProduct;
import com.living.hana.client.KsdClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dividend-management")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class DividendManagementController {

    private final ReitProductService reitProductService;
    private final DividendCalculationService dividendCalculationService;
    private final KsdClient ksdClient;
    private final DividendService dividendService;

    /**
     * 상품의 배당 정보 조회 (기존 DividendController 기능 통합)
     */
    @GetMapping("/products/{productCode}/dividends")
    public ResponseEntity<Map<String, Object>> getProductDividends(@PathVariable String productCode) {
        try {
            log.info("상품 배당 정보 조회 - 상품코드: {}", productCode);

            List<Map<String, Object>> dividends = dividendService.getProductDividends(productCode);

            if (dividends.isEmpty()) {
                log.info("배당 정보 없음 - 상품코드: {}", productCode);
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", dividends,
                    "message", "배당 정보가 없습니다."
                ));
            }

            log.info("배당 정보 조회 성공 - 상품코드: {}, 건수: {}", productCode, dividends.size());
            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", dividends,
                "message", "배당 정보 조회 성공"
            ));

        } catch (Exception e) {
            log.error("배당 정보 조회 실패 - 상품코드: {}, 에러: {}", productCode, e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "배당 정보 조회 실패: " + e.getMessage()
            ));
        }
    }

    /**
     * 배당 관리 정보 조회 - 상품별 배당 가능 금액 및 주당 최대 배당금
     */
    @GetMapping("/product/{productCode}/info")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDividendManagementInfo(
            @PathVariable String productCode,
            @RequestParam(value = "period", defaultValue = "current_year") String period) {
        try {
            log.info("배당 관리 정보 조회 요청: {}", productCode);

            // REIT 상품 정보 조회
            ReitProduct product = reitProductService.findProductByCode(productCode);
            if (product == null) {
                return ResponseEntity.ok(ApiResponse.error("존재하지 않는 상품입니다."));
            }

            // 배당 가능 금액 계산 (임대수익 기반)
            BigDecimal availableDividendAmount = dividendCalculationService.calculateAvailableDividendWithPeriod(productCode, period);

            // 총 발행주식수 확인
            Long totalShares = product.getTotalShares();
            if (totalShares == null || totalShares <= 0) {
                return ResponseEntity.ok(ApiResponse.error("총 발행주식수가 설정되지 않았습니다."));
            }

            // 주당 최대 배당금 계산
            BigDecimal maxDividendPerShare = availableDividendAmount.divide(
                new BigDecimal(totalShares), 2, RoundingMode.HALF_UP
            );

            // 상세 계산 내역도 함께 반환
            Map<String, Object> calculationDetails = dividendCalculationService.getCalculationDetails(productCode, period);

            Map<String, Object> dividendInfo = new HashMap<>();
            dividendInfo.put("productCode", product.getProductCode());
            dividendInfo.put("productName", product.getProductName());
            dividendInfo.put("totalShares", totalShares);
            dividendInfo.put("availableDividendAmount", availableDividendAmount);
            dividendInfo.put("maxDividendPerShare", maxDividendPerShare);
            dividendInfo.put("calculationDetails", calculationDetails);

            return ResponseEntity.ok(ApiResponse.successWithMessage(dividendInfo,
                "배당 관리 정보를 성공적으로 조회했습니다."));

        } catch (Exception e) {
            log.error("배당 관리 정보 조회 실패: {}", productCode, e);
            return ResponseEntity.ok(ApiResponse.error("배당 관리 정보 조회에 실패했습니다."));
        }
    }

    /**
     * 총 발행주식수 업데이트
     */
    @PutMapping("/product/{productCode}/total-shares")
    public ResponseEntity<ApiResponse<String>> updateTotalShares(
            @PathVariable String productCode,
            @RequestBody Map<String, Long> request) {
        try {
            Long totalShares = request.get("totalShares");
            if (totalShares == null || totalShares <= 0) {
                return ResponseEntity.ok(ApiResponse.error("올바른 발행주식수를 입력해주세요."));
            }

            log.info("총 발행주식수 업데이트 요청: {} -> {}", productCode, totalShares);

            // 상품 조회 및 업데이트
            ReitProduct product = reitProductService.findProductByCode(productCode);
            if (product == null) {
                return ResponseEntity.ok(ApiResponse.error("존재하지 않는 상품입니다."));
            }

            // 총 발행주식수만 업데이트하는 새로운 ReitProduct 객체 생성
            ReitProduct updateProduct = new ReitProduct();
            updateProduct.setTotalShares(totalShares);
            reitProductService.updateProduct(productCode, updateProduct);

            return ResponseEntity.ok(ApiResponse.successWithMessage("",
                "총 발행주식수가 성공적으로 업데이트되었습니다."));

        } catch (Exception e) {
            log.error("총 발행주식수 업데이트 실패: {}", productCode, e);
            return ResponseEntity.ok(ApiResponse.error("총 발행주식수 업데이트에 실패했습니다."));
        }
    }

    /**
     * KSD 배당락일 스케줄러 실행 트리거
     */
    @PostMapping("/product/{productCode}/trigger-ksd-scheduler")
    public ResponseEntity<ApiResponse<String>> triggerKsdDividendScheduler(
            @PathVariable String productCode) {
        try {
            log.info("KSD 배당락일 스케줄러 실행 트리거 요청: {}", productCode);

            // 1. REIT 상품 검증
            ReitProduct product = reitProductService.findProductByCode(productCode);
            if (product == null) {
                return ResponseEntity.ok(ApiResponse.error("존재하지 않는 상품입니다."));
            }

            // 2. KSD 서버에 스케줄러 실행 요청
            boolean success = ksdClient.triggerDividendScheduler(productCode);

            if (success) {
                return ResponseEntity.ok(ApiResponse.successWithMessage("",
                    "KSD 배당락일 스케줄러가 성공적으로 실행되었습니다."));
            } else {
                return ResponseEntity.ok(ApiResponse.error("KSD 서버에서 스케줄러 실행에 실패했습니다."));
            }

        } catch (Exception e) {
            log.error("KSD 스케줄러 트리거 실패: {} - {}", productCode, e.getMessage(), e);
            return ResponseEntity.ok(ApiResponse.error("KSD 스케줄러 실행 요청에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 배당 계산 및 등록
     */
    @PostMapping("/product/{productCode}/calculate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> calculateDividend(
            @PathVariable String productCode,
            @RequestBody Map<String, Object> request) {
        try {
            log.info("배당 계산 요청: {} - {}", productCode, request);

            BigDecimal dividendPerShare = new BigDecimal(request.get("dividendPerShare").toString());
            Integer dividendYear = (Integer) request.get("dividendYear");
            Integer dividendQuarter = request.get("dividendQuarter") != null ?
                (Integer) request.get("dividendQuarter") : null;
            String recordDate = (String) request.get("recordDate");
            String paymentDate = (String) request.get("paymentDate");
            BigDecimal basePrice = request.get("basePrice") != null ?
                new BigDecimal(request.get("basePrice").toString()) : null; // 배당락일 기준 주가

            // 배당 가능 금액 검증
            ReitProduct product = reitProductService.findProductByCode(productCode);
            if (product == null || product.getTotalShares() == null || product.getTotalShares() <= 0) {
                return ResponseEntity.ok(ApiResponse.error("총 발행주식수가 설정되지 않았습니다."));
            }

            // 해당 연도의 배당 가능 금액 계산
            String period = dividendQuarter != null ? "current_quarter" : "current_year";
            BigDecimal availableDividendAmount = dividendCalculationService.calculateAvailableDividendWithPeriod(productCode, period);

            // 요청한 총 배당금 계산
            BigDecimal requestedTotalDividend = dividendPerShare.multiply(new BigDecimal(product.getTotalShares()));

            // 배당 가능 금액 초과 검증
            if (requestedTotalDividend.compareTo(availableDividendAmount) > 0) {
                return ResponseEntity.ok(ApiResponse.error(
                    String.format("요청한 총 배당금 %s원이 배당 가능 금액 %s원을 초과합니다.",
                    requestedTotalDividend.toPlainString(), availableDividendAmount.toPlainString())));
            }

            // 배당 계산 및 등록 수행
            var dividend = dividendCalculationService.calculateAndRegisterDividend(
                productCode, dividendYear, dividendQuarter, dividendPerShare,
                java.time.LocalDate.parse(recordDate), java.time.LocalDate.parse(paymentDate),
                basePrice // 기준가 추가
            );

            Map<String, Object> result = new HashMap<>();
            result.put("dividendId", dividend.getDividendId());
            result.put("productCode", dividend.getProductCode());
            result.put("dividendYear", dividend.getDividendYear());
            result.put("dividendQuarter", dividend.getDividendQuarter());
            result.put("dividendPerShare", dividend.getDividendAmount());
            result.put("recordDate", dividend.getRecordDate().toString());
            result.put("paymentDate", dividend.getPaymentDate().toString());
            result.put("status", "등록완료");

            // 총 배당금 계산 (이미 조회된 product 변수 재사용)
            if (product != null && product.getTotalShares() != null) {
                BigDecimal totalDividendAmount = dividendPerShare.multiply(new BigDecimal(product.getTotalShares()));
                result.put("totalShares", product.getTotalShares());
                result.put("totalDividendAmount", totalDividendAmount);
            }

            return ResponseEntity.ok(ApiResponse.successWithMessage(result,
                "배당이 성공적으로 계산되고 등록되었습니다."));

        } catch (Exception e) {
            log.error("배당 계산 실패: {} - {}", productCode, e.getMessage(), e);
            return ResponseEntity.ok(ApiResponse.error("배당 계산에 실패했습니다: " + e.getMessage()));
        }
    }
}