package com.living.hana.service;

import com.living.hana.entity.InvestmentProduct;
import com.living.hana.dto.KisReitsListDto;
import com.living.hana.exception.InvestmentException;
import com.living.hana.util.BusinessLogger;
import com.living.hana.entity.ReitProduct;
import com.living.hana.dto.ContractDetailResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.function.Predicate;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvestmentProductService {

    private final KoreaInvestmentApiService koreaInvestmentApiService;
    private final ReitProductService reitProductService;
    private final ContractService contractService;
    private final SecuritiesIntegrationService securitiesIntegrationService;
    
    public List<InvestmentProduct> getAllProducts() {
        BusinessLogger.logBusinessStart(InvestmentProductService.class, "투자상품전체조회", "system");

        try {

            // 1. 원큐리빙 DB의 REIT 상품 조회
            List<InvestmentProduct> reitProducts = fetchReitProductsFromDB();
            List<InvestmentProduct> allProducts = new ArrayList<>(reitProducts);

            // 2. KIS API 상품 조회
            List<InvestmentProduct> kisProducts = fetchKisProducts();
            allProducts.addAll(kisProducts);

            if (allProducts.isEmpty()) {
                throw InvestmentException.productNotFound("전체");
            }

            BusinessLogger.logBusinessSuccess(InvestmentProductService.class, "투자상품전체조회", "총 " + allProducts.size() + "개 상품");
            return allProducts;
        } catch (Exception e) {
            BusinessLogger.logBusinessError(InvestmentProductService.class, "투자상품전체조회", e);
            throw e;
        }
    }
    
    /**
     * KIS API로부터 상품 목록 조회
     */
    private List<InvestmentProduct> fetchKisProducts() {
        long startTime = System.currentTimeMillis();
        try {
            List<KisReitsListDto> reitsProducts = koreaInvestmentApiService.getReitslist("ALL");
            List<InvestmentProduct> result = reitsProducts.stream()
                .map(this::convertKisReitsToInvestmentProduct)
                .collect(Collectors.toList());

            BusinessLogger.logApiCall(InvestmentProductService.class, "한국투자증권", "/reits/list",
                System.currentTimeMillis() - startTime);
            return result;
        } catch (Exception e) {
            BusinessLogger.logApiCall(InvestmentProductService.class, "한국투자증권", "/reits/list [FAILED]",
                System.currentTimeMillis() - startTime);
            log.warn("KIS API 호출 실패, 빈 목록 반환: {}", e.getMessage());
            return new ArrayList<>();
        }
    }
    
    /**
     * 원큐리빙 DB에서 REIT 상품 목록 조회
     */
    private List<InvestmentProduct> fetchReitProductsFromDB() {
        long startTime = System.currentTimeMillis();
        try {
            List<ReitProduct> reitProducts = reitProductService.findAllProducts();
            List<InvestmentProduct> result = reitProducts.stream()
                .map(this::convertReitToInvestmentProduct)
                .collect(Collectors.toList());

            BusinessLogger.logApiCall(InvestmentProductService.class, "원큐리빙DB", "/reit_products",
                System.currentTimeMillis() - startTime);
            return result;
        } catch (Exception e) {
            BusinessLogger.logApiCall(InvestmentProductService.class, "원큐리빙DB", "/reit_products [FAILED]",
                System.currentTimeMillis() - startTime);
            log.error("원큐리빙 DB에서 REIT 상품 조회 실패: {}", e.getMessage());
            return new ArrayList<>();
        }
    }
    
    public InvestmentProduct getProductById(String productId) {
        // 1. 원큐리빙 DB에서 직접 조회 시도
        InvestmentProduct product = fetchProductFromReitDB(productId);
        if (product != null) {
            return product;
        }

        // 2. 전체 상품 목록에서 검색
        return findProductInAllProducts(productId);
    }
    
    /**
     * 원큐리빙 DB에서 단일 상품 조회
     */
    private InvestmentProduct fetchProductFromReitDB(String productId) {
        try {
            ReitProduct reitProduct = reitProductService.findProductByCode(productId);
            if (reitProduct != null) {
                return convertReitToInvestmentProduct(reitProduct);
            }
            return null;
        } catch (Exception e) {
            log.warn("원큐리빙 DB에서 상품 조회 실패 (productId: {}): {}", productId, e.getMessage());
            return null;
        }
    }
    
    /**
     * 전체 상품 목록에서 상품 검색
     */
    private InvestmentProduct findProductInAllProducts(String productId) {
        List<InvestmentProduct> allProducts = getAllProducts();
        return allProducts.stream()
            .filter(product -> productId.equals(product.getProductId()) || 
                             productId.equals(product.getProductCode()))
            .findFirst()
            .orElseThrow(() -> InvestmentException.productNotFound(productId));
    }
    
    
    public List<InvestmentProduct> getProductsByType(String productType) {
        return filterProducts(product -> productType.equalsIgnoreCase(product.getProductType()));
    }

    public List<InvestmentProduct> getProductsByRiskLevel(Integer riskLevel) {
        return filterProducts(product -> riskLevel.equals(product.getRiskLevel()));
    }
    
    public List<InvestmentProduct> searchProducts(String keyword, String productType,
                                                 Integer riskLevel, Double minPrice, Double maxPrice) {
        return filterProducts(product -> {
            boolean matches = true;
            if (keyword != null && !keyword.isEmpty()) {
                matches = matches && product.getProductName().toLowerCase().contains(keyword.toLowerCase());
            }
            if (productType != null) {
                matches = matches && productType.equalsIgnoreCase(product.getProductType());
            }
            if (riskLevel != null) {
                matches = matches && riskLevel.equals(product.getRiskLevel());
            }
            if (minPrice != null) {
                matches = matches && product.getCurrentPrice().doubleValue() >= minPrice;
            }
            if (maxPrice != null) {
                matches = matches && product.getCurrentPrice().doubleValue() <= maxPrice;
            }
            return matches;
        });
    }
    
    public List<InvestmentProduct> getRecommendedProducts(Integer userRiskLevel) {
        if (userRiskLevel == null) {
            userRiskLevel = 3; // 기본값: 중위험
        }
        
        return getProductsByRiskLevel(userRiskLevel);
    }
    
    public List<InvestmentProduct> getTopPerformingProducts(int limit) {
        return getAllProducts().stream()
            .sorted((p1, p2) -> p2.getTotalReturn().compareTo(p1.getTotalReturn()))
            .limit(limit)
            .collect(Collectors.toList());
    }
    
    
    public boolean isValidProduct(String productId) {
        InvestmentProduct product = getProductById(productId);
        return isActiveProduct(product);
    }

    public boolean canInvest(String productId, Double investmentAmount) {
        return isValidProduct(productId);
    }
    
    
    private InvestmentProduct convertKisReitsToInvestmentProduct(KisReitsListDto reit) {
        InvestmentProduct product = new InvestmentProduct();

        product.setProductId(reit.getStck_shrn_iscd());
        product.setProductCode(reit.getStck_shrn_iscd());
        product.setProductType("REITS");
        product.setIssuer("한국투자증권");

        // 종목코드로 실제 상품명 조회
        String productName = reit.getHts_kor_isnm(); // 기본값: KIS API에서 제공하는 이름

        try {
            ReitProduct reitProduct = reitProductService.findProductByCode(reit.getStck_shrn_iscd());
            if (reitProduct != null) {
                productName = reitProduct.getProductName();
            }
        } catch (Exception e) {
            // REIT 상품명 조회 실패시 기본값 사용
        }
        product.setProductName(productName);
        
        // KIS API 데이터로 상품 정보 업데이트
        updateProductWithKisData(product, reit);
        
        product.setMinInvestmentAmount(new BigDecimal("10000"));
        product.setRiskLevel(3); // 중간 위험도
        product.setDescription(productName + " - 한국투자증권 REITs");
        product.setStatus("ACTIVE");
        
        return product;
    }
    
    /**
     * 사용자 거주지 기반 개인화된 REIT 상품 조회
     * 사용자가 실제 거주하는 건물이 포함된 REIT 상품만 반환
     */
    public List<InvestmentProduct> getPersonalizedReitProducts(Long userId) {
        BusinessLogger.logBusinessStart(InvestmentProductService.class, "개인화REIT상품조회", String.valueOf(userId));
        try {
            // 1. 사용자의 활성 계약 조회
            List<ContractDetailResponse> userContracts = contractService.findContractDetailsByUserId(userId);
            if (userContracts == null || userContracts.isEmpty()) {
                return new ArrayList<>();
            }

            // 2. 활성 계약에서 건물 정보 추출
            List<ContractDetailResponse> activeContracts = getActiveContracts(userContracts);
            List<Long> userBuildingIds = extractBuildingIds(activeContracts);

            if (userBuildingIds.isEmpty()) {
                return new ArrayList<>();
            }

            // 3. 거주 건물이 포함된 REIT 상품 조회
            List<ReitProduct> personalizedReits = reitProductService.findReitsByBuildingIds(userBuildingIds);
            if (personalizedReits == null || personalizedReits.isEmpty()) {
                return new ArrayList<>();
            }

            // 4. 사용자 거주 건물명 추출
            String userBuildingNames = extractBuildingNames(activeContracts);

            // 5. REIT 상품을 InvestmentProduct로 변환하고 실시간 데이터 추가
            List<InvestmentProduct> personalizedProducts = personalizedReits.stream()
                .map(reit -> createPersonalizedProduct(reit, userBuildingNames))
                .collect(Collectors.toList());

            BusinessLogger.logBusinessSuccess(InvestmentProductService.class, "개인화REIT상품조회",
                "총 " + personalizedProducts.size() + "개 상품");
            return personalizedProducts;
        } catch (Exception e) {
            BusinessLogger.logBusinessError(InvestmentProductService.class, "개인화REIT상품조회", e);
            throw e;
        }
    }

    /**
     * ReitProduct를 InvestmentProduct로 변환
     */
    private InvestmentProduct convertReitToInvestmentProduct(ReitProduct reit) {
        InvestmentProduct product = new InvestmentProduct();

        product.setProductId(reit.getProductCode());
        product.setProductCode(reit.getProductCode());
        product.setProductName(reit.getProductName());
        product.setProductType("REITS");
        product.setIssuer("하나원큐리빙");

        // 기본값 설정
        product.setCurrentPrice(BigDecimal.ZERO);
        product.setNav(BigDecimal.ZERO);
        product.setTotalReturn(BigDecimal.ZERO);
        product.setDividendYield(BigDecimal.ZERO);
        product.setMarketCap(BigDecimal.ZERO);
        product.setTotalShares(reit.getTotalShares()); // DB의 발행주식수
        product.setMinInvestmentAmount(new BigDecimal("10000"));
        product.setRiskLevel(3);
        product.setDescription(reit.getProductName() + " - 하나원큐리빙 프리미엄 오피스텔 REIT");
        product.setStatus("ACTIVE");

        // KIS API를 통한 실시간 데이터 보강
        enrichWithRealTimeData(product, reit.getProductCode());

        return product;
    }

    /**
     * HanaSecurities API를 통해 실시간 데이터로 상품 정보 보강
     */
    private void enrichWithRealTimeData(InvestmentProduct product, String stockCode) {
        try {
            // HanaSecurities API에서 실시간 가격 조회
            Map<String, Object> priceData = securitiesIntegrationService.getRealtimeStockPrice(stockCode);

            if (priceData != null && !priceData.isEmpty()) {
                // data 객체 추출 (중첩 구조)
                @SuppressWarnings("unchecked")
                Map<String, Object> data = (Map<String, Object>) priceData.get("data");

                if (data != null && !data.isEmpty()) {
                    // 현재가 설정
                    if (data.containsKey("currentPrice")) {
                        BigDecimal currentPrice = new BigDecimal(data.get("currentPrice").toString());
                        product.setCurrentPrice(currentPrice);
                    }

                    // 전일대비 변화량 설정
                    if (data.containsKey("changePrice")) {
                        BigDecimal priceChange = new BigDecimal(data.get("changePrice").toString());
                        product.setPriceChange(priceChange);
                    }

                    // 전일대비 부호 설정 (한글 -> 숫자 변환)
                    if (data.containsKey("changeSign")) {
                        String changeSign = data.get("changeSign").toString();
                        String changeSignCode = convertChangeSignToCode(changeSign);
                        product.setPriceChangeSign(changeSignCode);
                    }

                    // 등락률 설정
                    if (data.containsKey("changeRate")) {
                        BigDecimal totalReturn = new BigDecimal(data.get("changeRate").toString());
                        product.setTotalReturn(totalReturn);
                    }
                }

                // 시가총액 계산 (현재가 × 발행주식수)
                if (product.getTotalShares() != null && product.getTotalShares() > 0 && product.getCurrentPrice() != null) {
                    BigDecimal marketCap = product.getCurrentPrice().multiply(new BigDecimal(product.getTotalShares()));
                    product.setMarketCap(marketCap);
                }
            }
        } catch (Exception e) {
            log.error("실시간 데이터 보강 실패 (productCode: {}): {}", stockCode, e.getMessage());
        }
    }

    /**
     * 한글 전일대비 부호를 숫자 코드로 변환
     * 상승 -> 1, 보합 -> 2, 하락 -> 3, 상한 -> 4, 하한 -> 5
     */
    private String convertChangeSignToCode(String changeSign) {
        if (changeSign == null) return "2";

        return switch (changeSign) {
            case "상승" -> "1";
            case "보합" -> "2";
            case "하락" -> "3";
            case "상한" -> "4";
            case "하한" -> "5";
            default -> "2";
        };
    }

    /**
     * 안전한 BigDecimal 파싱 메서드
     */
    private BigDecimal safeParseBigDecimal(String value) {
        if (value == null || value.trim().isEmpty()) {
            return BigDecimal.ZERO;
        }

        try {
            return new BigDecimal(value.trim());
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    /**
     * KIS API 데이터로 상품 정보 업데이트
     */
    private void updateProductWithKisData(InvestmentProduct product, KisReitsListDto kisReit) {
        BigDecimal currentPrice = safeParseBigDecimal(kisReit.getStck_prpr());
        product.setCurrentPrice(currentPrice);
        product.setNav(safeParseBigDecimal(kisReit.getNav()));
        product.setTotalReturn(safeParseBigDecimal(kisReit.getPrdy_ctrt()));
        product.setDividendYield(safeParseBigDecimal(kisReit.getDividend_yield()));

        // 전일대비 정보 설정
        product.setPriceChange(safeParseBigDecimal(kisReit.getPrdy_vrss()));
        product.setPriceChangeSign(kisReit.getPrdy_vrss_sign());

        log.info("[시가총액 계산] 상품: {}, 현재가: {}, 발행주식수: {}",
            product.getProductName(), currentPrice, product.getTotalShares());

        // 시가총액 = 현재가 × 발행주식수 (DB의 totalShares 사용)
        if (product.getTotalShares() != null && product.getTotalShares() > 0 && currentPrice.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal marketCap = currentPrice.multiply(new BigDecimal(product.getTotalShares()));
            product.setMarketCap(marketCap);
            log.info("[시가총액 계산] 계산 성공 - 시가총액: {}", marketCap);
        } else {
            product.setMarketCap(BigDecimal.ZERO);
            log.warn("[시가총액 계산] 계산 실패 - totalShares: {}, currentPrice: {}",
                product.getTotalShares(), currentPrice);
        }
    }

    /**
     * 활성 계약 필터링
     */
    private List<ContractDetailResponse> getActiveContracts(List<ContractDetailResponse> contracts) {
        return contracts.stream()
            .filter(contract -> "ACTIVE".equals(contract.getStatus()) ||
                               "CONFIRMED".equals(contract.getStatus()))
            .collect(Collectors.toList());
    }

    /**
     * 계약에서 건물 ID 추출
     */
    private List<Long> extractBuildingIds(List<ContractDetailResponse> activeContracts) {
        return activeContracts.stream()
            .map(ContractDetailResponse::getBuildingId)
            .filter(Objects::nonNull)
            .distinct()
            .collect(Collectors.toList());
    }

    /**
     * 계약에서 건물명 추출
     */
    private String extractBuildingNames(List<ContractDetailResponse> activeContracts) {
        return activeContracts.stream()
            .map(ContractDetailResponse::getBuildingName)
            .filter(name -> name != null && !name.trim().isEmpty())
            .distinct()
            .collect(Collectors.joining(", "));
    }

    /**
     * 개인화된 투자 상품 생성
     */
    private InvestmentProduct createPersonalizedProduct(ReitProduct reit, String userBuildingNames) {
        InvestmentProduct product = convertReitToInvestmentProduct(reit);

        // 실시간 데이터 보강
        enrichWithRealTimeData(product, reit.getProductCode());

        // 개인화 설명 추가
        if (userBuildingNames != null && !userBuildingNames.trim().isEmpty()) {
            String personalizedDesc = String.format("%s - 회원님이 거주 중인 %s이(가) 포함된 REIT 상품입니다.",
                product.getDescription(), userBuildingNames);
            product.setDescription(personalizedDesc);
        }

        return product;
    }

    /**
     * 공통 상품 필터링 헬퍼 메서드
     */
    private List<InvestmentProduct> filterProducts(Predicate<InvestmentProduct> filter) {
        return getAllProducts().stream()
            .filter(filter)
            .collect(Collectors.toList());
    }

    /**
     * 상품 활성 상태 검증 헬퍼 메서드
     */
    private boolean isActiveProduct(InvestmentProduct product) {
        return product != null && "ACTIVE".equals(product.getStatus());
    }

}