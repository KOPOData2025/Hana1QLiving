package com.living.hana.controller;

import com.living.hana.dto.ApiResponse;
import com.living.hana.dto.ReitProductRequest;
import com.living.hana.dto.ReitProductResponse;
import com.living.hana.dto.ReitBuildingMappingRequest;
import com.living.hana.dto.ReitBuildingMappingResponse;
import com.living.hana.dto.ReitDividendRequest;
import com.living.hana.dto.ReitDividendResponse;
import com.living.hana.entity.ReitProduct;
import com.living.hana.entity.ReitBuildingMapping;
import com.living.hana.entity.ReitDividend;
import com.living.hana.service.ReitProductService;
import com.living.hana.client.HanaSecuritiesApiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reit")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class ReitProductController {

    private final ReitProductService reitProductService;
    private final HanaSecuritiesApiClient securitiesApiClient;

    // ===== REIT 상품 관리 API =====

    @GetMapping("/products")
    public ResponseEntity<ApiResponse<List<ReitProductResponse>>> getAllProducts() {
        try {
            List<ReitProduct> products = reitProductService.findAllProducts();
            List<ReitProductResponse> responses = ReitProductResponse.fromEntityList(products);
            return ResponseEntity.ok(ApiResponse.successWithMessage(responses, "REIT 상품 목록을 성공적으로 조회했습니다."));
        } catch (Exception e) {
            log.error("REIT 상품 목록 조회 실패", e);
            return ResponseEntity.ok(ApiResponse.error("REIT 상품 목록 조회에 실패했습니다."));
        }
    }

    @GetMapping("/products/{productCode}")
    public ResponseEntity<ApiResponse<ReitProductResponse>> getProductByCode(@PathVariable String productCode) {
        try {
            ReitProduct product = reitProductService.findProductByCode(productCode);
            if (product != null) {
                ReitProductResponse response = ReitProductResponse.fromEntity(product);
                return ResponseEntity.ok(ApiResponse.successWithMessage(response, "REIT 상품 정보를 성공적으로 조회했습니다."));
            }
            return ResponseEntity.ok(ApiResponse.error("존재하지 않는 상품입니다."));
        } catch (Exception e) {
            log.error("REIT 상품 조회 실패: {}", productCode, e);
            return ResponseEntity.ok(ApiResponse.error("REIT 상품 조회에 실패했습니다."));
        }
    }

    @GetMapping("/products/exchange/{stockExchange}")
    public ResponseEntity<ApiResponse<List<ReitProductResponse>>> getProductsByExchange(@PathVariable String stockExchange) {
        try {
            List<ReitProduct> products = reitProductService.findProductsByExchange(stockExchange);
            List<ReitProductResponse> responses = ReitProductResponse.fromEntityList(products);
            return ResponseEntity.ok(ApiResponse.successWithMessage(responses, "거래소별 REIT 상품 목록을 성공적으로 조회했습니다."));
        } catch (Exception e) {
            log.error("거래소별 REIT 상품 조회 실패: {}", stockExchange, e);
            return ResponseEntity.ok(ApiResponse.error("거래소별 REIT 상품 조회에 실패했습니다."));
        }
    }

    @GetMapping("/products/search")
    public ResponseEntity<ApiResponse<List<ReitProductResponse>>> searchProducts(@RequestParam String keyword) {
        try {
            List<ReitProduct> products = reitProductService.searchProductsByName(keyword);
            List<ReitProductResponse> responses = ReitProductResponse.fromEntityList(products);
            return ResponseEntity.ok(ApiResponse.successWithMessage(responses, "REIT 상품 검색을 성공적으로 완료했습니다."));
        } catch (Exception e) {
            log.error("REIT 상품 검색 실패: {}", keyword, e);
            return ResponseEntity.ok(ApiResponse.error("REIT 상품 검색에 실패했습니다."));
        }
    }

    @PostMapping("/products")
    public ResponseEntity<ApiResponse<ReitProductResponse>> createProduct(@RequestBody ReitProductRequest request) {
        try {
            ReitProduct product = reitProductService.createProduct(request);
            ReitProductResponse response = ReitProductResponse.fromEntity(product);
            return ResponseEntity.ok(ApiResponse.successWithMessage(response, "REIT 상품이 성공적으로 등록되었습니다."));
        } catch (Exception e) {
            log.error("REIT 상품 생성 실패: {}", request.getProductCode(), e);
            return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/products/{productCode}")
    public ResponseEntity<ApiResponse<ReitProductResponse>> updateProduct(
            @PathVariable String productCode,
            @RequestBody ReitProductRequest request) {
        try {
            ReitProduct product = reitProductService.updateProduct(productCode, request);
            ReitProductResponse response = ReitProductResponse.fromEntity(product);
            return ResponseEntity.ok(ApiResponse.successWithMessage(response, "REIT 상품 정보가 성공적으로 수정되었습니다."));
        } catch (Exception e) {
            log.error("REIT 상품 수정 실패: {}", productCode, e);
            return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/products/{productCode}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable String productCode) {
        try {
            reitProductService.deleteProduct(productCode);
            return ResponseEntity.ok(ApiResponse.successWithMessage(null, "REIT 상품이 성공적으로 삭제되었습니다."));
        } catch (Exception e) {
            log.error("REIT 상품 삭제 실패: {}", productCode, e);
            return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
        }
    }

    // ===== 건물 매핑 관리 API =====

    @GetMapping("/products/{productCode}/buildings")
    public ResponseEntity<ApiResponse<List<ReitBuildingMappingResponse>>> getBuildingsByProduct(@PathVariable String productCode) {
        try {
            List<ReitBuildingMappingResponse> buildings = reitProductService.findBuildingsByProduct(productCode);
            return ResponseEntity.ok(ApiResponse.successWithMessage(buildings, "REIT 상품의 포함 건물 목록을 성공적으로 조회했습니다."));
        } catch (Exception e) {
            log.error("REIT 상품 포함 건물 조회 실패: {}", productCode, e);
            return ResponseEntity.ok(ApiResponse.error("포함 건물 조회에 실패했습니다."));
        }
    }

    @GetMapping("/products/{productCode}/buildings/active")
    public ResponseEntity<ApiResponse<List<ReitBuildingMappingResponse>>> getActiveBuildingsByProduct(@PathVariable String productCode) {
        try {
            List<ReitBuildingMappingResponse> buildings = reitProductService.findActiveBuildingsByProduct(productCode);
            return ResponseEntity.ok(ApiResponse.successWithMessage(buildings, "REIT 상품의 현재 포함 건물 목록을 성공적으로 조회했습니다."));
        } catch (Exception e) {
            log.error("REIT 상품 현재 포함 건물 조회 실패: {}", productCode, e);
            return ResponseEntity.ok(ApiResponse.error("현재 포함 건물 조회에 실패했습니다."));
        }
    }

    @PostMapping("/products/{productCode}/buildings")
    public ResponseEntity<ApiResponse<ReitBuildingMappingResponse>> addBuildingToProduct(
            @PathVariable String productCode,
            @RequestBody ReitBuildingMappingRequest request) {
        try {
            ReitBuildingMapping mapping = reitProductService.addBuildingToProduct(productCode, request);
            ReitBuildingMappingResponse response = ReitBuildingMappingResponse.fromEntity(mapping);
            return ResponseEntity.ok(ApiResponse.successWithMessage(response, "건물이 REIT 상품에 성공적으로 추가되었습니다."));
        } catch (Exception e) {
            log.error("REIT 상품에 건물 추가 실패: {} -> {}", productCode, request.getBuildingId(), e);
            return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/mappings/{mappingId}/exclude")
    public ResponseEntity<ApiResponse<Void>> removeBuildingFromProduct(@PathVariable Long mappingId) {
        try {
            reitProductService.removeBuildingFromProduct(mappingId);
            return ResponseEntity.ok(ApiResponse.successWithMessage(null, "건물이 REIT 상품에서 성공적으로 제외되었습니다."));
        } catch (Exception e) {
            log.error("REIT 상품에서 건물 제외 실패: {}", mappingId, e);
            return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/mappings/{mappingId}")
    public ResponseEntity<ApiResponse<Void>> deleteBuildingMapping(@PathVariable Long mappingId) {
        try {
            reitProductService.deleteBuildingMapping(mappingId);
            return ResponseEntity.ok(ApiResponse.successWithMessage(null, "건물 매핑이 성공적으로 삭제되었습니다."));
        } catch (Exception e) {
            log.error("REIT 건물 매핑 삭제 실패: {}", mappingId, e);
            return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
        }
    }

    // ===== 배당 관리 API =====

    @GetMapping("/products/{productCode}/dividends")
    public ResponseEntity<ApiResponse<List<ReitDividendResponse>>> getDividendsByProduct(@PathVariable String productCode) {
        try {
            List<ReitDividend> dividends = reitProductService.findDividendsByProduct(productCode);
            List<ReitDividendResponse> responses = ReitDividendResponse.fromEntityList(dividends);
            return ResponseEntity.ok(ApiResponse.successWithMessage(responses, "REIT 상품의 배당 내역을 성공적으로 조회했습니다."));
        } catch (Exception e) {
            log.error("REIT 상품 배당 내역 조회 실패: {}", productCode, e);
            return ResponseEntity.ok(ApiResponse.error("배당 내역 조회에 실패했습니다."));
        }
    }

    @GetMapping("/products/{productCode}/dividends/year/{year}")
    public ResponseEntity<ApiResponse<List<ReitDividendResponse>>> getDividendsByProductAndYear(
            @PathVariable String productCode,
            @PathVariable Integer year) {
        try {
            List<ReitDividend> dividends = reitProductService.findDividendsByProductAndYear(productCode, year);
            List<ReitDividendResponse> responses = ReitDividendResponse.fromEntityList(dividends);
            return ResponseEntity.ok(ApiResponse.successWithMessage(responses, "연도별 배당 내역을 성공적으로 조회했습니다."));
        } catch (Exception e) {
            log.error("REIT 상품 연도별 배당 내역 조회 실패: {} - {}", productCode, year, e);
            return ResponseEntity.ok(ApiResponse.error("연도별 배당 내역 조회에 실패했습니다."));
        }
    }

    @GetMapping("/products/{productCode}/dividends/recent")
    public ResponseEntity<ApiResponse<List<ReitDividendResponse>>> getRecentDividends(
            @PathVariable String productCode,
            @RequestParam(defaultValue = "5") Integer limit) {
        try {
            List<ReitDividend> dividends = reitProductService.findRecentDividends(productCode, limit);
            List<ReitDividendResponse> responses = ReitDividendResponse.fromEntityList(dividends);
            return ResponseEntity.ok(ApiResponse.successWithMessage(responses, "최근 배당 내역을 성공적으로 조회했습니다."));
        } catch (Exception e) {
            log.error("REIT 상품 최근 배당 내역 조회 실패: {}", productCode, e);
            return ResponseEntity.ok(ApiResponse.error("최근 배당 내역 조회에 실패했습니다."));
        }
    }

    @PostMapping("/products/{productCode}/dividends")
    public ResponseEntity<ApiResponse<ReitDividendResponse>> createDividend(
            @PathVariable String productCode,
            @RequestBody ReitDividendRequest request) {
        try {
            ReitDividend dividend = reitProductService.createDividend(productCode, request);
            ReitDividendResponse response = ReitDividendResponse.fromEntity(dividend);
            return ResponseEntity.ok(ApiResponse.successWithMessage(response, "배당 정보가 성공적으로 등록되었습니다."));
        } catch (Exception e) {
            log.error("REIT 배당 정보 생성 실패: {}", productCode, e);
            return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/dividends/{dividendId}")
    public ResponseEntity<ApiResponse<ReitDividendResponse>> updateDividend(
            @PathVariable Long dividendId,
            @RequestBody ReitDividendRequest request) {
        try {
            ReitDividend dividend = reitProductService.updateDividend(dividendId, request);
            ReitDividendResponse response = ReitDividendResponse.fromEntity(dividend);
            return ResponseEntity.ok(ApiResponse.successWithMessage(response, "배당 정보가 성공적으로 수정되었습니다."));
        } catch (Exception e) {
            log.error("REIT 배당 정보 수정 실패: {}", dividendId, e);
            return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/dividends/{dividendId}")
    public ResponseEntity<ApiResponse<Void>> deleteDividend(@PathVariable Long dividendId) {
        try {
            reitProductService.deleteDividend(dividendId);
            return ResponseEntity.ok(ApiResponse.successWithMessage(null, "배당 정보가 성공적으로 삭제되었습니다."));
        } catch (Exception e) {
            log.error("REIT 배당 정보 삭제 실패: {}", dividendId, e);
            return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
        }
    }

    // ===== 시뮬레이션 API =====

    @PostMapping("/simulation/rank")
    public ResponseEntity<ApiResponse<Map<String, Object>>> runSimulation(@RequestBody Map<String, Object> simulationRequest) {
        try {
            log.info("시뮬레이션 요청 받음: {}", simulationRequest);

            // 하나증권 API로 요청 전달
            Map<String, Object> result = securitiesApiClient.runSimulation(simulationRequest);

            if (result != null && Boolean.TRUE.equals(result.get("success"))) {
                Map<String, Object> data = (Map<String, Object>) result.get("data");
                return ResponseEntity.ok(ApiResponse.successWithMessage(data, "시뮬레이션이 성공적으로 완료되었습니다."));
            } else {
                String errorMessage = result != null ? (String) result.get("message") : "시뮬레이션 실행 실패";
                return ResponseEntity.ok(ApiResponse.error(errorMessage));
            }
        } catch (Exception e) {
            log.error("시뮬레이션 실행 중 오류 발생", e);
            return ResponseEntity.ok(ApiResponse.error("시뮬레이션 실행 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

}