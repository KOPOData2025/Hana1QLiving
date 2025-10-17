package com.example.hana_bank.controller;

import com.example.hana_bank.dto.ApiResponseDto;
import com.example.hana_bank.dto.LoanContractDto;
import com.example.hana_bank.dto.SimpleLoanContractDto;
import com.example.hana_bank.dto.AppointmentSlotDto;
import com.example.hana_bank.entity.LoanContract;
import com.example.hana_bank.service.LoanContractService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/loan")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "대출 계약", description = "하나원큐리빙에서 전송되는 대출 계약 관련 API")
public class LoanContractController {
    
    private final LoanContractService loanContractService;
    
    @PostMapping("/contract")
    @Operation(summary = "대출 계약서 수신", description = "하나원큐리빙에서 전송한 대출 계약 정보를 수신합니다.")
    public ResponseEntity<String> receiveLoanContract(@RequestBody SimpleLoanContractDto contractDto) {
        try {
            String referenceNumber = loanContractService.processSimpleContract(contractDto);
            return ResponseEntity.ok(referenceNumber);
        } catch (Exception e) {
            log.error("대출 계약서 처리 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body("계약서 처리에 실패했습니다.");
        }
    }
    
    @GetMapping("/appointment-slots")
    @Operation(summary = "예약 가능한 시간 조회", description = "계약 체결을 위한 예약 가능한 시간 슬롯을 조회합니다.")
    public ResponseEntity<ApiResponseDto<List<AppointmentSlotDto>>> getAvailableSlots(
            @Parameter(description = "날짜 (YYYY-MM-DD)") @RequestParam String date) {
        try {
            List<AppointmentSlotDto> slots = loanContractService.getAvailableSlots(date);
            return ResponseEntity.ok(ApiResponseDto.success(slots));
        } catch (Exception e) {
            log.error("예약 가능 시간 조회 실패: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    @GetMapping("/contracts")
    @Operation(summary = "대출 계약 목록 조회", description = "대출 계약 목록을 조회합니다.")
    public ResponseEntity<ApiResponseDto<List<LoanContract>>> getLoanContracts() {
        try {
            List<LoanContract> contracts = loanContractService.getAllContracts();
            return ResponseEntity.ok(ApiResponseDto.success(contracts));
        } catch (Exception e) {
            log.error("대출 계약 목록 조회 실패: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    @PutMapping("/contracts/{id}/status")
    @Operation(summary = "계약 상태 업데이트", description = "대출 계약의 상태를 업데이트합니다.")
    public ResponseEntity<ApiResponseDto<String>> updateContractStatus(
            @Parameter(description = "계약 ID") @PathVariable Long id,
            @Parameter(description = "새로운 상태") @RequestParam String status) {
        try {
            loanContractService.updateContractStatus(id, status);
            return ResponseEntity.ok(ApiResponseDto.success("계약 상태가 업데이트되었습니다."));
        } catch (Exception e) {
            log.error("계약 상태 업데이트 실패: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
}