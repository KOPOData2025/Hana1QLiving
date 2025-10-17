package com.living.hana.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Data
public class BuildingRequest {
    private String name;
    private String address;
    private String addressDetail;
    private String zipCode;
    private String buildingType;
    private Integer totalFloors;
    private Integer totalUnits;
    private String status;
    private String city; // 시/도
    private String district; // 구/군
    private Double latitude; // 위도
    private Double longitude; // 경도
    private List<String> existingImages; // 기존 이미지 URL 배열 (수정 시 사용)
    private List<MultipartFile> images; // 새로 업로드할 이미지 파일들
}
