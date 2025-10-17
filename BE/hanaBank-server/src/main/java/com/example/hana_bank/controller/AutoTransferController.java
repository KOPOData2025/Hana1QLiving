package com.example.hana_bank.controller;

import com.example.hana_bank.dto.ApiResponseDto;
import com.example.hana_bank.dto.AutoTransferRegisterRequest;
import com.example.hana_bank.dto.AutoTransferRegisterResponse;
import com.example.hana_bank.dto.AutoTransferContractDto;
import com.example.hana_bank.dto.AutoTransferHistoryDto;
import com.example.hana_bank.entity.AutoTransferContract;
import com.example.hana_bank.entity.AutoTransferHistory;
import com.example.hana_bank.entity.ImmediateTransferRequest;
import com.example.hana_bank.service.AutoTransferService;
// Swagger annotations removed
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// Validation removed
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/auto-payments")
@RequiredArgsConstructor
public class AutoTransferController {

    private final AutoTransferService autoTransferService;

    /**
     * 자동이체 등록
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponseDto<AutoTransferRegisterResponse>> registerAutoTransfer(
            @RequestBody AutoTransferRegisterRequest request,
            @RequestHeader("X-User-CI") String userCi) {

        try {
            AutoTransferContract contract = convertToEntity(request);
            contract.setUserCi(userCi);
            AutoTransferContract result = autoTransferService.registerAutoTransfer(contract);

            AutoTransferRegisterResponse response = convertToRegisterResponse(result);

            return ResponseEntity.ok(
                ApiResponseDto.<AutoTransferRegisterResponse>builder()
                    .success(true)
                    .message("자동이체가 성공적으로 등록되었습니다.")
                    .data(response)
                    .build()
            );

        } catch (Exception e) {
            log.error("자동이체 등록 실패: 사용자={}, 오류={}", userCi, e.getMessage(), e);

            return ResponseEntity.badRequest().body(
                ApiResponseDto.<AutoTransferRegisterResponse>builder()
                    .success(false)
                    .message("자동이체 등록에 실패했습니다: " + e.getMessage())
                    .build()
            );
        }
    }

    /**
     * 자동이체 해지
     */
    @DeleteMapping("/{contractId}")
    public ResponseEntity<ApiResponseDto<Void>> cancelAutoTransfer(
            @PathVariable Long contractId,
            @RequestHeader("X-User-CI") String userCi) {

        try {
            autoTransferService.cancelAutoTransfer(contractId, userCi);

            return ResponseEntity.ok(
                ApiResponseDto.<Void>builder()
                    .success(true)
                    .message("자동이체가 성공적으로 해지되었습니다.")
                    .build()
            );

        } catch (Exception e) {
            log.error("자동이체 해지 실패: 사용자={}, 계약ID={}, 오류={}", userCi, contractId, e.getMessage(), e);

            return ResponseEntity.badRequest().body(
                ApiResponseDto.<Void>builder()
                    .success(false)
                    .message("자동이체 해지에 실패했습니다: " + e.getMessage())
                    .build()
            );
        }
    }

