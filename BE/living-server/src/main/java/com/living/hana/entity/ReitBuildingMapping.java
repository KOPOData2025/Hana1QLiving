package com.living.hana.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.sql.Date;
import java.sql.Timestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReitBuildingMapping {

    private Long mappingId;           // 매핑 ID (PK)
    private String productCode;       // REIT 상품 코드
    private Long buildingId;          // 건물 ID
    private Date inclusionDate;       // 포함 시작일
    private Date exclusionDate;       // 제외일 (선택사항)
    private Timestamp createdAt;      // 생성일
}