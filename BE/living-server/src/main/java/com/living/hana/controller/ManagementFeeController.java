package com.living.hana.controller;

import com.living.hana.dto.ApiResponse;
import com.living.hana.dto.ManagementFeeChargeRequest;
import com.living.hana.dto.ManagementFeeChargeResponse;
import com.living.hana.service.ManagementFeeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/management-fee")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ManagementFeeController {

    private final ManagementFeeService managementFeeService;

    /**
     * 관리비 청구 (관리자용)
     */
    @PostMapping("/charge")
    public ResponseEntity<ApiResponse<ManagementFeeChargeResponse>> chargeManagementFee(
            @RequestBody ManagementFeeChargeRequest request,
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("사용자 인증이 필요합니다.")
                );
            }

            ManagementFeeChargeResponse result = managementFeeService.chargeManagementFee(request, userId);

            return ResponseEntity.ok(
                ApiResponse.success("관리비가 성공적으로 청구되었습니다.", result)
            );

        } catch (Exception e) {
            log.error("관리비 청구 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("관리비 청구 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 사용자별 관리비 청구 목록 조회
     */
    @GetMapping("/charges/my")
    public ResponseEntity<ApiResponse<List<ManagementFeeChargeResponse>>> getMyManagementFeeCharges(
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("사용자 인증이 필요합니다.")
                );
            }

            List<ManagementFeeChargeResponse> charges = managementFeeService.getManagementFeeChargesByUserId(userId);

            return ResponseEntity.ok(
                ApiResponse.success("사용자별 관리비 청구 목록을 조회했습니다.", charges)
            );

        } catch (Exception e) {
            log.error("사용자별 관리비 청구 목록 조회 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("관리비 청구 목록 조회 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 관리자용 전체 관리비 청구 목록 조회
     */
    @GetMapping("/charges/all")
    public ResponseEntity<ApiResponse<List<ManagementFeeChargeResponse>>> getAllManagementFeeCharges(
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("사용자 인증이 필요합니다.")
                );
            }

            List<ManagementFeeChargeResponse> charges = managementFeeService.getAllManagementFeeCharges();

            return ResponseEntity.ok(
                ApiResponse.success("전체 관리비 청구 목록을 조회했습니다.", charges)
            );

        } catch (Exception e) {
            log.error("전체 관리비 청구 목록 조회 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("관리비 청구 목록 조회 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 호실별 관리비 청구 목록 조회
     */
    @GetMapping("/charges/unit/{unitId}")
    public ResponseEntity<ApiResponse<List<ManagementFeeChargeResponse>>> getManagementFeeChargesByUnit(
            @PathVariable Long unitId,
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("사용자 인증이 필요합니다.")
                );
            }

            List<ManagementFeeChargeResponse> charges = managementFeeService.getManagementFeeChargesByUnitId(unitId);

            return ResponseEntity.ok(
                ApiResponse.success("호실별 관리비 청구 목록을 조회했습니다.", charges)
            );

        } catch (Exception e) {
            log.error("호실별 관리비 청구 목록 조회 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("호실별 관리비 청구 목록 조회 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 관리비 청구 상세 정보 조회
     */
    @GetMapping("/charges/{chargeId}")
    public ResponseEntity<ApiResponse<ManagementFeeChargeResponse>> getManagementFeeChargeDetail(
            @PathVariable Long chargeId,
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("사용자 인증이 필요합니다.")
                );
            }

            ManagementFeeChargeResponse charge = managementFeeService.getManagementFeeChargeById(chargeId);

            if (charge == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(
                ApiResponse.success("관리비 청구 상세 정보를 조회했습니다.", charge)
            );

        } catch (Exception e) {
            log.error("관리비 청구 상세 정보 조회 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("관리비 청구 상세 정보 조회 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 관리비 청구 취소 (관리자용)
     */
    @DeleteMapping("/charges/{chargeId}")
    public ResponseEntity<ApiResponse<Void>> cancelManagementFeeCharge(
            @PathVariable Long chargeId,
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("사용자 인증이 필요합니다.")
                );
            }

            boolean result = managementFeeService.cancelManagementFeeCharge(chargeId, userId);

            if (result) {
                return ResponseEntity.ok(
                    ApiResponse.success("관리비 청구가 취소되었습니다.", null)
                );
            } else {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("관리비 청구 취소에 실패했습니다.")
                );
            }

        } catch (Exception e) {
            log.error("관리비 청구 취소 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("관리비 청구 취소 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 관리비 서비스 상태 확인 (헬스체크)
     */
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> checkManagementFeeServiceHealth() {
        try {
            return ResponseEntity.ok(
                ApiResponse.success("관리비 서비스가 정상 작동 중입니다.", "HEALTHY")
            );
        } catch (Exception e) {
            log.error("관리비 서비스 상태 확인 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("관리비 서비스 상태 확인 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }
}