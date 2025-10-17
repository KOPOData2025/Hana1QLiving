package com.living.hana.controller;

import com.living.hana.dto.ApiResponse;
import com.living.hana.entity.Unit;
import com.living.hana.service.UnitService;
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
@RequestMapping("/api/units")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UnitController {

    private final UnitService unitService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Unit>>> getAllUnits() {
        List<Unit> units = unitService.findAll();
        return ResponseEntity.ok(ApiResponse.successWithMessage(units, "호실 목록을 성공적으로 조회했습니다."));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Unit>> getUnitById(@PathVariable Long id) {
        Unit unit = unitService.findById(id);
        if (unit != null) {
            return ResponseEntity.ok(ApiResponse.successWithMessage(unit, "호실 정보를 성공적으로 조회했습니다."));
        }
        return ResponseEntity.ok(ApiResponse.error("호실을 찾을 수 없습니다."));
    }

    @GetMapping("/building/{buildingId}")
    public ResponseEntity<ApiResponse<List<Unit>>> getUnitsByBuildingId(@PathVariable Long buildingId) {
        List<Unit> units = unitService.findByBuildingId(buildingId);
        return ResponseEntity.ok(ApiResponse.successWithMessage(units, "건물별 호실 목록을 성공적으로 조회했습니다."));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<ApiResponse<List<Unit>>> getUnitsByStatus(@PathVariable String status) {
        List<Unit> units = unitService.findByStatus(status);
        return ResponseEntity.ok(ApiResponse.successWithMessage(units, "상태별 호실 목록을 성공적으로 조회했습니다."));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Unit>> createUnit(
            @RequestParam("buildingId") Long buildingId,
            @RequestParam("unitNumber") String unitNumber,
            @RequestParam("floor") Integer floor,
            @RequestParam("unitType") String unitType,
            @RequestParam("area") Double area,
            @RequestParam("monthlyRent") Double monthlyRent,
            @RequestParam(value = "deposit", required = false, defaultValue = "0") Double deposit,
            @RequestParam("status") String status,
            @RequestParam(value = "images", required = false) List<MultipartFile> images) {
        try {
            // 필수 필드 검증
            if (buildingId == null) {
                return ResponseEntity.ok(ApiResponse.error("건물 ID는 필수입니다."));
            }
            if (unitNumber == null || unitNumber.trim().isEmpty()) {
                return ResponseEntity.ok(ApiResponse.error("호실 번호는 필수입니다."));
            }
            if (floor == null) {
                return ResponseEntity.ok(ApiResponse.error("층수는 필수입니다."));
            }
            
            // Unit 객체 생성
            Unit unit = new Unit();
            unit.setBuildingId(buildingId);
            unit.setUnitNumber(unitNumber);
            unit.setFloor(floor);
            unit.setUnitType(unitType);
            unit.setArea(area);
            unit.setMonthlyRent(monthlyRent);
            unit.setDeposit(deposit);
            unit.setStatus(status);
            
            Unit createdUnit = unitService.createUnit(unit, images);
            return ResponseEntity.ok(ApiResponse.successWithMessage(createdUnit, "호실이 성공적으로 등록되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("호실 등록 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Unit>> updateUnit(
            @PathVariable Long id,
            @RequestParam("buildingId") Long buildingId,
            @RequestParam("unitNumber") String unitNumber,
            @RequestParam("floor") Integer floor,
            @RequestParam("unitType") String unitType,
            @RequestParam("area") Double area,
            @RequestParam("monthlyRent") Double monthlyRent,
            @RequestParam(value = "deposit", required = false, defaultValue = "0") Double deposit,
            @RequestParam("status") String status,
            @RequestParam(value = "existingImages", required = false) List<String> existingImages,
            @RequestParam(value = "images", required = false) List<MultipartFile> images) {
        try {
            // Unit 객체 생성
            Unit unit = new Unit();
            unit.setId(id);
            unit.setBuildingId(buildingId);
            unit.setUnitNumber(unitNumber);
            unit.setFloor(floor);
            unit.setUnitType(unitType);
            unit.setArea(area);
            unit.setMonthlyRent(monthlyRent);
            unit.setDeposit(deposit);
            unit.setStatus(status);
            
            Unit updatedUnit = unitService.updateUnit(unit, existingImages, images);
            return ResponseEntity.ok(ApiResponse.successWithMessage(updatedUnit, "호실 정보가 성공적으로 수정되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("호실 수정 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUnit(@PathVariable Long id) {
        unitService.deleteUnit(id);
        return ResponseEntity.ok(ApiResponse.successWithMessage(null, "호실이 성공적으로 삭제되었습니다."));
    }
}
