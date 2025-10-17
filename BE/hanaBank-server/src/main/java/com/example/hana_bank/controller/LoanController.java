package com.example.hana_bank.controller;

import com.example.hana_bank.dto.ApiResponseDto;
import com.example.hana_bank.dto.LoanApplicationDto;
import com.example.hana_bank.dto.LoanRepaymentDto;

import com.example.hana_bank.entity.Loan;
import com.example.hana_bank.entity.LoanProduct;
import com.example.hana_bank.entity.LoanRepayment;
import com.example.hana_bank.service.LoanProductService;
import com.example.hana_bank.service.LoanService;

import com.example.hana_bank.entity.User;
import com.example.hana_bank.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
// Swagger Security 제거
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
// Spring Security 제거
import org.springframework.web.bind.annotation.*;


import java.util.List;

@RestController
@RequestMapping("/customer/loans")
@RequiredArgsConstructor
// Bearer Authentication 제거
@Tag(name = "대출 관리", description = "고객 대출 관련 API")
public class LoanController {
    
    private final LoanService loanService;
    private final LoanProductService loanProductService;
    private final UserService userService;
    
    @GetMapping("/products")
    @Operation(summary = "대출 상품 목록 조회", description = "이용 가능한 모든 대출 상품을 조회합니다.")

    public ResponseEntity<ApiResponseDto<List<LoanProduct>>> getLoanProducts() {
        try {
            List<LoanProduct> products = loanProductService.getActiveLoanProducts();
            return ResponseEntity.ok(ApiResponseDto.success(products));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    @PostMapping("/apply")
    @Operation(summary = "대출 신청", description = "선택한 대출 상품에 대해 대출을 신청합니다.")

    public ResponseEntity<ApiResponseDto<Loan>> applyForLoan(
            @RequestBody LoanApplicationDto dto) {
        try {
            Loan loan = loanService.applyForLoan(dto, "admin"); // 토이프로젝트용 하드코딩
            return ResponseEntity.ok(ApiResponseDto.success("대출 신청이 완료되었습니다.", loan));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    @GetMapping
    @Operation(summary = "내 대출 목록 조회", description = "로그인한 사용자의 모든 대출을 조회합니다.")

    public ResponseEntity<ApiResponseDto<List<Loan>>> getMyLoans() {
        try {
            String username = "admin"; // 토이프로젝트용 하드코딩
            User user = userService.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
            List<Loan> loans = loanService.getLoansByUserCi(user.getUserCi());
            return ResponseEntity.ok(ApiResponseDto.success(loans));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    @PostMapping("/repay")
    @Operation(summary = "대출 상환", description = "대출금을 상환합니다.")

    public ResponseEntity<ApiResponseDto<LoanRepayment>> repayLoan(
            @RequestBody LoanRepaymentDto dto) {
        try {
            LoanRepayment repayment = loanService.repayLoan(dto, "admin"); // 토이프로젝트용 하드코딩
            return ResponseEntity.ok(ApiResponseDto.success("대출 상환이 완료되었습니다.", repayment));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    @GetMapping("/{loanId}/repayments")
    @Operation(summary = "대출 상환 내역 조회", description = "특정 대출의 상환 내역을 조회합니다.")

    public ResponseEntity<ApiResponseDto<List<LoanRepayment>>> getLoanRepayments(
            @Parameter(description = "대출 ID") @PathVariable Long loanId) {
        try {
            List<LoanRepayment> repayments = loanService.getRepaymentsByLoanId(loanId);
            return ResponseEntity.ok(ApiResponseDto.success(repayments));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
}
