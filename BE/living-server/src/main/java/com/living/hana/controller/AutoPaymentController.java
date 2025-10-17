package com.living.hana.controller;

import com.living.hana.dto.ApiResponse;
import com.living.hana.dto.AutoPaymentSetupRequest;
import com.living.hana.dto.AutoPaymentUpdateRequest;
import com.living.hana.dto.AutoPaymentDetailDto;
import com.living.hana.dto.AutoTransferContractInfo;
import com.living.hana.service.AutoPaymentService;

import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;

@Slf4j
@RestController
@RequestMapping("/api/auto-payment")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AutoPaymentController {

    private final AutoPaymentService autoPaymentService;

    /**
     * 자동결제 설정
     */
    @PostMapping("/setup")
    public ResponseEntity<ApiResponse<AutoTransferContractInfo>> setupAutoPayment(
            @RequestBody AutoPaymentSetupRequest request,
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("사용자 인증이 필요합니다.")
                );
            }

            boolean result = autoPaymentService.setupAutoPayment(
                userId, 
                request.getContractId(),
                request.getFromAccount(),
                request.getAmount(),
                request.getTransferDay()
            );

            if (result) {
                // 설정된 자동결제 정보 조회
                AutoTransferContractInfo contractInfo = autoPaymentService.getAutoPaymentInfo(userId);
                return ResponseEntity.ok(ApiResponse.success("자동결제가 성공적으로 설정되었습니다.", contractInfo));
            } else {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("자동결제 설정에 실패했습니다.")
                );
            }

        } catch (Exception e) {
            log.error("자동결제 설정 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("자동결제 설정 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 자동결제 해지
     */
    @DeleteMapping("/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelAutoPayment(
            @RequestParam(required = false) Long contractId,
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("사용자 인증이 필요합니다.")
                );
            }

            boolean result = autoPaymentService.cancelAutoPayment(userId, contractId);

            if (result) {
                return ResponseEntity.ok(ApiResponse.success("자동결제가 성공적으로 해지되었습니다.", null));
            } else {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("자동결제 해지에 실패했습니다.")
                );
            }

        } catch (Exception e) {
            log.error("자동결제 해지 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("자동결제 해지 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 자동결제 일시정지
     */
    @PutMapping("/suspend")
    public ResponseEntity<ApiResponse<Void>> suspendAutoPayment(
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("사용자 인증이 필요합니다.")
                );
            }

            boolean result = autoPaymentService.suspendAutoPayment(userId);

            if (result) {
                return ResponseEntity.ok(ApiResponse.success("자동결제가 일시정지되었습니다.", null));
            } else {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("자동결제 일시정지에 실패했습니다.")
                );
            }

        } catch (Exception e) {
            log.error("자동결제 일시정지 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("자동결제 일시정지 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 자동결제 재개
     */
    @PutMapping("/resume")
    public ResponseEntity<ApiResponse<Void>> resumeAutoPayment(
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("사용자 인증이 필요합니다.")
                );
            }

            boolean result = autoPaymentService.resumeAutoPayment(userId);

            if (result) {
                return ResponseEntity.ok(ApiResponse.success("자동결제가 재개되었습니다.", null));
            } else {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("자동결제 재개에 실패했습니다.")
                );
            }

        } catch (Exception e) {
            log.error("자동결제 재개 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("자동결제 재개 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 자동결제 정보 조회
     */
    @GetMapping("/info")
    public ResponseEntity<ApiResponse<AutoTransferContractInfo>> getAutoPaymentInfo(
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("사용자 인증이 필요합니다.")
                );
            }

            AutoTransferContractInfo contractInfo = autoPaymentService.getAutoPaymentInfo(userId);

            return ResponseEntity.ok(ApiResponse.success("자동결제 정보를 성공적으로 조회했습니다.", contractInfo));

        } catch (Exception e) {
            log.error("자동결제 정보 조회 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("자동결제 정보 조회 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 자동결제 설정 여부 확인
     */
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Boolean>> getAutoPaymentStatus(
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("사용자 인증이 필요합니다.")
                );
            }

            boolean hasAutoPayment = autoPaymentService.hasAutoPayment(userId);

            return ResponseEntity.ok(ApiResponse.success("자동결제 설정 여부를 확인했습니다.", hasAutoPayment));

        } catch (Exception e) {
            log.error("자동결제 상태 확인 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("자동결제 상태 확인 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 자동결제 금액 수정
     */
    @PutMapping("/amount")
    public ResponseEntity<ApiResponse<Void>> updateAutoPaymentAmount(
            @RequestBody AutoPaymentUpdateRequest request,
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("사용자 인증이 필요합니다.")
                );
            }

            boolean result = autoPaymentService.updateAutoPaymentAmount(userId, request.getNewAmount());

            if (result) {
                return ResponseEntity.ok(ApiResponse.success("자동결제 금액이 성공적으로 수정되었습니다.", null));
            } else {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("자동결제 금액 수정에 실패했습니다.")
                );
            }

        } catch (Exception e) {
            log.error("자동결제 금액 수정 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("자동결제 금액 수정 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 자동결제 실행 이력 조회
     */
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<Object>> getAutoPaymentHistory(
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("사용자 인증이 필요합니다.")
                );
            }

            Object history = autoPaymentService.getAutoPaymentHistory(userId);

            return ResponseEntity.ok(ApiResponse.success("자동결제 실행 이력을 성공적으로 조회했습니다.", history));

        } catch (Exception e) {
            log.error("자동결제 이력 조회 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("자동결제 이력 조회 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    /**
     * 자동결제 목록 조회 (관리 화면용)
     */
    @GetMapping("/payment-list")
    public ResponseEntity<ApiResponse<List<AutoPaymentDetailDto>>> getAutoPaymentList(
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("사용자 인증이 필요합니다.")
                );
            }

            List<AutoPaymentDetailDto> autoPaymentList = autoPaymentService.getAutoPaymentList(userId);

            return ResponseEntity.ok(ApiResponse.success("자동결제 목록을 성공적으로 조회했습니다.", autoPaymentList));

        } catch (Exception e) {
            log.error("자동결제 목록 조회 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("자동결제 목록 조회 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> checkAutoPaymentHealth(
            HttpServletRequest httpRequest) {

        try {
            Long userId = (Long) httpRequest.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("사용자 인증이 필요합니다.")
                );
            }

            boolean isHealthy = autoPaymentService.checkServiceHealth();

            if (isHealthy) {
                return ResponseEntity.ok(ApiResponse.success("자동결제 서비스가 정상 작동 중입니다.", "HEALTHY"));
            } else {
                return ResponseEntity.internalServerError().body(
                    ApiResponse.error("자동결제 서비스에 문제가 있습니다.")
                );
            }

        } catch (Exception e) {
            log.error("자동결제 서비스 상태 확인 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("자동결제 서비스 상태 확인 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }
}