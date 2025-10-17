package com.example.hana_bank.controller;

import com.example.hana_bank.dto.ApiResponseDto;
import com.example.hana_bank.dto.LoanApplicationListDto;
import com.example.hana_bank.dto.LoanReviewRequestDto;
import com.example.hana_bank.service.LoanAdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/admin-loan")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class LoanAdminController {

    private final LoanAdminService loanAdminService;


    @GetMapping("/applications")
    public ResponseEntity<ApiResponseDto<List<LoanApplicationListDto>>> getLoanApplicationList() {
        try {
            List<LoanApplicationListDto> applications = loanAdminService.getLoanApplicationList();
            return ResponseEntity.ok(ApiResponseDto.success(applications));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }

    @GetMapping("/applications/{id}")
    public ResponseEntity<ApiResponseDto<LoanApplicationListDto>> getLoanApplicationDetail(@PathVariable Long id) {
        try {
            LoanApplicationListDto application = loanAdminService.getLoanApplicationDetail(id);
            return ResponseEntity.ok(ApiResponseDto.success(application));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }

    @PutMapping("/applications/{id}/review")
    public ResponseEntity<ApiResponseDto<String>> reviewLoanApplication(
            @PathVariable Long id,
            @RequestBody LoanReviewRequestDto request) {
        try {
            loanAdminService.reviewLoanApplication(id, request);
            return ResponseEntity.ok(ApiResponseDto.success("검토가 완료되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }

    @PostMapping("/contracts")
    public ResponseEntity<ApiResponseDto<String>> createLoanContract(@RequestBody java.util.Map<String, Object> contractRequest) {
        try {
            String contractNumber = loanAdminService.createLoanContract(contractRequest);
            return ResponseEntity.ok(ApiResponseDto.success(contractNumber));
        } catch (Exception e) {
            log.error("대출 계약 생성 실패: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }

    @PostMapping("/payments/execute")
    public ResponseEntity<ApiResponseDto<String>> executeLoanPayment(@RequestBody java.util.Map<String, Object> paymentRequest) {
        try {
            String transactionId = loanAdminService.executeLoanPayment(paymentRequest);
            return ResponseEntity.ok(ApiResponseDto.success(transactionId));
        } catch (Exception e) {
            log.error("대출 실행 실패: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }

    @GetMapping("/contracts/{contractNumber}")
    public ResponseEntity<ApiResponseDto<?>> getLoanContract(@PathVariable String contractNumber) {
        try {
            var contract = loanAdminService.getLoanContract(contractNumber);
            return ResponseEntity.ok(ApiResponseDto.success(contract));
        } catch (Exception e) {
            log.error("계약 조회 실패: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }

    @GetMapping("/contracts/check/{applicationId}")
    public ResponseEntity<ApiResponseDto<?>> checkContractByApplicationId(@PathVariable String applicationId) {
        try {
            var contract = loanAdminService.getContractByApplicationId(applicationId);
            if (contract != null) {
                return ResponseEntity.ok(ApiResponseDto.success(contract));
            } else {
                return ResponseEntity.ok(ApiResponseDto.success(null));
            }
        } catch (Exception e) {
            log.error("계약 확인 실패: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }

    @GetMapping("/payments/history")
    public ResponseEntity<ApiResponseDto<?>> getLoanPaymentHistory() {
        try {
            var payments = loanAdminService.getAllLoanPayments();
            return ResponseEntity.ok(ApiResponseDto.success(payments));
        } catch (Exception e) {
            log.error("대출 송금 내역 조회 실패: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
}