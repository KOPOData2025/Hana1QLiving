package com.living.hana.service;

import com.living.hana.annotation.Logging;
import com.living.hana.dto.BuildingRequest;
import com.living.hana.entity.Building;
import com.living.hana.entity.ReitProduct;
import com.living.hana.entity.ReitBuildingMapping;
import com.living.hana.mapper.BuildingMapper;
import com.living.hana.mapper.ReitProductMapper;
import com.living.hana.mapper.ReitBuildingMappingMapper;
import com.living.hana.util.DateTimeUtils;
import com.living.hana.util.EntityValidator;
import com.living.hana.util.JsonUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BuildingService {

    private final BuildingMapper buildingMapper;
    private final TransactionTemplate transactionTemplate;
    private final StorageService storageService;
    private final EntityValidator entityValidator;
    private final ReitBuildingMappingMapper reitBuildingMappingMapper;
    private final ReitProductMapper reitProductMapper;

    public List<Building> findAll() {
        return buildingMapper.findAll();
    }

    public Building findById(Long id) {
        return buildingMapper.findById(id);
    }

    public List<Building> findByStatus(String status) {
        return buildingMapper.findByStatus(status);
    }

    @Logging(operation = "건물 생성", category = "BUILDING", includeParams = true)
    @Transactional
    public Building createBuilding(BuildingRequest buildingRequest) {

        return transactionTemplate.execute(status -> {
            try {
                // 이미지 업로드 및 빌딩 객체 생성
                Building building = prepareBuildingForCreation(buildingRequest);

                // 데이터베이스에 저장
                int insertResult = buildingMapper.insert(building);

                if (insertResult > 0) {
                    status.flush();
                    return refetchCreatedBuilding(building.getName());
                } else {
                    status.setRollbackOnly();
                    throw new RuntimeException("건물 생성에 실패했습니다.");
                }
            } catch (Exception e) {
                status.setRollbackOnly();
                throw e;
            }
        });
    }
    
    /**
     * 빌딩 생성을 위한 데이터 준비
     */
    private Building prepareBuildingForCreation(BuildingRequest buildingRequest) {
        // 이미지 업로드 처리
        List<String> imageUrls = uploadBuildingImages(buildingRequest.getImages());
        
        // Building 객체 생성 및 설정
        Building building = new Building();
        building.setName(buildingRequest.getName());
        building.setAddress(buildingRequest.getAddress());
        building.setAddressDetail(buildingRequest.getAddressDetail());
        building.setZipCode(buildingRequest.getZipCode());
        building.setBuildingType(buildingRequest.getBuildingType());
        building.setTotalFloors(buildingRequest.getTotalFloors());
        building.setTotalUnits(buildingRequest.getTotalUnits());
        building.setStatus(buildingRequest.getStatus());
        building.setCity(buildingRequest.getCity());
        building.setDistrict(buildingRequest.getDistrict());
        building.setLatitude(buildingRequest.getLatitude());
        building.setLongitude(buildingRequest.getLongitude());
        
        // 이미지 JSON 설정
        building.setImages(JsonUtils.imageUrlsToJson(imageUrls));
        
        // 시스템 설정값
        building.setStatus("ACTIVE");
        String currentTime = DateTimeUtils.getCurrentTimestamp();
        building.setCreatedAt(currentTime);
        building.setUpdatedAt(currentTime);
        
        // 기본값 설정 및 검증
        entityValidator.validateAndSetDefaults(building);
        setBuildingDefaults(building);
        
        return building;
    }
    
    /**
     * 빌딩 기본값 설정
     */
    private void setBuildingDefaults(Building building) {
        if (building.getBuildingType() == null) {
            building.setBuildingType("OFFICETEL");
        }
        if (building.getTotalFloors() == null) {
            building.setTotalFloors(10);
        }
        if (building.getTotalUnits() == null) {
            building.setTotalUnits(50);
        }
    }
    
    /**
     * 빌딩 이미지 업로드 처리
     */
    private List<String> uploadBuildingImages(List<MultipartFile> images) {
        if (images == null || images.isEmpty()) {
            return new ArrayList<>();
        }
        
        List<String> imageUrls = storageService.uploadImages(images);
        return imageUrls != null ? imageUrls : new ArrayList<>();
    }
    
    /**
     * 생성된 빌딩 정보 재조회
     */
    private Building refetchCreatedBuilding(String buildingName) {
        try {
            // Oracle 트랜잭션 커밋 대기 (임시 해결책)
            Thread.sleep(100); // 500ms에서 100ms로 단축
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        Building createdBuilding = buildingMapper.findByName(buildingName);
        if (createdBuilding != null) {
            return createdBuilding;
        } else {
            log.warn("Building created but failed to re-fetch: {}", buildingName);
            // 재조회 실패 시 기본 빌딩 객체 반환 (ID는 0으로 설정)
            Building fallbackBuilding = new Building();
            fallbackBuilding.setId(0L);
            fallbackBuilding.setName(buildingName);
            return fallbackBuilding;
        }
    }

    @Transactional
    public Building updateBuilding(Long id, BuildingRequest buildingRequest) {
        try {
            log.info("Updating building with ID: {}", id);
            
            // 기존 건물 정보 조회
            Building existingBuilding = buildingMapper.findById(id);
            if (existingBuilding == null) {
                throw new RuntimeException("건물을 찾을 수 없습니다.");
            }
            
            // 기존 이미지 처리
            String existingImagesJson = existingBuilding.getImages();
            List<String> existingImages = new ArrayList<>();
            
            // JSON 문자열을 List<String>으로 파싱
            if (existingImagesJson != null && !existingImagesJson.isEmpty()) {
                try {
                    if (existingImagesJson.startsWith("[") && existingImagesJson.endsWith("]")) {
                        String content = existingImagesJson.substring(1, existingImagesJson.length() - 1);
                        if (!content.isEmpty()) {
                            String[] urls = content.split("\",\"");
                            for (String url : urls) {
                                url = url.replace("\"", "");
                                if (!url.isEmpty()) {
                                    existingImages.add(url);
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    log.error("Error parsing existing images JSON: {}", e.getMessage(), e);
                }
            }
            
            // 유지할 기존 이미지들
            List<String> imagesToKeep = new ArrayList<>();
            if (buildingRequest.getExistingImages() != null) {
                imagesToKeep.addAll(buildingRequest.getExistingImages());
            }
            
            // 삭제할 이미지들 (GCP에서도 삭제)
            List<String> imagesToDelete = new ArrayList<>(existingImages);
            imagesToDelete.removeAll(imagesToKeep);
            if (!imagesToDelete.isEmpty()) {
                storageService.deleteImages(imagesToDelete);
                // 기존 건물 이미지 삭제됨
            }
            
            // 새로 업로드할 이미지들
            List<String> newImageUrls = new ArrayList<>();
            if (buildingRequest.getImages() != null && !buildingRequest.getImages().isEmpty()) {
                newImageUrls = storageService.uploadImages(buildingRequest.getImages());
                log.info("Uploaded {} new images for building: {}", newImageUrls.size(), existingBuilding.getName());
            }
            
            // 최종 이미지 목록 (유지할 기존 이미지 + 새로 업로드한 이미지)
            List<String> finalImages = new ArrayList<>();
            finalImages.addAll(imagesToKeep);
            finalImages.addAll(newImageUrls);
            
            // List<String>을 JSON 문자열로 변환
            String imagesJson = "[]";
            if (!finalImages.isEmpty()) {
                imagesJson = "[\"" + String.join("\",\"", finalImages) + "\"]";
            }
            
            // 건물 정보 업데이트
            Building building = new Building();
            building.setId(id);
            building.setName(buildingRequest.getName());
            building.setAddress(buildingRequest.getAddress());
            building.setAddressDetail(buildingRequest.getAddressDetail());
            building.setZipCode(buildingRequest.getZipCode());
            building.setBuildingType(buildingRequest.getBuildingType());
            building.setTotalFloors(buildingRequest.getTotalFloors());
            building.setTotalUnits(buildingRequest.getTotalUnits());
            building.setStatus(buildingRequest.getStatus());
            building.setCity(buildingRequest.getCity());
            building.setDistrict(buildingRequest.getDistrict());
            building.setLatitude(buildingRequest.getLatitude());
            building.setLongitude(buildingRequest.getLongitude());
            building.setImages(imagesJson);
            building.setUpdatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
            
            int updateResult = buildingMapper.update(building);
            log.info("Update result: {} rows affected", updateResult);
            
            if (updateResult > 0) {
                log.info("Building updated successfully: {}", building.getName());
                return building;
            } else {
                log.warn("Update failed: no rows affected for building: {}", building.getName());
                throw new RuntimeException("건물 정보 수정에 실패했습니다.");
            }
            
        } catch (Exception e) {
            log.error("Error updating building with ID {}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    @Transactional
    public void deleteBuilding(Long id) {
        try {
            log.info("Deleting building with ID: {}", id);
            
            // 건물 삭제 전 이미지들도 GCP에서 삭제
            Building building = buildingMapper.findById(id);
            if (building != null && building.getImages() != null && !building.getImages().isEmpty()) {
                // JSON 문자열을 파싱하여 이미지 URL 추출
                try {
                    // 간단한 JSON 파싱 (실제로는 Jackson이나 Gson 사용 권장)
                    String imagesJson = building.getImages();
                    if (imagesJson.startsWith("[") && imagesJson.endsWith("]")) {
                        String content = imagesJson.substring(1, imagesJson.length() - 1);
                        if (!content.isEmpty()) {
                            String[] urls = content.split("\",\"");
                            for (String url : urls) {
                                url = url.replace("\"", "");
                                if (!url.isEmpty()) {
                                    storageService.deleteImage(url);
                                }
                            }
                            // 건물 이미지 삭제됨
                        }
                    }
                } catch (Exception e) {
                    log.error("Error parsing images JSON: {}", e.getMessage(), e);
                }
            }
            
            int deleteResult = buildingMapper.deleteById(id);
            log.info("Delete result: {} rows affected", deleteResult);
            
            if (deleteResult > 0) {
                log.info("Building deleted successfully: {}", id);
            } else {
                log.warn("Delete failed: no rows affected for building ID: {}", id);
            }
        } catch (Exception e) {
            log.error("Error deleting building with ID {}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * 특정 오피스텔이 포함된 리츠 상품 목록 조회
     * @param buildingId 오피스텔 ID
     * @return 해당 오피스텔이 포함된 리츠 상품 목록
     */
    public List<ReitProduct> findReitsByBuildingId(Long buildingId) {
        try {
            log.info("Finding REIT products for building ID: {}", buildingId);

            // 1. 해당 오피스텔과 연결된 활성 매핑 조회
            List<ReitBuildingMapping> mappings = reitBuildingMappingMapper.findActiveByBuildingId(buildingId);

            if (mappings == null || mappings.isEmpty()) {
                log.info("No REIT products found for building ID: {}", buildingId);
                return new ArrayList<>();
            }

            // 2. 각 매핑에서 리츠 상품 조회
            List<ReitProduct> products = new ArrayList<>();
            for (ReitBuildingMapping mapping : mappings) {
                ReitProduct product = reitProductMapper.findByProductCode(mapping.getProductCode());
                if (product != null) {
                    products.add(product);
                }
            }

            log.info("Found {} REIT products for building ID: {}", products.size(), buildingId);
            return products;

        } catch (Exception e) {
            log.error("Error finding REIT products for building ID {}: {}", buildingId, e.getMessage(), e);
            throw new RuntimeException("리츠 상품 조회 중 오류가 발생했습니다.", e);
        }
    }
}
