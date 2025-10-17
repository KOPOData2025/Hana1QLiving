package com.example.hana_bank.controller;

import com.example.hana_bank.dto.LoanApplicationRequestDto;
import com.example.hana_bank.dto.LoanApplicationResponseDto;
import com.example.hana_bank.service.LoanApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/loan")
@RequiredArgsConstructor
@Tag(name = "대출 심사 신청", description = "전세대출 심사 신청 API")
public class LoanApplicationController {

    private final LoanApplicationService loanApplicationService;

    @PostMapping("/application")
    @Operation(summary = "대출 심사 신청", description = "전세대출 심사 신청을 처리합니다.")
    public ResponseEntity<LoanApplicationResponseDto> submitLoanApplication(
            @RequestBody LoanApplicationRequestDto requestDto) {
        
        
        // 서비스 호출
        LoanApplicationResponseDto response = loanApplicationService.processLoanApplication(requestDto);
        
        // 응답 상태 코드 결정
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
}
