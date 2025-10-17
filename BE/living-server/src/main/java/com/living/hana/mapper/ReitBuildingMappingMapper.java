package com.living.hana.mapper;

import com.living.hana.entity.ReitBuildingMapping;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ReitBuildingMappingMapper {

    // REIT 상품에 포함된 건물 조회
    List<ReitBuildingMapping> findByProductCode(@Param("productCode") String productCode);

    // 현재 포함된 건물만 조회 (exclusionDate가 null인 것)
    List<ReitBuildingMapping> findActiveByProductCode(@Param("productCode") String productCode);

    // 특정 건물이 포함된 REIT 상품 조회
    List<ReitBuildingMapping> findByBuildingId(@Param("buildingId") Long buildingId);

    // 특정 건물이 현재 포함된 REIT 상품 조회 (exclusionDate가 null인 것)
    List<ReitBuildingMapping> findActiveByBuildingId(@Param("buildingId") Long buildingId);

    // 매핑 ID로 조회
    ReitBuildingMapping findByMappingId(@Param("mappingId") Long mappingId);

    // 건물을 REIT 상품에 추가
    int insertMapping(ReitBuildingMapping mapping);

    // 건물을 REIT 상품에서 제외 (exclusionDate 설정)
    int updateExclusionDate(@Param("mappingId") Long mappingId,
                           @Param("exclusionDate") java.sql.Date exclusionDate);

    // 매핑 삭제 (완전 삭제)
    int deleteMapping(@Param("mappingId") Long mappingId);

    // 특정 상품의 모든 매핑 삭제
    void deleteByProductCode(@Param("productCode") String productCode);

}