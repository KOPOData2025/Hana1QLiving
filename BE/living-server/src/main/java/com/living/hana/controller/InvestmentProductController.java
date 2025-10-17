package com.living.hana.controller;

import com.living.hana.entity.InvestmentProduct;
import com.living.hana.service.InvestmentProductService;
import com.living.hana.service.UserPortfolioService;
import com.living.hana.service.KoreaInvestmentApiService;
import com.living.hana.entity.ReitProduct;
import com.living.hana.service.ReitProductService;
import com.living.hana.security.JwtTokenProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/investment/products")
public class InvestmentProductController {
    
    @Autowired
    private InvestmentProductService investmentProductService;

    @Autowired
    private UserPortfolioService userPortfolioService;

    @Autowired
    private KoreaInvestmentApiService koreaInvestmentApiService;

    @Autowired
    private ReitProductService reitProductService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllProducts() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<InvestmentProduct> products = investmentProductService.getAllProducts();
            
            // 프론트엔드 형식에 맞게 데이터 변환
            List<Map<String, Object>> productList = products.stream().map(product -> {
                Map<String, Object> productMap = new HashMap<>();
                productMap.put("productId", product.getProductId());
                productMap.put("productName", product.getProductName());
                productMap.put("productCode", product.getProductCode());
                productMap.put("productType", product.getProductType());
                productMap.put("category", product.getProductType() != null ? product.getProductType() : "투자상품");
                productMap.put("description", product.getDescription());
                productMap.put("currentPrice", product.getCurrentPrice() != null ? product.getCurrentPrice().doubleValue() : 0.0);
                productMap.put("nav", product.getNav() != null ? product.getNav().doubleValue() : 0.0);
                productMap.put("totalReturn", product.getTotalReturn() != null ? product.getTotalReturn().doubleValue() : 0.0);
                productMap.put("dividendYield", product.getDividendYield() != null ? product.getDividendYield().doubleValue() : 0.0);
                productMap.put("riskLevel", product.getRiskLevel() != null ? product.getRiskLevel() : 3);
                productMap.put("isRecommended", "REITS".equals(product.getProductType()));
                productMap.put("marketCap", product.getMarketCap() != null ? product.getMarketCap().doubleValue() : 0.0);
                productMap.put("totalShares", product.getTotalShares() != null ? product.getTotalShares() : 0L);
                productMap.put("priceChange", product.getPriceChange() != null ? product.getPriceChange().doubleValue() : 0.0);
                productMap.put("priceChangeSign", product.getPriceChangeSign() != null ? product.getPriceChangeSign() : "0");
                productMap.put("status", product.getStatus());
                return productMap;
            }).toList();
            
