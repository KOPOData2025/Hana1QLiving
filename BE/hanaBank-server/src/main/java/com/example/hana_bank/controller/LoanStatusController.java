package com.example.hana_bank.controller;

import com.example.hana_bank.dto.LoanStatusResponseDto;
import com.example.hana_bank.service.LoanStatusService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/loan")
@RequiredArgsConstructor
@Tag(name = "대출 상황 조회", description = "사용자별 대출 진행 상황 조회 API")
public class LoanStatusController {
    
    private final LoanStatusService loanStatusService;
    
    @GetMapping("/status")
    @Operation(
        summary = "대출 상황 조회",
        description = "사용자의 대출 신청 진행 상황을 조회합니다."
    )
    public ResponseEntity<LoanStatusResponseDto> getLoanStatus(
        @Parameter(description = "사용자 CI", example = "HANA_20990621_M_61f728f7")
        @RequestParam(value = "user_ci", defaultValue = "HANA_20990621_M_61f728f7") String userCi
    ) {
        try {
            LoanStatusResponseDto response = loanStatusService.getLoanStatus(userCi);
            
            if (response.isSuccess()) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body(response);
            }
            
        } catch (Exception e) {
            LoanStatusResponseDto errorResponse = LoanStatusResponseDto.error(
                "INTERNAL_ERROR", 
                "대출 상황 조회 중 오류가 발생했습니다: " + e.getMessage()
            );
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
}
