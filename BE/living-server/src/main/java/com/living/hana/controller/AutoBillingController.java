package com.living.hana.controller;

import com.living.hana.dto.ApiResponse;
import com.living.hana.dto.AutoBillingSetupRequest;
import com.living.hana.dto.BillingDetailsResponse;
import com.living.hana.entity.AutoBillingContract;
import com.living.hana.service.AutoBillingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/auto-billing")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AutoBillingController {

    private final AutoBillingService autoBillingService;

    /**
     * 자동납부 설정
     */
    @PostMapping("/setup")
    public ResponseEntity<ApiResponse<AutoBillingContract>> setupAutoBilling(
            @RequestBody AutoBillingSetupRequest request,
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                userId = 1L;
            }

            boolean result = autoBillingService.setupAutoBilling(
                userId, 
                request.getContractId(),
                request.getFromAccount(),
                request.getBillingDay()
            );

            if (result) {
                AutoBillingContract contractInfo = autoBillingService.getAutoBillingContract(userId);
                return ResponseEntity.ok(ApiResponse.success("자동납부가 성공적으로 설정되었습니다.", contractInfo));
            } else {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("자동납부 설정에 실패했습니다.")
                );
            }

        } catch (Exception e) {
            log.error("자동납부 설정 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("자동납부 설정 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 자동납부 해지
     */
    @DeleteMapping("/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelAutoBilling(
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                userId = 1L;
            }

            boolean result = autoBillingService.cancelAutoBilling(userId);

            if (result) {
                return ResponseEntity.ok(ApiResponse.success("자동납부가 성공적으로 해지되었습니다.", null));
            } else {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("자동납부 해지에 실패했습니다.")
                );
            }

        } catch (Exception e) {
            log.error("자동납부 해지 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("자동납부 해지 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 자동납부 일시정지
     */
    @PutMapping("/suspend")
    public ResponseEntity<ApiResponse<Void>> suspendAutoBilling(
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                userId = 1L;
            }

            boolean result = autoBillingService.suspendAutoBilling(userId);

            if (result) {
                return ResponseEntity.ok(ApiResponse.success("자동납부가 일시정지되었습니다.", null));
            } else {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("자동납부 일시정지에 실패했습니다.")
                );
            }

        } catch (Exception e) {
            log.error("자동납부 일시정지 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("자동납부 일시정지 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 자동납부 재개
     */
    @PutMapping("/resume")
    public ResponseEntity<ApiResponse<Void>> resumeAutoBilling(
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                userId = 1L;
            }

            boolean result = autoBillingService.resumeAutoBilling(userId);

            if (result) {
                return ResponseEntity.ok(ApiResponse.success("자동납부가 재개되었습니다.", null));
            } else {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("자동납부 재개에 실패했습니다.")
                );
            }

        } catch (Exception e) {
            log.error("자동납부 재개 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("자동납부 재개 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 자동납부 정보 조회
     */
    @GetMapping("/info")
    public ResponseEntity<ApiResponse<AutoBillingContract>> getAutoBillingInfo(
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                userId = 1L;
            }

            AutoBillingContract contractInfo = autoBillingService.getAutoBillingContract(userId);

            if (contractInfo != null) {
                return ResponseEntity.ok(ApiResponse.success("자동납부 정보를 성공적으로 조회했습니다.", contractInfo));
            } else {
                return ResponseEntity.ok(ApiResponse.success("설정된 자동납부가 없습니다.", null));
            }

        } catch (Exception e) {
            log.error("자동납부 정보 조회 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("자동납부 정보 조회 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 자동납부 설정 여부 확인
     */
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Boolean>> getAutoBillingStatus(
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                userId = 1L;
            }

            boolean hasAutoBilling = autoBillingService.hasAutoBilling(userId);

            return ResponseEntity.ok(ApiResponse.success("자동납부 설정 여부를 확인했습니다.", hasAutoBilling));

        } catch (Exception e) {
            log.error("자동납부 상태 확인 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("자동납부 상태 확인 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 사용자별 청구서 목록 조회
     */
    @GetMapping("/bills")
    public ResponseEntity<ApiResponse<List<BillingDetailsResponse>>> getUserBillings(
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                userId = 1L;
            }

            List<BillingDetailsResponse> billings = autoBillingService.getUserBillings(userId);

            return ResponseEntity.ok(ApiResponse.success("청구서 목록을 성공적으로 조회했습니다.", billings));

        } catch (Exception e) {
            log.error("청구서 목록 조회 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("청구서 목록 조회 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 청구서 상세 조회
     */
    @GetMapping("/bills/{billingId}")
    public ResponseEntity<ApiResponse<BillingDetailsResponse>> getBillingDetails(
            @PathVariable Long billingId) {

        try {
            BillingDetailsResponse billing = autoBillingService.getBillingDetails(billingId);

            if (billing != null) {
                return ResponseEntity.ok(ApiResponse.success("청구서 상세 정보를 성공적으로 조회했습니다.", billing));
            } else {
                return ResponseEntity.ok(ApiResponse.error("청구서를 찾을 수 없습니다."));
            }

        } catch (Exception e) {
            log.error("청구서 상세 조회 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("청구서 상세 조회 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }
}