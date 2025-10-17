package com.example.hana_bank.controller;

import com.example.hana_bank.dto.ApiResponseDto;
import com.example.hana_bank.dto.LoanCreateDto;
import com.example.hana_bank.dto.LoanProductCreateDto;
import com.example.hana_bank.entity.Account;
import com.example.hana_bank.entity.Loan;
import com.example.hana_bank.entity.LoanProduct;
import com.example.hana_bank.entity.User;
import com.example.hana_bank.service.AccountService;
import com.example.hana_bank.service.LoanProductService;
import com.example.hana_bank.service.LoanService;
import com.example.hana_bank.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
// Swagger Security 제거
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
// Spring Security 완전 제거
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
// Bearer Authentication 제거
@Tag(name = "관리자", description = "관리자 전용 API")
public class AdminController {
    
    private final UserService userService;
    private final AccountService accountService;
    private final LoanProductService loanProductService;
    private final LoanService loanService;
    
    // 사용자 관리
    @GetMapping("/users")
    @Operation(summary = "전체 사용자 조회", description = "모든 사용자 정보를 조회합니다.")

    public ResponseEntity<ApiResponseDto<List<User>>> getAllUsers() {
        try {
            List<User> users = userService.getAllUsers();
            return ResponseEntity.ok(ApiResponseDto.success(users));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    @DeleteMapping("/users/{userCi}")
    @Operation(summary = "사용자 삭제", description = "특정 사용자를 삭제합니다.")

    public ResponseEntity<ApiResponseDto<String>> deleteUser(
            @Parameter(description = "사용자 CI") @PathVariable String userCi) {
        try {
            userService.deleteUser(userCi);
            return ResponseEntity.ok(ApiResponseDto.success("사용자가 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    // 계좌 관리
    @GetMapping("/accounts")
    @Operation(summary = "전체 계좌 조회", description = "모든 계좌 정보를 조회합니다.")

    public ResponseEntity<ApiResponseDto<List<Account>>> getAllAccounts() {
        try {
            List<Account> accounts = accountService.getAllAccounts();
            return ResponseEntity.ok(ApiResponseDto.success(accounts));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    @DeleteMapping("/accounts/{accountId}")
    @Operation(summary = "계좌 삭제", description = "특정 계좌를 삭제합니다.")

    public ResponseEntity<ApiResponseDto<String>> deleteAccount(
            @Parameter(description = "계좌 ID") @PathVariable Long accountId) {
        try {
            accountService.deleteAccount(accountId);
            return ResponseEntity.ok(ApiResponseDto.success("계좌가 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    // 대출 상품 관리
    @PostMapping("/loan-products")
    @Operation(summary = "대출 상품 등록", description = "새로운 대출 상품을 등록합니다.")
    public ResponseEntity<ApiResponseDto<LoanProduct>> createLoanProduct(
            @RequestBody LoanProductCreateDto dto) {
        try {
            LoanProduct created = loanProductService.createLoanProductFromDto(dto);
            return ResponseEntity.ok(ApiResponseDto.success("대출 상품이 등록되었습니다.", created));
        } catch (Exception e) {
            log.error("대출상품 생성 실패: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    @GetMapping("/loan-products")
    @Operation(summary = "전체 대출 상품 조회", description = "모든 대출 상품을 조회합니다.")
    public ResponseEntity<ApiResponseDto<List<LoanProduct>>> getAllLoanProducts() {
        try {
            List<LoanProduct> products = loanProductService.getAllLoanProducts();
            return ResponseEntity.ok(ApiResponseDto.success(products));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    @PutMapping("/loan-products/{productId}")
    @Operation(summary = "대출 상품 수정", description = "기존 대출 상품을 수정합니다.")

    public ResponseEntity<ApiResponseDto<String>> updateLoanProduct(
            @Parameter(description = "상품 ID") @PathVariable Long productId,
            @RequestBody LoanProduct loanProduct) {
        try {
            loanProduct.setProductId(productId);
            loanProductService.updateLoanProduct(loanProduct);
            return ResponseEntity.ok(ApiResponseDto.success("대출 상품이 수정되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    @DeleteMapping("/loan-products/{productId}")
    @Operation(summary = "대출 상품 삭제", description = "특정 대출 상품을 삭제합니다.")

    public ResponseEntity<ApiResponseDto<String>> deleteLoanProduct(
            @Parameter(description = "상품 ID") @PathVariable Long productId) {
        try {
            loanProductService.deleteLoanProduct(productId);
            return ResponseEntity.ok(ApiResponseDto.success("대출 상품이 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    // 대출 관리
    @GetMapping("/loans")
    @Operation(summary = "전체 대출 조회", description = "모든 대출 정보를 조회합니다.")

    public ResponseEntity<ApiResponseDto<List<Loan>>> getAllLoans() {
        try {
            List<Loan> loans = loanService.getAllLoans();
            return ResponseEntity.ok(ApiResponseDto.success(loans));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    @DeleteMapping("/loans/{loanId}")
    @Operation(summary = "대출 삭제", description = "특정 대출을 삭제합니다.")

    public ResponseEntity<ApiResponseDto<String>> deleteLoan(
            @Parameter(description = "대출 ID") @PathVariable Long loanId) {
        try {
            loanService.deleteLoan(loanId);
            return ResponseEntity.ok(ApiResponseDto.success("대출이 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }

    // 대출 생성
    @PostMapping("/loans/create")
    @Operation(summary = "대출 생성", description = "관리자가 직접 대출을 생성합니다.")

    public ResponseEntity<ApiResponseDto<Loan>> createLoan(@RequestBody LoanCreateDto dto) {
        try {
            Loan loan = loanService.createLoanByAdmin(dto);
            return ResponseEntity.ok(ApiResponseDto.success("대출이 생성되었습니다.", loan));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponseDto.error(e.getMessage()));
        }
    }
}
