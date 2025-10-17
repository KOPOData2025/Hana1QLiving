package com.living.hana.service;

import com.living.hana.annotation.Logging;
import com.living.hana.entity.Unit;
import com.living.hana.mapper.UnitMapper;
import com.living.hana.util.DateTimeUtils;
import com.living.hana.util.JsonUtils;
// ServiceLogger 제거됨
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
public class UnitService {

    private final UnitMapper unitMapper;
    private final TransactionTemplate transactionTemplate;
    private final StorageService storageService;
    // ServiceLogger 제거됨

    @Logging(operation = "전체 호실 조회", category = "UNIT", maskSensitive = false)
    public List<Unit> findAll() {
        return unitMapper.findAll();
    }

    @Logging(operation = "호실 조회", category = "UNIT", maskSensitive = false)
    public Unit findById(Long id) {
        return unitMapper.findById(id);
    }

    @Logging(operation = "건물별 호실 조회", category = "UNIT", maskSensitive = false)
    public List<Unit> findByBuildingId(Long buildingId) {
        return unitMapper.findByBuildingId(buildingId);
    }

    @Logging(operation = "상태별 호실 조회", category = "UNIT", maskSensitive = false)
    public List<Unit> findByStatus(String status) {
        return unitMapper.findByStatus(status);
    }

    @Logging(operation = "호실 생성", category = "UNIT", maskSensitive = false)
    @Transactional
    public Unit createUnit(Unit unit, List<MultipartFile> images) {
        return transactionTemplate.execute(status -> {
            try {
                // 이미지 업로드 및 호실 객체 준비
                Unit preparedUnit = prepareUnitForCreation(unit, images);

                // 데이터베이스에 저장
                int insertResult = unitMapper.insert(preparedUnit);

                if (insertResult > 0) {
                    status.flush();
                    return refetchCreatedUnit(preparedUnit);
                } else {
                    status.setRollbackOnly();
                    throw new RuntimeException("호실 생성에 실패했습니다.");
                }
            } catch (Exception e) {
                status.setRollbackOnly();
                throw e;
            }
        });
    }
    
    /**
     * 호실 생성을 위한 데이터 준비
     */
    private Unit prepareUnitForCreation(Unit unit, List<MultipartFile> images) {
        // 이미지 업로드 처리
        List<String> imageUrls = uploadUnitImages(images);
        
        // 중복 호실 번호 검증
        log.info("Checking for duplicate unit number: {} in building: {}", unit.getUnitNumber(), unit.getBuildingId());
        Unit existingUnit = unitMapper.findByBuildingIdAndUnitNumber(unit.getBuildingId(), unit.getUnitNumber());
        if (existingUnit != null) {
            log.error("Duplicate unit found - Unit ID: {}, Building ID: {}, Unit Number: {}", 
                      existingUnit.getId(), existingUnit.getBuildingId(), existingUnit.getUnitNumber());
            throw new RuntimeException("건물 " + unit.getBuildingId() + "에 이미 " + unit.getUnitNumber() + "호실이 존재합니다.");
        }
        
        // 이미지 JSON 설정
        unit.setImages(JsonUtils.imageUrlsToJson(imageUrls));
        
        // 시스템 설정값
        String currentTime = DateTimeUtils.getCurrentTimestamp();
        unit.setCreatedAt(currentTime);
        unit.setUpdatedAt(currentTime);
        
        // 기본값 설정
        setUnitDefaults(unit);
        
        return unit;
    }
    
    /**
     * 호실 기본값 설정
     */
    private void setUnitDefaults(Unit unit) {
        if (unit.getUnitType() == null || unit.getUnitType().trim().isEmpty()) {
            unit.setUnitType("ONE_BEDROOM");
        }
        if (unit.getArea() == null) {
            unit.setArea(25.0);
        }
        if (unit.getMonthlyRent() == null) {
            unit.setMonthlyRent(800000.0);
        }
        if (unit.getDeposit() == null) {
            unit.setDeposit(0.0);
        }
        if (unit.getStatus() == null || unit.getStatus().trim().isEmpty()) {
            unit.setStatus("AVAILABLE");
        }
    }
    