    /**
     * 자동이체 목록 조회
     */
    @GetMapping("/contracts")
    public ResponseEntity<ApiResponseDto<List<AutoTransferContract>>> getAutoTransferContracts(
            @RequestHeader("X-User-CI") String userCi,
            @RequestParam(defaultValue = "false") boolean activeOnly) {

        try {
            List<AutoTransferContract> contracts;

            if (activeOnly) {
                contracts = autoTransferService.getActiveAutoTransferContracts(userCi);
            } else {
                contracts = autoTransferService.getUserAutoTransferContracts(userCi);
            }

            return ResponseEntity.ok(
                ApiResponseDto.<List<AutoTransferContract>>builder()
                    .success(true)
                    .message("자동이체 목록을 성공적으로 조회했습니다.")
                    .data(contracts)
                    .build()
            );

        } catch (Exception e) {
            log.error("자동이체 목록 조회 실패: 사용자={}, 오류={}", userCi, e.getMessage(), e);

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                ApiResponseDto.<List<AutoTransferContract>>builder()
                    .success(false)
                    .message("자동이체 목록 조회에 실패했습니다: " + e.getMessage())
                    .build()
            );
        }
    }

    @GetMapping("/contracts/{contractId}")
    public ResponseEntity<ApiResponseDto<AutoTransferContract>> getAutoTransferContract(
            @PathVariable Long contractId,
            @RequestHeader("X-User-CI") String userCi) {

        try {
            AutoTransferContract contract = autoTransferService.getAutoTransferContract(contractId, userCi);

            return ResponseEntity.ok(
                ApiResponseDto.<AutoTransferContract>builder()
                    .success(true)
                    .message("자동이체 계약 정보를 성공적으로 조회했습니다.")
                    .data(contract)
                    .build()
            );

        } catch (Exception e) {
            log.error("자동이체 상세 조회 실패: 사용자={}, 계약ID={}, 오류={}", userCi, contractId, e.getMessage(), e);

            return ResponseEntity.badRequest().body(
                ApiResponseDto.<AutoTransferContract>builder()
                    .success(false)
                    .message("자동이체 계약 조회에 실패했습니다: " + e.getMessage())
                    .build()
            );
        }
    }

    @PutMapping("/{contractId}/suspend")
    public ResponseEntity<ApiResponseDto<Void>> suspendAutoTransfer(
            @PathVariable Long contractId,
            @RequestHeader("X-User-CI") String userCi) {

        try {
            autoTransferService.suspendAutoTransfer(contractId, userCi);

            return ResponseEntity.ok(
                ApiResponseDto.<Void>builder()
                    .success(true)
                    .message("자동이체가 일시정지되었습니다.")
                    .build()
            );

        } catch (Exception e) {
            log.error("자동이체 일시정지 실패: 사용자={}, 계약ID={}, 오류={}", userCi, contractId, e.getMessage(), e);

            return ResponseEntity.badRequest().body(
                ApiResponseDto.<Void>builder()
                    .success(false)
                    .message("자동이체 일시정지에 실패했습니다: " + e.getMessage())
                    .build()
            );
        }
    }

    @PutMapping("/{contractId}/resume")
    public ResponseEntity<ApiResponseDto<Void>> resumeAutoTransfer(
            @PathVariable Long contractId,
            @RequestHeader("X-User-CI") String userCi) {

        try {
            autoTransferService.resumeAutoTransfer(contractId, userCi);

            return ResponseEntity.ok(
                ApiResponseDto.<Void>builder()
                    .success(true)
                    .message("자동이체가 재개되었습니다.")
                    .build()
            );

        } catch (Exception e) {
            log.error("자동이체 재개 실패: 사용자={}, 계약ID={}, 오류={}", userCi, contractId, e.getMessage(), e);

            return ResponseEntity.badRequest().body(
                ApiResponseDto.<Void>builder()
                    .success(false)
                    .message("자동이체 재개에 실패했습니다: " + e.getMessage())
                    .build()
            );
        }
    }

    /**
     * 자동이체 실행 이력 조회
     */
    @GetMapping("/history")
    public ResponseEntity<ApiResponseDto<List<AutoTransferHistory>>> getAutoTransferHistory(
            @RequestHeader("X-User-CI") String userCi) {

        try {
            List<AutoTransferHistory> history = autoTransferService.getAutoTransferHistory(userCi);

            return ResponseEntity.ok(
                ApiResponseDto.<List<AutoTransferHistory>>builder()
                    .success(true)
                    .message("자동이체 실행 이력을 성공적으로 조회했습니다.")
                    .data(history)
                    .build()
            );

        } catch (Exception e) {
            log.error("자동이체 이력 조회 실패: 사용자={}, 오류={}", userCi, e.getMessage(), e);

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                ApiResponseDto.<List<AutoTransferHistory>>builder()
                    .success(false)
                    .message("자동이체 실행 이력 조회에 실패했습니다: " + e.getMessage())
                    .build()
            );
        }
    }

    @GetMapping("/contracts/{contractId}/history")
    public ResponseEntity<ApiResponseDto<List<AutoTransferHistory>>> getContractTransferHistory(
            @PathVariable Long contractId,
            @RequestHeader("X-User-CI") String userCi) {

        try {
            List<AutoTransferHistory> history = autoTransferService.getContractTransferHistory(contractId, userCi);

            return ResponseEntity.ok(
                ApiResponseDto.<List<AutoTransferHistory>>builder()
                    .success(true)
                    .message("계약별 자동이체 실행 이력을 성공적으로 조회했습니다.")
                    .data(history)
                    .build()
            );

        } catch (Exception e) {
            log.error("계약별 자동이체 이력 조회 실패: 사용자={}, 계약ID={}, 오류={}", userCi, contractId, e.getMessage(), e);

            return ResponseEntity.badRequest().body(
                ApiResponseDto.<List<AutoTransferHistory>>builder()
                    .success(false)
                    .message("계약별 자동이체 실행 이력 조회에 실패했습니다: " + e.getMessage())
                    .build()
            );
        }
    }

    /**
     * 즉시 이체 실행 API (하나원큐리빙 관리비 청구용)
     */
    @PostMapping("/immediate-transfer")
    public ResponseEntity<ApiResponseDto<AutoTransferRegisterResponse>> executeImmediateTransfer(
            @RequestBody AutoTransferRegisterRequest request,
            @RequestHeader("X-User-CI") String userCi) {

        try {
            AutoTransferContract contract = convertToEntity(request);
            contract.setUserCi(userCi);
            ImmediateTransferRequest result = autoTransferService.executeImmediateTransfer(contract);

            AutoTransferRegisterResponse response = convertToRegisterResponse(result);
            response.setSuccess(true);
            response.setTransactionId(result.getTransactionId());

            return ResponseEntity.ok(
                ApiResponseDto.<AutoTransferRegisterResponse>builder()
                    .success(true)
                    .message("즉시 이체가 성공적으로 실행되었습니다.")
                    .data(response)
                    .build()
            );

        } catch (Exception e) {
            log.error("즉시 이체 실패: 사용자={}, 오류={}", userCi, e.getMessage(), e);

            AutoTransferRegisterResponse failureResponse = AutoTransferRegisterResponse.builder()
                .success(false)
                .transactionId(null)
                .build();

            return ResponseEntity.ok(
                ApiResponseDto.<AutoTransferRegisterResponse>builder()
                    .success(false)
                    .message("즉시 이체 실행에 실패했습니다: " + e.getMessage())
                    .data(failureResponse)
                    .build()
            );
        }
    }

    @PostMapping("/execute/{contractId}")
    public ResponseEntity<ApiResponseDto<Void>> executeAutoTransfer(
            @PathVariable Long contractId,
            @RequestHeader(value = "X-System-Key", required = false) String systemKey) {

        if (!"HANA_SCHEDULER_2024".equals(systemKey)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                ApiResponseDto.<Void>builder()
                    .success(false)
                    .message("권한이 없습니다.")
                    .build()
            );
        }

        try {
            autoTransferService.executeAutoTransfer(contractId);

            return ResponseEntity.ok(
                ApiResponseDto.<Void>builder()
                    .success(true)
                    .message("자동이체가 성공적으로 실행되었습니다.")
                    .build()
            );

        } catch (Exception e) {
            log.error("자동이체 실행 실패: 계약ID={}, 오류={}", contractId, e.getMessage(), e);

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                ApiResponseDto.<Void>builder()
                    .success(false)
                    .message("자동이체 실행에 실패했습니다: " + e.getMessage())
                    .build()
            );
        }
    }
    
    // DTO 변환 메소드들
    private AutoTransferContract convertToEntity(AutoTransferRegisterRequest request) {
        return AutoTransferContract.builder()
                .fromAccount(request.getFromAccount())
                .toAccount(request.getToAccount())
                .toBankCode(request.getToBankCode())
                .toBankName(request.getToBankName())
                .amount(request.getAmount())
                .transferDay(request.getTransferDay())
                .beneficiaryName(request.getBeneficiaryName())
                .memo(request.getMemo())
                .build();
    }
    
    private AutoTransferRegisterResponse convertToRegisterResponse(AutoTransferContract contract) {
        return AutoTransferRegisterResponse.builder()
                .contractId(contract.getId())
                .fromAccount(contract.getFromAccount())
                .toAccount(contract.getToAccount())
                .toBankCode(contract.getToBankCode())
                .toBankName(contract.getToBankName())
                .amount(contract.getAmount())
                .transferDay(contract.getTransferDay())
                .beneficiaryName(contract.getBeneficiaryName())
                .memo(contract.getMemo())
                .nextTransferDate(contract.getNextTransferDate())
                .status(contract.getStatus())
                .createdAt(contract.getCreatedAt())
                .updatedAt(contract.getUpdatedAt())
                .build();
    }

    private AutoTransferRegisterResponse convertToRegisterResponse(ImmediateTransferRequest request) {
        return AutoTransferRegisterResponse.builder()
                .contractId(request.getId())
                .fromAccount(request.getFromAccount())
                .toAccount(request.getToAccount())
                .toBankCode(request.getToBankCode())
                .toBankName(request.getToBankName())
                .amount(request.getAmount())
                .transferDay(null) // 즉시 이체는 이체일이 없음
                .beneficiaryName(request.getBeneficiaryName())
                .memo(request.getMemo())
                .nextTransferDate(null) // 즉시 이체는 다음 이체일이 없음
                .status(request.getStatus())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .build();
    }
    
    private AutoTransferContractDto convertToContractDto(AutoTransferContract contract) {
        return AutoTransferContractDto.builder()
                .id(contract.getId())
                .userCi(contract.getUserCi())
                .fromAccount(contract.getFromAccount())
                .toAccount(contract.getToAccount())
                .toBankCode(contract.getToBankCode())
                .toBankName(contract.getToBankName())
                .amount(contract.getAmount())
                .transferDay(contract.getTransferDay())
                .beneficiaryName(contract.getBeneficiaryName())
                .memo(contract.getMemo())
                .nextTransferDate(contract.getNextTransferDate())
                .status(contract.getStatus())
                .createdAt(contract.getCreatedAt())
                .updatedAt(contract.getUpdatedAt())
                .build();
    }
    
    private AutoTransferHistoryDto convertToHistoryDto(AutoTransferHistory history) {
        return AutoTransferHistoryDto.builder()
                .id(history.getId())
                .contractId(history.getContractId())
                .executionDate(history.getExecutionDate())
                .scheduledDate(history.getScheduledDate())
                .amount(history.getAmount())
                .status(history.getStatus())
                .transactionId(history.getTransactionId())
                .failureReason(history.getFailureReason())
                .retryCount(history.getRetryCount())
                .createdAt(history.getCreatedAt())
                .updatedAt(history.getUpdatedAt())
                .build();
    }
}