package com.living.hana.mapper;

import com.living.hana.entity.ReitProduct;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;
import java.util.List;

@Mapper
public interface ReitProductMapper {

    // 전체 REIT 상품 조회
    List<ReitProduct> findAll();

    // 상품 코드로 REIT 상품 조회
    ReitProduct findByProductCode(@Param("productCode") String productCode);

    // 거래소별 REIT 상품 조회
    List<ReitProduct> findByStockExchange(@Param("stockExchange") String stockExchange);

    // REIT 상품 등록
    int insertReitProduct(ReitProduct reitProduct);

    // REIT 상품 수정
    int updateReitProduct(ReitProduct reitProduct);

    // REIT 상품 삭제
    int deleteReitProduct(@Param("productCode") String productCode);

    // 상품명으로 검색
    List<ReitProduct> findByProductNameContaining(@Param("keyword") String keyword);

    // REIT 상품에 포함된 활성 건물 ID 목록 조회
    List<Long> getActiveBuildingIdsByProductCode(@Param("productCode") String productCode);

    // 특정 건물의 기간별 임대수익 합계 조회
    BigDecimal getBuildingRentalIncome(@Param("buildingId") Long buildingId,
                                       @Param("startDate") String startDate,
                                       @Param("endDate") String endDate);

    // 특정 건물의 기간별 운영비용 합계 조회
    BigDecimal getBuildingExpenses(@Param("buildingId") Long buildingId,
                                   @Param("startDate") String startDate,
                                   @Param("endDate") String endDate);

    // 공통 운영비용 조회
    BigDecimal getCommonExpenses(@Param("startDate") String startDate,
                                 @Param("endDate") String endDate);
}