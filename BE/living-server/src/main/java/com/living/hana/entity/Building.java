package com.living.hana.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Building {
    
    private Long id;
    private String name;
    private String address;
    private String addressDetail;
    private String zipCode;
    private String buildingType; // OFFICETEL, APARTMENT
    private Integer totalFloors;
    private Integer totalUnits;
    private String status; // ACTIVE, INACTIVE
    private String city; // 시/도 (서울시, 부산시 등)
    private String district; // 구/군 (강남구, 동작구 등)
    private Double latitude; // 위도
    private Double longitude; // 경도
    private String images; // GCP Cloud Storage URL 배열 (JSON 문자열)
    private String createdAt;
    private String updatedAt;
}
