package com.living.hana.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Unit {
    
    private Long id;
    private Long buildingId;
    private String unitNumber;
    private Integer floor;
    private String unitType; // STUDIO, ONE_BEDROOM, TWO_BEDROOM
    private Double area; // 평수
    private Double monthlyRent; // 월세
    private Double deposit; // 보증금
    private String status; // AVAILABLE, OCCUPIED, MAINTENANCE
    private String images; // JSON 형태로 이미지 URL 배열 저장
    private String createdAt;
    private String updatedAt;
}