    /**
     * 호실 이미지 업로드 처리
     */
    private List<String> uploadUnitImages(List<MultipartFile> images) {
        if (images == null || images.isEmpty()) {
            return new ArrayList<>();
        }
        
        List<String> imageUrls = storageService.uploadImages(images);
        return imageUrls != null ? imageUrls : new ArrayList<>();
    }
    
    /**
     * 생성된 호실 정보 재조회
     */
    private Unit refetchCreatedUnit(Unit unit) {
        try {
            // Oracle 트랜잭션 커밋 대기
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        Unit createdUnit = unitMapper.findById(unit.getId());
        if (createdUnit != null) {
            return createdUnit;
        } else {
            log.warn("Unit created but failed to re-fetch: {}", unit.getUnitNumber());
            // 재조회 실패 시 기본 호실 객체 반환
            Unit fallbackUnit = new Unit();
            fallbackUnit.setId(0L);
            fallbackUnit.setUnitNumber(unit.getUnitNumber());
            return fallbackUnit;
        }
    }

    @Logging(operation = "호실 정보 수정", category = "UNIT", maskSensitive = false)
    @Transactional
    public Unit updateUnit(Unit unit, List<String> existingImages, List<MultipartFile> newImages) {
        // 기존 호실 정보 조회
        Unit existingUnit = unitMapper.findById(unit.getId());
        if (existingUnit == null) {
            throw new RuntimeException("호실을 찾을 수 없습니다.");
        }

        // 기존 이미지 처리
        String existingImagesJson = existingUnit.getImages();
        List<String> currentImages = new ArrayList<>();

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
                                currentImages.add(url);
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
        if (existingImages != null) {
            imagesToKeep.addAll(existingImages);
        }

        // 삭제할 이미지들 (GCP에서도 삭제)
        List<String> imagesToDelete = new ArrayList<>(currentImages);
        imagesToDelete.removeAll(imagesToKeep);
        if (!imagesToDelete.isEmpty()) {
            storageService.deleteImages(imagesToDelete);
        }

        // 새로 업로드할 이미지들
        List<String> newImageUrls = new ArrayList<>();
        if (newImages != null && !newImages.isEmpty()) {
            newImageUrls = storageService.uploadImages(newImages);
        }

        // 최종 이미지 목록 (유지할 기존 이미지 + 새로 업로드한 이미지)
        List<String> finalImages = new ArrayList<>();
        finalImages.addAll(imagesToKeep);
        finalImages.addAll(newImageUrls);

        // 호실 정보 업데이트
        unit.setImages(JsonUtils.imageUrlsToJson(finalImages));
        unit.setUpdatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

        int updateResult = unitMapper.update(unit);

        if (updateResult > 0) {
            return unit;
        } else {
            throw new RuntimeException("호실 정보 수정에 실패했습니다.");
        }
    }

    @Logging(operation = "호실 삭제", category = "UNIT", maskSensitive = false)
    @Transactional
    public void deleteUnit(Long id) {
        // 호실 삭제 전 이미지들도 GCP에서 삭제
        Unit unit = unitMapper.findById(id);
        if (unit != null && unit.getImages() != null && !unit.getImages().isEmpty()) {
            // JSON 문자열을 파싱하여 이미지 URL 추출
            try {
                String imagesJson = unit.getImages();
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
                    }
                }
            } catch (Exception e) {
                log.error("Error parsing images JSON: {}", e.getMessage(), e);
            }
        }

        int deleteResult = unitMapper.deleteById(id);

        if (deleteResult == 0) {
            throw new RuntimeException("호실 삭제에 실패했습니다.");
        }
    }
}
