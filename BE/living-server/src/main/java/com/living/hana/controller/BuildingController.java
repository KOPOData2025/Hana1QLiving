package com.living.hana.controller;

import com.living.hana.dto.ApiResponse;
import com.living.hana.dto.BuildingRequest;
import com.living.hana.dto.BuildingResponse;
import com.living.hana.dto.ReitProductResponse;
import com.living.hana.entity.Building;
import com.living.hana.entity.ReitProduct;
import com.living.hana.service.BuildingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/buildings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BuildingController {

    private final BuildingService buildingService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BuildingResponse>>> getAllBuildings() {
        List<Building> buildings = buildingService.findAll();
        List<BuildingResponse> responses = BuildingResponse.fromEntityList(buildings);
        return ResponseEntity.ok(ApiResponse.successWithMessage(responses, "건물 목록을 성공적으로 조회했습니다."));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BuildingResponse>> getBuildingById(@PathVariable Long id) {
        Building building = buildingService.findById(id);
        if (building != null) {
            BuildingResponse response = BuildingResponse.fromEntity(building);
            return ResponseEntity.ok(ApiResponse.successWithMessage(response, "건물 정보를 성공적으로 조회했습니다."));
        }
        return ResponseEntity.ok(ApiResponse.error("건물을 찾을 수 없습니다."));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<ApiResponse<List<BuildingResponse>>> getBuildingsByStatus(@PathVariable String status) {
        List<Building> buildings = buildingService.findByStatus(status);
        List<BuildingResponse> responses = BuildingResponse.fromEntityList(buildings);
        return ResponseEntity.ok(ApiResponse.successWithMessage(responses, "상태별 건물 목록을 성공적으로 조회했습니다."));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Building>> createBuilding(
            @RequestParam("name") String name,
            @RequestParam("address") String address,
            @RequestParam("addressDetail") String addressDetail,
            @RequestParam("zipCode") String zipCode,
            @RequestParam("buildingType") String buildingType,
            @RequestParam("totalFloors") Integer totalFloors,
            @RequestParam("totalUnits") Integer totalUnits,
            @RequestParam("status") String status,
            @RequestParam(value = "city", required = false) String city,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "latitude", required = false) Double latitude,
            @RequestParam(value = "longitude", required = false) Double longitude,
            @RequestParam(value = "images", required = false) List<MultipartFile> images) {
        
        BuildingRequest buildingRequest = new BuildingRequest();
        buildingRequest.setName(name);
        buildingRequest.setAddress(address);
        buildingRequest.setAddressDetail(addressDetail);
        buildingRequest.setZipCode(zipCode);
        buildingRequest.setBuildingType(buildingType);
        buildingRequest.setTotalFloors(totalFloors);
        buildingRequest.setTotalUnits(totalUnits);
        buildingRequest.setStatus(status);
        buildingRequest.setCity(city);
        buildingRequest.setDistrict(district);
        buildingRequest.setLatitude(latitude);
        buildingRequest.setLongitude(longitude);
        buildingRequest.setImages(images);
        
        Building createdBuilding = buildingService.createBuilding(buildingRequest);
        return ResponseEntity.ok(ApiResponse.successWithMessage(createdBuilding, "건물이 성공적으로 등록되었습니다."));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Building>> updateBuilding(
            @PathVariable Long id,
            @RequestParam("name") String name,
            @RequestParam("address") String address,
            @RequestParam("addressDetail") String addressDetail,
            @RequestParam("zipCode") String zipCode,
            @RequestParam("buildingType") String buildingType,
            @RequestParam("totalFloors") Integer totalFloors,
            @RequestParam("totalUnits") Integer totalUnits,
            @RequestParam("status") String status,
            @RequestParam(value = "city", required = false) String city,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "latitude", required = false) Double latitude,
            @RequestParam(value = "longitude", required = false) Double longitude,
            @RequestParam(value = "existingImages", required = false) List<String> existingImages,
            @RequestParam(value = "images", required = false) List<MultipartFile> images) {
        
        BuildingRequest buildingRequest = new BuildingRequest();
        buildingRequest.setName(name);
        buildingRequest.setAddress(address);
        buildingRequest.setAddressDetail(addressDetail);
        buildingRequest.setZipCode(zipCode);
        buildingRequest.setBuildingType(buildingType);
        buildingRequest.setTotalFloors(totalFloors);
        buildingRequest.setTotalUnits(totalUnits);
        buildingRequest.setStatus(status);
        buildingRequest.setCity(city);
        buildingRequest.setDistrict(district);
        buildingRequest.setLatitude(latitude);
        buildingRequest.setLongitude(longitude);
        buildingRequest.setExistingImages(existingImages);
        buildingRequest.setImages(images);
        
        Building updatedBuilding = buildingService.updateBuilding(id, buildingRequest);
        return ResponseEntity.ok(ApiResponse.successWithMessage(updatedBuilding, "건물 정보가 성공적으로 수정되었습니다."));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBuilding(@PathVariable Long id) {
        buildingService.deleteBuilding(id);
        return ResponseEntity.ok(ApiResponse.successWithMessage(null, "건물이 성공적으로 삭제되었습니다."));
    }

    @GetMapping("/{buildingId}/reits")
    public ResponseEntity<ApiResponse<List<ReitProductResponse>>> getReitsByBuilding(@PathVariable Long buildingId) {
        List<ReitProduct> reits = buildingService.findReitsByBuildingId(buildingId);
        List<ReitProductResponse> responses = ReitProductResponse.fromEntityList(reits);
        return ResponseEntity.ok(ApiResponse.successWithMessage(responses, "오피스텔 포함 리츠 상품 목록을 성공적으로 조회했습니다."));
    }
}
