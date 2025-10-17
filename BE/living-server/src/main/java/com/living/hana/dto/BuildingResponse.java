package com.living.hana.dto;

import com.living.hana.entity.Building;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;
import java.util.ArrayList;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BuildingResponse {
    
    private Long id;
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
    private List<String> images; // 파싱된 이미지 URL 배열
    private String createdAt;
    private String updatedAt;
    
    /**
     * Building 엔티티를 BuildingResponse로 변환
     */
    public static BuildingResponse fromEntity(Building building) {
        BuildingResponse response = new BuildingResponse();
        response.setId(building.getId());
        response.setName(building.getName());
        response.setAddress(building.getAddress());
        response.setAddressDetail(building.getAddressDetail());
        response.setZipCode(building.getZipCode());
        response.setBuildingType(building.getBuildingType());
        response.setTotalFloors(building.getTotalFloors());
        response.setTotalUnits(building.getTotalUnits());
        response.setStatus(building.getStatus());
        response.setCity(building.getCity());
        response.setDistrict(building.getDistrict());
        response.setLatitude(building.getLatitude());
        response.setLongitude(building.getLongitude());
        response.setCreatedAt(building.getCreatedAt());
        response.setUpdatedAt(building.getUpdatedAt());

        // images JSON 문자열을 List<String>으로 파싱
        response.setImages(parseImages(building.getImages()));
        
        return response;
    }
    
    /**
     * Building 엔티티 리스트를 BuildingResponse 리스트로 변환
     */
    public static List<BuildingResponse> fromEntityList(List<Building> buildings) {
        List<BuildingResponse> responses = new ArrayList<>();
        for (Building building : buildings) {
            responses.add(fromEntity(building));
        }
        return responses;
    }
    
    /**
     * images JSON 문자열을 List<String>으로 파싱
     */
    private static List<String> parseImages(String imagesJson) {
        List<String> images = new ArrayList<>();
        
        if (imagesJson == null || imagesJson.isEmpty() || imagesJson.equals("[]")) {
            return images;
        }
        
        try {
            // 간단한 JSON 파싱 (실제로는 Jackson이나 Gson 사용 권장)
            if (imagesJson.startsWith("[") && imagesJson.endsWith("]")) {
                String content = imagesJson.substring(1, imagesJson.length() - 1);
                if (!content.isEmpty()) {
                    String[] urls = content.split("\",\"");
                    for (String url : urls) {
                        url = url.replace("\"", "");
                        if (!url.isEmpty()) {
                            images.add(url);
                        }
                    }
                }
            }
        } catch (Exception e) {
            // 파싱 실패 시 빈 배열 반환
            return new ArrayList<>();
        }
        
        return images;
    }
}
