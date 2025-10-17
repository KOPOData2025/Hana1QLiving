package com.living.hana.dto;

import lombok.Data;

import java.sql.Date;

@Data
public class ReitBuildingMappingRequest {
    private String productCode;       // REIT 상품 코드
    private Long buildingId;          // 건물 ID
    private Date inclusionDate;       // 포함 시작일
    private Date exclusionDate;       // 제외일 (선택사항)
}