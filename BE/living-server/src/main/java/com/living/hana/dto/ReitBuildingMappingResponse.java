package com.living.hana.dto;

import com.living.hana.entity.ReitBuildingMapping;
import com.living.hana.entity.Building;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.sql.Date;
import java.sql.Timestamp;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReitBuildingMappingResponse {
    private Long mappingId;           // 매핑 ID
    private String productCode;       // REIT 상품 코드
    private Long buildingId;          // 건물 ID
    private String buildingName;      // 건물명
    private String buildingAddress;   // 건물 주소
    private Date inclusionDate;       // 포함 시작일
    private Date exclusionDate;       // 제외일
    private Timestamp createdAt;      // 생성일

    // Entity -> DTO 변환
    public static ReitBuildingMappingResponse fromEntity(ReitBuildingMapping entity) {
        return ReitBuildingMappingResponse.builder()
                .mappingId(entity.getMappingId())
                .productCode(entity.getProductCode())
                .buildingId(entity.getBuildingId())
                .inclusionDate(entity.getInclusionDate())
                .exclusionDate(entity.getExclusionDate())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    // Entity + Building -> DTO 변환
    public static ReitBuildingMappingResponse fromEntityWithBuilding(ReitBuildingMapping entity, Building building) {
        return ReitBuildingMappingResponse.builder()
                .mappingId(entity.getMappingId())
                .productCode(entity.getProductCode())
                .buildingId(entity.getBuildingId())
                .buildingName(building != null ? building.getName() : null)
                .buildingAddress(building != null ? building.getAddress() : null)
                .inclusionDate(entity.getInclusionDate())
                .exclusionDate(entity.getExclusionDate())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    // Entity List -> DTO List 변환
    public static List<ReitBuildingMappingResponse> fromEntityList(List<ReitBuildingMapping> entities) {
        return entities.stream()
                .map(ReitBuildingMappingResponse::fromEntity)
                .collect(Collectors.toList());
    }
}