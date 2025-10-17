package com.living.hana.service;

import com.living.hana.annotation.Logging;
import com.living.hana.entity.ReitProduct;
import com.living.hana.entity.ReitBuildingMapping;
import com.living.hana.entity.ReitDividend;
import com.living.hana.entity.Building;
import com.living.hana.mapper.ReitProductMapper;
import com.living.hana.mapper.ReitBuildingMappingMapper;
import com.living.hana.mapper.ReitDividendMapper;
import com.living.hana.mapper.BuildingMapper;
import com.living.hana.dto.ReitProductRequest;
import com.living.hana.dto.ReitBuildingMappingRequest;
import com.living.hana.dto.ReitBuildingMappingResponse;
import com.living.hana.dto.ReitDividendRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReitProductService {

    private final ReitProductMapper reitProductMapper;
    private final ReitBuildingMappingMapper reitBuildingMappingMapper;
    private final ReitDividendMapper reitDividendMapper;
    private final BuildingMapper buildingMapper;

    // ===== REIT 상품 관리 =====

    public List<ReitProduct> findAllProducts() {
        return reitProductMapper.findAll();
    }

    public ReitProduct findProductByCode(String productCode) {
        return reitProductMapper.findByProductCode(productCode);
    }

    public List<ReitProduct> findProductsByExchange(String stockExchange) {
        return reitProductMapper.findByStockExchange(stockExchange);
    }

    public List<ReitProduct> searchProductsByName(String keyword) {
        // 상품명 검색
        return reitProductMapper.findByProductNameContaining(keyword);
    }

    @Logging(operation = "리츠 상품 생성", category = "REIT", includeParams = true)
    @Transactional
    public ReitProduct createProduct(ReitProductRequest request) {
        // REIT 상품 생성

        // 중복 체크
        ReitProduct existing = reitProductMapper.findByProductCode(request.getProductCode());
        if (existing != null) {
            throw new RuntimeException("이미 존재하는 상품 코드입니다: " + request.getProductCode());
        }

        ReitProduct product = new ReitProduct();
        product.setProductCode(request.getProductCode());
        product.setProductName(request.getProductName());
        product.setStockExchange(request.getStockExchange());
        product.setListingDate(request.getListingDate());
        product.setManagementFee(request.getManagementFee());
        product.setDescription(request.getDescription());

        int result = reitProductMapper.insertReitProduct(product);
        if (result == 0) {
            throw new RuntimeException("REIT 상품 생성에 실패했습니다.");
        }

        return reitProductMapper.findByProductCode(request.getProductCode());
    }

    @Transactional
    public ReitProduct updateProduct(String productCode, ReitProductRequest request) {
        // REIT 상품 수정

        ReitProduct existing = reitProductMapper.findByProductCode(productCode);
        if (existing == null) {
            throw new RuntimeException("존재하지 않는 상품입니다: " + productCode);
        }

        ReitProduct product = new ReitProduct();
        product.setProductCode(productCode);
        product.setProductName(request.getProductName());
        product.setStockExchange(request.getStockExchange());
        product.setListingDate(request.getListingDate());
        product.setManagementFee(request.getManagementFee());
        product.setDescription(request.getDescription());

        int result = reitProductMapper.updateReitProduct(product);
        if (result == 0) {
            throw new RuntimeException("REIT 상품 수정에 실패했습니다.");
        }

        return reitProductMapper.findByProductCode(productCode);
    }

    @Transactional
    public void updateProduct(String productCode, ReitProduct product) {

        ReitProduct existing = reitProductMapper.findByProductCode(productCode);
        if (existing == null) {
            throw new RuntimeException("존재하지 않는 상품입니다: " + productCode);
        }

        // 기존 정보와 새 정보를 병합
        product.setProductCode(productCode);
        if (product.getProductName() == null) {
            product.setProductName(existing.getProductName());
        }
        if (product.getStockExchange() == null) {
            product.setStockExchange(existing.getStockExchange());
        }
        if (product.getListingDate() == null) {
            product.setListingDate(existing.getListingDate());
        }
        if (product.getManagementFee() == null) {
            product.setManagementFee(existing.getManagementFee());
        }
        if (product.getDescription() == null) {
            product.setDescription(existing.getDescription());
        }

        int result = reitProductMapper.updateReitProduct(product);
        if (result == 0) {
            throw new RuntimeException("REIT 상품 수정에 실패했습니다.");
        }

        reitProductMapper.findByProductCode(productCode);
    }

    @Transactional
    public void deleteProduct(String productCode) {
        // REIT 상품 삭제

        ReitProduct existing = reitProductMapper.findByProductCode(productCode);
        if (existing == null) {
            throw new RuntimeException("존재하지 않는 상품입니다: " + productCode);
        }

        // 관련 데이터 삭제
        reitDividendMapper.deleteByProductCode(productCode);
        reitBuildingMappingMapper.deleteByProductCode(productCode);

        int result = reitProductMapper.deleteReitProduct(productCode);
        if (result == 0) {
            throw new RuntimeException("REIT 상품 삭제에 실패했습니다.");
        }
    }

    // ===== 건물 매핑 관리 =====

    public List<ReitBuildingMappingResponse> findBuildingsByProduct(String productCode) {
        // REIT 상품의 포함 건물 조회

        List<ReitBuildingMapping> mappings = reitBuildingMappingMapper.findByProductCode(productCode);
        List<ReitBuildingMappingResponse> responses = new ArrayList<>();

        for (ReitBuildingMapping mapping : mappings) {
            Building building = buildingMapper.findById(mapping.getBuildingId());
            responses.add(ReitBuildingMappingResponse.fromEntityWithBuilding(mapping, building));
        }

        return responses;
    }

    public List<ReitBuildingMappingResponse> findActiveBuildingsByProduct(String productCode) {
        // REIT 상품의 현재 포함 건물 조회

        List<ReitBuildingMapping> mappings = reitBuildingMappingMapper.findActiveByProductCode(productCode);
        List<ReitBuildingMappingResponse> responses = new ArrayList<>();

        for (ReitBuildingMapping mapping : mappings) {
            Building building = buildingMapper.findById(mapping.getBuildingId());
            responses.add(ReitBuildingMappingResponse.fromEntityWithBuilding(mapping, building));
        }

        return responses;
    }

    @Transactional
    public ReitBuildingMapping addBuildingToProduct(String productCode, ReitBuildingMappingRequest request) {
        // REIT 상품에 건물 추가

        // 상품 존재 확인
        ReitProduct product = reitProductMapper.findByProductCode(productCode);
        if (product == null) {
            throw new RuntimeException("존재하지 않는 상품입니다: " + productCode);
        }

        // 건물 존재 확인
        Building building = buildingMapper.findById(request.getBuildingId());
        if (building == null) {
            throw new RuntimeException("존재하지 않는 건물입니다: " + request.getBuildingId());
        }

        ReitBuildingMapping mapping = new ReitBuildingMapping();
        mapping.setProductCode(productCode);
        mapping.setBuildingId(request.getBuildingId());
        mapping.setInclusionDate(request.getInclusionDate() != null ?
            request.getInclusionDate() : Date.valueOf(LocalDate.now()));
        mapping.setExclusionDate(request.getExclusionDate());

        int result = reitBuildingMappingMapper.insertMapping(mapping);
        if (result == 0) {
            throw new RuntimeException("건물 추가에 실패했습니다.");
        }

        return reitBuildingMappingMapper.findByMappingId(mapping.getMappingId());
    }

    @Transactional
    public void removeBuildingFromProduct(Long mappingId) {
        // REIT 상품에서 건물 제외

        ReitBuildingMapping existing = reitBuildingMappingMapper.findByMappingId(mappingId);
        if (existing == null) {
            throw new RuntimeException("존재하지 않는 매핑입니다: " + mappingId);
        }

        // exclusionDate 설정으로 소프트 삭제
        Date today = Date.valueOf(LocalDate.now());
        int result = reitBuildingMappingMapper.updateExclusionDate(mappingId, today);
        if (result == 0) {
            throw new RuntimeException("건물 제외에 실패했습니다.");
        }
    }

    @Transactional
    public void deleteBuildingMapping(Long mappingId) {
        ReitBuildingMapping existing = reitBuildingMappingMapper.findByMappingId(mappingId);
        if (existing == null) {
            throw new RuntimeException("존재하지 않는 매핑입니다: " + mappingId);
        }

        int result = reitBuildingMappingMapper.deleteMapping(mappingId);
        if (result == 0) {
            throw new RuntimeException("매핑 삭제에 실패했습니다.");
        }
    }

    // ===== 배당 관리 =====

    public List<ReitDividend> findDividendsByProduct(String productCode) {
        // REIT 상품의 배당 내역 조회
        return reitDividendMapper.findByProductCode(productCode);
    }

    public List<ReitDividend> findDividendsByProductAndYear(String productCode, Integer year) {
        // REIT 상품의 연도별 배당 내역 조회
        return reitDividendMapper.findByProductCodeAndYear(productCode, year);
    }

    public List<ReitDividend> findRecentDividends(String productCode, Integer limit) {
        // REIT 상품의 최근 배당 내역 조회
        return reitDividendMapper.findRecentDividendsByProductCode(productCode, limit != null ? limit : 5);
    }

    @Transactional
    public ReitDividend createDividend(String productCode, ReitDividendRequest request) {
        // REIT 배당 정보 생성

        // 상품 존재 확인
        ReitProduct product = reitProductMapper.findByProductCode(productCode);
        if (product == null) {
            throw new RuntimeException("존재하지 않는 상품입니다: " + productCode);
        }

        // 중복 체크
        ReitDividend existing = reitDividendMapper.findByProductCodeAndYearAndQuarter(
            productCode, request.getDividendYear(), request.getDividendQuarter());
        if (existing != null) {
            throw new RuntimeException("해당 기간의 배당 정보가 이미 존재합니다.");
        }

        ReitDividend dividend = new ReitDividend();
        dividend.setProductCode(productCode);
        dividend.setDividendYear(request.getDividendYear());
        dividend.setDividendQuarter(request.getDividendQuarter());
        dividend.setDividendRate(request.getDividendRate());
        dividend.setDividendAmount(request.getDividendAmount());
        dividend.setRecordDate(request.getRecordDate());
        dividend.setPaymentDate(request.getPaymentDate());
        dividend.setAnnouncementDate(request.getAnnouncementDate());

        int result = reitDividendMapper.insertDividend(dividend);
        if (result == 0) {
            throw new RuntimeException("배당 정보 생성에 실패했습니다.");
        }

        return reitDividendMapper.findByDividendId(dividend.getDividendId());
    }

    @Transactional
    public ReitDividend updateDividend(Long dividendId, ReitDividendRequest request) {
        // REIT 배당 정보 수정

        ReitDividend existing = reitDividendMapper.findByDividendId(dividendId);
        if (existing == null) {
            throw new RuntimeException("존재하지 않는 배당 정보입니다: " + dividendId);
        }

        ReitDividend dividend = new ReitDividend();
        dividend.setDividendId(dividendId);
        dividend.setDividendYear(request.getDividendYear());
        dividend.setDividendQuarter(request.getDividendQuarter());
        dividend.setDividendRate(request.getDividendRate());
        dividend.setDividendAmount(request.getDividendAmount());
        dividend.setRecordDate(request.getRecordDate());
        dividend.setPaymentDate(request.getPaymentDate());
        dividend.setAnnouncementDate(request.getAnnouncementDate());

        int result = reitDividendMapper.updateDividend(dividend);
        if (result == 0) {
            throw new RuntimeException("배당 정보 수정에 실패했습니다.");
        }

        return reitDividendMapper.findByDividendId(dividendId);
    }

    @Transactional
    public void deleteDividend(Long dividendId) {
        // REIT 배당 정보 삭제

        ReitDividend existing = reitDividendMapper.findByDividendId(dividendId);
        if (existing == null) {
            throw new RuntimeException("존재하지 않는 배당 정보입니다: " + dividendId);
        }

        int result = reitDividendMapper.deleteDividend(dividendId);
        if (result == 0) {
            throw new RuntimeException("배당 정보 삭제에 실패했습니다.");
        }
    }

    // ===== 개인화 투자 상품용 메서드 =====

    /**
     * 특정 건물들이 포함된 리츠 상품 조회
     * 사용자의 거주 건물 기반 개인화된 투자 상품 추천용
     */
    public List<ReitProduct> findReitsByBuildingIds(List<Long> buildingIds) {
        if (buildingIds == null || buildingIds.isEmpty()) {
            return new ArrayList<>();
        }

        List<ReitProduct> personalizedReits = new ArrayList<>();

        // 각 건물 ID에 대해 활성 REIT 매핑 조회
        for (Long buildingId : buildingIds) {
            List<ReitBuildingMapping> activeMappings = reitBuildingMappingMapper.findActiveByBuildingId(buildingId);

            for (ReitBuildingMapping mapping : activeMappings) {
                ReitProduct reit = reitProductMapper.findByProductCode(mapping.getProductCode());
                if (reit != null) {
                    // 중복 방지 체크
                    boolean alreadyExists = personalizedReits.stream()
                        .anyMatch(existing -> existing.getProductCode().equals(reit.getProductCode()));

                    if (!alreadyExists) {
                        personalizedReits.add(reit);
                    }
                }
            }
        }

        return personalizedReits;
    }
}