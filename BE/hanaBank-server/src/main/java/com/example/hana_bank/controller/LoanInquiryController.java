package com.example.hana_bank.controller;

import com.example.hana_bank.dto.LoanInquiryRequestDto;
import com.example.hana_bank.dto.LoanInquiryResponseDto;
import com.example.hana_bank.service.LoanInquiryService;
import com.example.hana_bank.service.UserService;
import com.example.hana_bank.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
// Spring Security 제거
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/loan")
@RequiredArgsConstructor
@Tag(name = "대출 한도 조회", description = "전월세보증금대출 한도조회 API")
public class LoanInquiryController {

    private final LoanInquiryService loanInquiryService;
    private final UserService userService;

    @PostMapping("/inquiry")
    @Operation(summary = "전월세보증금대출 한도조회", description = "전월세보증금대출 한도를 조회합니다. 로그인 선택사항.")
    public ResponseEntity<LoanInquiryResponseDto> inquireLoanLimit(
            @Valid @RequestBody LoanInquiryRequestDto requestDto) {
        try {
            User user = null;
            // 토이프로젝트용 - 인증 제거
            user = userService.findByUsername("admin")
                    .orElse(null);

            LoanInquiryResponseDto response = loanInquiryService.processLoanInquiry(requestDto, user);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            LoanInquiryResponseDto errorResponse = new LoanInquiryResponseDto(false, e.getMessage(), null);
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
}