            response.put("success", true);
            response.put("data", productList);
            response.put("count", productList.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            if (e.getMessage().contains("외부 API")) {
                response.put("message", "투자 상품 정보 조회에 실패했습니다. 잠시 후 다시 시도해주세요.");
            } else {
                response.put("message", "상품 목록 조회 중 오류가 발생했습니다.");
            }
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    @GetMapping("/{productId}")
    public ResponseEntity<Map<String, Object>> getProduct(@PathVariable String productId) {
        Map<String, Object> response = new HashMap<>();
        try {
            InvestmentProduct product = investmentProductService.getProductById(productId);
            if (product != null) {
                // 실시간 현재가 조회 (포트폴리오와 같은 방식 사용)
                BigDecimal realtimeCurrentPrice = userPortfolioService.getCurrentPrice(productId);
                double currentPriceValue = 0.0;
                
                if (realtimeCurrentPrice != null) {
                    currentPriceValue = realtimeCurrentPrice.doubleValue();
                } else if (product.getCurrentPrice() != null) {
                    // 실시간 가격 조회 실패 시 DB 저장된 가격 사용
                    currentPriceValue = product.getCurrentPrice().doubleValue();
                }
                
                // 프론트엔드 형식에 맞게 데이터 변환
                Map<String, Object> productMap = new HashMap<>();
                productMap.put("productId", product.getProductId());
                productMap.put("productName", product.getProductName());
                productMap.put("productCode", product.getProductCode());
                productMap.put("productType", product.getProductType());
                productMap.put("category", product.getProductType() != null ? product.getProductType() : "투자상품");
                productMap.put("description", product.getDescription());
                productMap.put("currentPrice", currentPriceValue); // 실시간 현재가 사용
                productMap.put("nav", product.getNav() != null ? product.getNav().doubleValue() : 0.0);
                productMap.put("totalReturn", product.getTotalReturn() != null ? product.getTotalReturn().doubleValue() : 0.0);
                productMap.put("dividendYield", product.getDividendYield() != null ? product.getDividendYield().doubleValue() : 0.0);
                productMap.put("riskLevel", product.getRiskLevel() != null ? product.getRiskLevel() : 3);
                productMap.put("isRecommended", "REITS".equals(product.getProductType()));
                productMap.put("marketCap", product.getMarketCap() != null ? product.getMarketCap().doubleValue() : 0.0);
                productMap.put("totalShares", product.getTotalShares() != null ? product.getTotalShares() : 0L);
                productMap.put("minInvestmentAmount", product.getMinInvestmentAmount() != null ? product.getMinInvestmentAmount().doubleValue() : 0.0);
                productMap.put("status", product.getStatus());
                productMap.put("issuer", product.getIssuer());

                // REITS 상품인 경우 ReitProduct에서 managementFee 조회
                if ("REITS".equals(product.getProductType()) && product.getProductCode() != null) {
                    try {
                        log.info("===== managementFee 조회 시작 - productCode: {} =====", product.getProductCode());
                        ReitProduct reitProduct = reitProductService.findProductByCode(product.getProductCode());
                        log.info("ReitProduct 조회 결과: {}", reitProduct != null ? "존재함" : "null");
                        if (reitProduct != null) {
                            log.info("ReitProduct managementFee: {}", reitProduct.getManagementFee());
                            if (reitProduct.getManagementFee() != null) {
                                productMap.put("managementFee", reitProduct.getManagementFee());
                                log.info("managementFee 설정 완료: {}", reitProduct.getManagementFee());
                            } else {
                                productMap.put("managementFee", 0.0);
                                log.warn("managementFee가 null임");
                            }
                        } else {
                            productMap.put("managementFee", 0.0);
                            log.warn("ReitProduct를 찾을 수 없음");
                        }
                    } catch (Exception e) {
                        log.error("managementFee 조회 중 오류 발생", e);
                        productMap.put("managementFee", 0.0);
                    }
                } else {
                    productMap.put("managementFee", 0.0);
                    log.info("REITS 상품이 아니거나 productCode가 없음 - type: {}, code: {}",
                            product.getProductType(), product.getProductCode());
                }

                response.put("success", true);
                response.put("data", productMap);
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "상품을 찾을 수 없습니다.");
                response.put("error", "Product not found");
                return ResponseEntity.status(404).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            if (e.getMessage().contains("외부 API")) {
                response.put("message", "투자 상품 정보를 가져올 수 없습니다. 네트워크 연결을 확인해주세요.");
            } else {
                response.put("message", "상품 조회 중 오류가 발생했습니다.");
            }
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    @GetMapping("/code/{productCode}")
    public ResponseEntity<Map<String, Object>> getProductByCode(@PathVariable String productCode) {
        Map<String, Object> response = new HashMap<>();
        try {
            InvestmentProduct product = investmentProductService.getProductById(productCode);
            if (product != null) {
                // 프론트엔드 형식에 맞게 데이터 변환
                Map<String, Object> productMap = new HashMap<>();
                productMap.put("productId", product.getProductId());
                productMap.put("productName", product.getProductName());
                productMap.put("productCode", product.getProductCode());
                productMap.put("productType", product.getProductType());
                productMap.put("category", product.getProductType() != null ? product.getProductType() : "투자상품");
                productMap.put("description", product.getDescription());
                productMap.put("currentPrice", product.getCurrentPrice() != null ? product.getCurrentPrice().doubleValue() : 0.0);
                productMap.put("nav", product.getNav() != null ? product.getNav().doubleValue() : 0.0);
                productMap.put("totalReturn", product.getTotalReturn() != null ? product.getTotalReturn().doubleValue() : 0.0);
                productMap.put("dividendYield", product.getDividendYield() != null ? product.getDividendYield().doubleValue() : 0.0);
                productMap.put("riskLevel", product.getRiskLevel() != null ? product.getRiskLevel() : 3);
                productMap.put("isRecommended", "REITS".equals(product.getProductType()));
                productMap.put("marketCap", product.getMarketCap() != null ? product.getMarketCap().doubleValue() : 0.0);
                productMap.put("totalShares", product.getTotalShares() != null ? product.getTotalShares() : 0L);
                productMap.put("minInvestmentAmount", product.getMinInvestmentAmount() != null ? product.getMinInvestmentAmount().doubleValue() : 0.0);
                productMap.put("status", product.getStatus());
                productMap.put("issuer", product.getIssuer());

                // REITS 상품인 경우 ReitProduct에서 managementFee 조회
                if ("REITS".equals(product.getProductType()) && product.getProductCode() != null) {
                    try {
                        log.info("===== managementFee 조회 시작 - productCode: {} =====", product.getProductCode());
                        ReitProduct reitProduct = reitProductService.findProductByCode(product.getProductCode());
                        log.info("ReitProduct 조회 결과: {}", reitProduct != null ? "존재함" : "null");
                        if (reitProduct != null) {
                            log.info("ReitProduct managementFee: {}", reitProduct.getManagementFee());
                            if (reitProduct.getManagementFee() != null) {
                                productMap.put("managementFee", reitProduct.getManagementFee());
                                log.info("managementFee 설정 완료: {}", reitProduct.getManagementFee());
                            } else {
                                productMap.put("managementFee", 0.0);
                                log.warn("managementFee가 null임");
                            }
                        } else {
                            productMap.put("managementFee", 0.0);
                            log.warn("ReitProduct를 찾을 수 없음");
                        }
                    } catch (Exception e) {
                        log.error("managementFee 조회 중 오류 발생", e);
                        productMap.put("managementFee", 0.0);
                    }
                } else {
                    productMap.put("managementFee", 0.0);
                    log.info("REITS 상품이 아니거나 productCode가 없음 - type: {}, code: {}",
                            product.getProductType(), product.getProductCode());
                }

                response.put("success", true);
                response.put("data", productMap);
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "상품을 찾을 수 없습니다.");
                response.put("error", "Product not found");
                return ResponseEntity.status(404).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            if (e.getMessage().contains("외부 API")) {
                response.put("message", "투자 상품 정보를 가져올 수 없습니다. 네트워크 연결을 확인해주세요.");
            } else {
                response.put("message", "상품 조회 중 오류가 발생했습니다.");
            }
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    @GetMapping("/type/{productType}")
    public ResponseEntity<Map<String, Object>> getProductsByType(@PathVariable String productType) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<InvestmentProduct> products = investmentProductService.getProductsByType(productType.toUpperCase());
            response.put("success", true);
            response.put("data", products);
            response.put("count", products.size());
            response.put("productType", productType.toUpperCase());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            if (e.getMessage().contains("외부 API")) {
                response.put("message", "투자 상품 유형별 정보 조회에 실패했습니다. 잠시 후 다시 시도해주세요.");
            } else {
                response.put("message", "상품 조회 중 오류가 발생했습니다.");
            }
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    @GetMapping("/risk/{riskLevel}")
    public ResponseEntity<Map<String, Object>> getProductsByRiskLevel(@PathVariable Integer riskLevel) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (riskLevel < 1 || riskLevel > 5) {
                response.put("success", false);
                response.put("message", "위험등급은 1-5 사이의 값이어야 합니다.");
                return ResponseEntity.badRequest().body(response);
            }
            
            List<InvestmentProduct> products = investmentProductService.getProductsByRiskLevel(riskLevel);
            response.put("success", true);
            response.put("data", products);
            response.put("count", products.size());
            response.put("riskLevel", riskLevel);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            if (e.getMessage().contains("외부 API")) {
                response.put("message", "위험등급별 상품 정보 조회에 실패했습니다. 잠시 후 다시 시도해주세요.");
            } else {
                response.put("message", "상품 조회 중 오류가 발생했습니다.");
            }
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchProducts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String productType,
            @RequestParam(required = false) Integer riskLevel,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice) {
        
        Map<String, Object> response = new HashMap<>();
        try {
            List<InvestmentProduct> products = investmentProductService.searchProducts(
                keyword, productType, riskLevel, minPrice, maxPrice);
            
            response.put("success", true);
            response.put("data", products);
            response.put("count", products.size());
            response.put("searchCriteria", Map.of(
                "keyword", keyword != null ? keyword : "",
                "productType", productType != null ? productType : "",
                "riskLevel", riskLevel != null ? riskLevel : "",
                "minPrice", minPrice != null ? minPrice : "",
                "maxPrice", maxPrice != null ? maxPrice : ""
            ));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            if (e.getMessage().contains("외부 API")) {
                response.put("message", "상품 검색 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.");
            } else {
                response.put("message", "상품 검색 중 오류가 발생했습니다.");
            }
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    @GetMapping("/recommended")
    public ResponseEntity<Map<String, Object>> getRecommendedProducts(
            @RequestParam(required = false) Integer userRiskLevel) {
        
        Map<String, Object> response = new HashMap<>();
        try {
            List<InvestmentProduct> products = investmentProductService.getRecommendedProducts(userRiskLevel);
            response.put("success", true);
            response.put("data", products);
            response.put("count", products.size());
            response.put("recommendedFor", userRiskLevel != null ? userRiskLevel : 3);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            if (e.getMessage().contains("외부 API")) {
                response.put("message", "추천 상품 정보를 가져올 수 없습니다. 네트워크 연결을 확인해주세요.");
            } else {
                response.put("message", "추천 상품 조회 중 오류가 발생했습니다.");
            }
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 개인화된 REIT 투자 상품 조회 (사용자 거주지 기반)
     */
    @GetMapping("/personalized")
    public ResponseEntity<Map<String, Object>> getPersonalizedProducts(
            @RequestHeader("Authorization") String authHeader) {
        Map<String, Object> response = new HashMap<>();
        try {
            // JWT 토큰에서 사용자 ID 추출 (간단한 구현)
            Long userId = extractUserIdFromToken(authHeader);
            if (userId == null) {
                response.put("success", false);
                response.put("message", "인증이 필요합니다.");
                return ResponseEntity.status(401).body(response);
            }

            List<InvestmentProduct> personalizedProducts = investmentProductService.getPersonalizedReitProducts(userId);

            // 프론트엔드 형식에 맞게 데이터 변환
            List<Map<String, Object>> productList = personalizedProducts.stream().map(product -> {
                Map<String, Object> productMap = new HashMap<>();
                productMap.put("productId", product.getProductId());
                productMap.put("productName", product.getProductName());
                productMap.put("productCode", product.getProductCode());
                productMap.put("productType", product.getProductType());
                productMap.put("category", product.getProductType() != null ? product.getProductType() : "투자상품");
                productMap.put("description", product.getDescription());
                productMap.put("currentPrice", product.getCurrentPrice() != null ? product.getCurrentPrice().doubleValue() : 0.0);
                productMap.put("nav", product.getNav() != null ? product.getNav().doubleValue() : 0.0);
                productMap.put("totalReturn", product.getTotalReturn() != null ? product.getTotalReturn().doubleValue() : 0.0);
                productMap.put("dividendYield", product.getDividendYield() != null ? product.getDividendYield().doubleValue() : 0.0);
                productMap.put("riskLevel", product.getRiskLevel() != null ? product.getRiskLevel() : 3);
                productMap.put("isRecommended", true); // 개인화된 상품은 모두 추천으로 표시
                productMap.put("isPersonalized", true); // 개인화 상품 표시
                productMap.put("marketCap", product.getMarketCap() != null ? product.getMarketCap().doubleValue() : 0.0);
                productMap.put("totalShares", product.getTotalShares() != null ? product.getTotalShares() : 0L);
                productMap.put("priceChange", product.getPriceChange() != null ? product.getPriceChange().doubleValue() : 0.0);
                productMap.put("priceChangeSign", product.getPriceChangeSign() != null ? product.getPriceChangeSign() : "0");
                productMap.put("status", product.getStatus());
                return productMap;
            }).toList();

            response.put("success", true);
            response.put("data", productList);
            response.put("count", productList.size());
            response.put("message", productList.isEmpty() ?
                "현재 거주지가 포함된 REIT 상품이 없습니다." :
                "거주지 기반 맞춤 REIT 상품을 조회했습니다.");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            if (e.getMessage().contains("외부 API")) {
                response.put("message", "개인화 상품 정보 조회에 실패했습니다. 잠시 후 다시 시도해주세요.");
            } else {
                response.put("message", "맞춤 상품 조회 중 오류가 발생했습니다.");
            }
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * JWT 토큰에서 사용자 ID 추출
     */
    private Long extractUserIdFromToken(String authHeader) {
        try {
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);

                // JWT 토큰 유효성 검증
                if (!jwtTokenProvider.validateToken(token)) {
                    return null;
                }

                // JWT 토큰에서 사용자 ID 추출
                Long userId = jwtTokenProvider.getUserIdFromToken(token);
                if (userId != null) {
                    return userId;
                }

                // userId가 없는 경우 userType 확인하여 처리
                String userType = jwtTokenProvider.getUserTypeFromToken(token);
                if ("USER".equals(userType)) {
                    // USER 타입이지만 userId 클레임이 없는 경우의 처리
                    // subject에서 userCi를 가져와서 사용자 조회 등의 로직 구현 가능
                    return null;
                }
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 상품 배당 정보 조회
     */
    @GetMapping("/{productId}/dividend")
    public ResponseEntity<Map<String, Object>> getDividendInfo(@PathVariable String productId) {
        Map<String, Object> response = new HashMap<>();
        try {
            // 한국투자증권 API를 통해 배당 정보 조회
            Map<String, Object> dividendInfo = koreaInvestmentApiService.getDividendInfo(productId);
            
            if (dividendInfo != null && !dividendInfo.isEmpty()) {
                response.put("success", true);
                response.put("data", dividendInfo);
                response.put("productId", productId);
            } else {
                response.put("success", true);
                response.put("data", null);
                response.put("message", "해당 상품의 배당 정보가 없습니다.");
                response.put("productId", productId);
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "배당 정보 조회 중 오류가 발생했습니다.");
            response.put("error", e.getMessage());
            response.put("productId", productId);
            return ResponseEntity.internalServerError().body(response);
        }
    }
}