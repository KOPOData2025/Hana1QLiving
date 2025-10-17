package com.living.hana.controller;

import com.living.hana.dto.ApiResponse;
import com.living.hana.entity.LinkedBankAccount;
import com.living.hana.service.BankAccountService;
import com.living.hana.service.MyAccountService;
import com.living.hana.service.HanabankAccountService;
import com.living.hana.dto.MyAccountsResponseDto;
import com.living.hana.dto.TransactionHistoryResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/bank-accounts")
@RequiredArgsConstructor
@Slf4j
public class BankAccountController {
    
    private final BankAccountService bankAccountService;
    private final MyAccountService myAccountService;
    private final HanabankAccountService hanabankAccountService;
    
    @GetMapping
    public ResponseEntity<ApiResponse<List<LinkedBankAccount>>> getLinkedAccounts(
            @RequestParam Long userId) {
        try {
            List<LinkedBankAccount> accounts = bankAccountService.getLinkedAccountsByUserId(userId);
            return ResponseEntity.ok(ApiResponse.successWithMessage(accounts, "연결된 계좌 목록 조회 성공"));
        } catch (Exception e) {
            log.error("연결된 계좌 목록 조회 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("연결된 계좌 목록 조회에 실패했습니다: " + e.getMessage()));
        }
    }
    
    @PostMapping("/link")
    public ResponseEntity<ApiResponse<LinkedBankAccount>> linkAccount(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String userCi,
            @RequestParam(required = false) String accountNumber) {
        try {
            log.info("[BANK_ACCOUNT] 계좌 연결 요청 수신: userId={}, userCi={}, accountNumber={}", userId, userCi, accountNumber);

            // 파라미터 유효성 검사
            if (userId == null) {
                log.error("[BANK_ACCOUNT] userId가 null입니다");
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("userId가 필요합니다"));
            }
            if (userCi == null || userCi.trim().isEmpty()) {
                log.error("[BANK_ACCOUNT] userCi가 null이거나 비어있습니다");
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("userCi가 필요합니다"));
            }
            if (accountNumber == null || accountNumber.trim().isEmpty()) {
                log.error("[BANK_ACCOUNT] accountNumber가 null이거나 비어있습니다");
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("accountNumber가 필요합니다"));
            }

            LinkedBankAccount linkedAccount = bankAccountService.linkBankAccount(userId, userCi, accountNumber);
            log.info("[BANK_ACCOUNT] 계좌 연결 성공: linkedAccountId={}", linkedAccount.getId());
            return ResponseEntity.ok(ApiResponse.successWithMessage(linkedAccount, "계좌 연결 성공"));
        } catch (Exception e) {
            log.error("[BANK_ACCOUNT] 계좌 연결 실패: userId={}, accountNumber={}, error={}", userId, accountNumber, e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("계좌 연결에 실패했습니다: " + e.getMessage()));
        }
    }
    
    @DeleteMapping("/unlink")
    public ResponseEntity<ApiResponse<Void>> unlinkAccount(
            @RequestParam Long userId,
            @RequestParam String accountNumber) {
        try {
            bankAccountService.unlinkBankAccount(userId, accountNumber);
            return ResponseEntity.ok(ApiResponse.successWithMessage(null, "계좌 연결 해제 성공"));
        } catch (Exception e) {
            log.error("계좌 연결 해제 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("계좌 연결 해제에 실패했습니다: " + e.getMessage()));
        }
    }

    @GetMapping("/available")
    public ResponseEntity<ApiResponse<List<MyAccountsResponseDto.BankAccountDto>>> getAvailableAccounts(
            @RequestParam String userCi) {
        try {
            List<MyAccountsResponseDto.BankAccountDto> accounts = myAccountService.getAvailableBankAccounts(userCi);
            return ResponseEntity.ok(ApiResponse.successWithMessage(accounts, "사용 가능한 계좌 목록 조회 성공"));
        } catch (Exception e) {
            log.error("사용 가능한 계좌 목록 조회 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("사용 가능한 계좌 목록 조회에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 계좌 거래내역 조회 (최근)
     */
    @GetMapping("/{accountNumber}/transactions/recent")
    public ResponseEntity<TransactionHistoryResponse> getRecentTransactions(
            @PathVariable String accountNumber,
            @RequestParam(defaultValue = "10") Integer limit) {
        try {
            log.info("계좌 최근 거래내역 조회 요청: accountNumber={}, limit={}", accountNumber, limit);
            TransactionHistoryResponse response = hanabankAccountService.getRecentTransactions(accountNumber, limit);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("계좌 최근 거래내역 조회 실패", e);
            return ResponseEntity.ok(TransactionHistoryResponse.builder()
                    .success(false)
                    .message("거래내역 조회에 실패했습니다: " + e.getMessage())
                    .transactions(List.of())
                    .totalCount(0)
                    .build());
        }
    }

    /**
     * 계좌 거래내역 조회 (전체)
     */
    @GetMapping("/{accountNumber}/transactions")
    public ResponseEntity<TransactionHistoryResponse> getTransactions(
            @PathVariable String accountNumber,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer offset) {
        try {
            log.info("계좌 거래내역 조회 요청: accountNumber={}, limit={}, offset={}", accountNumber, limit, offset);
            TransactionHistoryResponse response = hanabankAccountService.getAccountTransactions(accountNumber, limit, offset);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("계좌 거래내역 조회 실패", e);
            return ResponseEntity.ok(TransactionHistoryResponse.builder()
                    .success(false)
                    .message("거래내역 조회에 실패했습니다: " + e.getMessage())
                    .transactions(List.of())
                    .totalCount(0)
                    .build());
        }
    }
}