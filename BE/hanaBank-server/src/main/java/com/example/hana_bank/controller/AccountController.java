package com.example.hana_bank.controller;

import com.example.hana_bank.dto.AccountCreateDto;
import com.example.hana_bank.dto.ApiResponseDto;
import com.example.hana_bank.dto.AccountDto;
import com.example.hana_bank.dto.AccountsResponseDto;
import com.example.hana_bank.entity.Account;
import com.example.hana_bank.entity.AccountTransaction;
import com.example.hana_bank.service.AccountService;
import com.example.hana_bank.service.AccountTransactionService;
import com.example.hana_bank.service.UserService;
import com.example.hana_bank.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
// Swagger Security 제거
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
// Spring Security 제거
import org.springframework.web.bind.annotation.*;


import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/customer/accounts")
@RequiredArgsConstructor
// Bearer Authentication 제거
@Tag(name = "계좌 관리", description = "고객 계좌 관련 API")
public class AccountController {
    
    private final AccountService accountService;
    private final AccountTransactionService accountTransactionService;
    private final UserService userService;
    
    @PostMapping
    @Operation(summary = "계좌 생성", description = "하나인증서를 통한 본인인증으로 새 계좌를 생성합니다.")

    public ResponseEntity<ApiResponseDto<Account>> createAccount(
            @RequestBody AccountCreateDto dto) {
        try {
            Account account = accountService.createAccount(dto, "admin"); // 토이프로젝트용 하드코딩
            return ResponseEntity.ok(ApiResponseDto.success("계좌가 성공적으로 생성되었습니다.", account));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    @PostMapping("/create-by-userci")
    @Operation(summary = "UserCI로 계좌 생성", description = "하나원큐리빙에서 UserCI로 직접 계좌를 생성합니다.")
    public ResponseEntity<ApiResponseDto<Account>> createAccountByUserCi(
            @RequestBody Map<String, Object> request) {
        try {
            String userCi = (String) request.get("userCi");
            String accountType = (String) request.get("accountType");
            String accountPassword = (String) request.get("accountPassword");
            String accountName = (String) request.get("accountName");
            
            BigDecimal initialBalance = BigDecimal.ZERO;
            if (request.get("initialBalance") != null) {
                initialBalance = new BigDecimal(request.get("initialBalance").toString());
            }
            
            Account account = accountService.createAccountByUserCi(
                userCi, accountType, accountPassword, initialBalance, accountName);
            
            return ResponseEntity.ok(ApiResponseDto.success("계좌가 성공적으로 생성되었습니다.", account));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    @GetMapping
    @Operation(summary = "내 계좌 목록 조회", description = "로그인한 사용자의 모든 계좌를 조회합니다.")

    public ResponseEntity<ApiResponseDto<List<Account>>> getMyAccounts() {
        try {
            String username = "admin";

            User user = userService.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

            List<Account> accounts = accountService.getAccountsByUserCi(user.getUserCi());

            return ResponseEntity.ok(ApiResponseDto.success(accounts));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    @GetMapping("/{accountNumber}")
    @Operation(summary = "계좌 조회", description = "계좌번호로 계좌 정보를 조회합니다.")

    public ResponseEntity<ApiResponseDto<Account>> getAccount(
            @Parameter(description = "계좌번호") @PathVariable String accountNumber) {
        try {
            Account account = accountService.getAccountByNumber(accountNumber)
                    .orElseThrow(() -> new RuntimeException("계좌를 찾을 수 없습니다."));
            return ResponseEntity.ok(ApiResponseDto.success(account));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    @PostMapping("/{accountNumber}/validate")
    @Operation(summary = "계좌 비밀번호 검증", description = "계좌번호와 비밀번호로 계좌를 인증합니다.")

    public ResponseEntity<ApiResponseDto<Boolean>> validateAccount(
            @Parameter(description = "계좌번호") @PathVariable String accountNumber,
            @Parameter(description = "계좌 비밀번호") @RequestParam String password) {
        try {
            boolean isValid = accountService.validateAccountPassword(accountNumber, password);
            if (isValid) {
                return ResponseEntity.ok(ApiResponseDto.success("계좌 인증에 성공했습니다.", true));
            } else {
                return ResponseEntity.badRequest()
                        .body(ApiResponseDto.error("계좌 인증에 실패했습니다."));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }

    @GetMapping("/v1")
    @Operation(summary = "하나은행 계좌 조회", description = "고정된 유저CI로 계좌 정보를 조회합니다.")
    public ResponseEntity<ApiResponseDto<Object>> getHanaBankAccounts() {
        try {
            // 고정된 유저CI 사용
            String fixedUserCi = "HANA_20990621_M_61f728f7";
            
            List<Account> accounts = accountService.getAccountsByUserCi(fixedUserCi);
            
            // 응답 데이터 구조 생성
            AccountsResponseDto response = AccountsResponseDto.builder()
                    .success(true)
                    .accounts(accounts.stream()
                            .map(this::convertToAccountDto)
                            .collect(Collectors.toList()))
                    .totalCount(accounts.size())
                    .build();
            
            return ResponseEntity.ok(ApiResponseDto.success("계좌 조회가 완료되었습니다.", response));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error(e.getMessage()));
        }
    }
    
    @GetMapping("/validate/{accountNumber}")
    @Operation(summary = "계좌 연동 검증", description = "하나원큐리빙에서 계좌 연동 시 계좌 유효성을 검증합니다.")
    public ResponseEntity<ApiResponseDto<AccountDto>> validateAccountForLinking(
            @Parameter(description = "계좌번호") @PathVariable String accountNumber,
            @Parameter(description = "사용자 CI") @RequestParam String userCi) {
        try {
            // 계좌 존재 여부 확인
            Account account = accountService.getAccountByNumber(accountNumber)
                    .orElseThrow(() -> new RuntimeException("계좌를 찾을 수 없습니다."));
            
            // 사용자 CI 매칭 확인
            if (!userCi.equals(account.getUserCi())) {
                return ResponseEntity.badRequest()
                        .body(ApiResponseDto.error("해당 계좌의 소유자가 아닙니다."));
            }
            
            // 계좌 상태 확인
            if (!"ACTIVE".equals(account.getStatus())) {
                return ResponseEntity.badRequest()
                        .body(ApiResponseDto.error("비활성화된 계좌입니다."));
            }
            
            AccountDto accountDto = convertToAccountDto(account);
            return ResponseEntity.ok(ApiResponseDto.success("계좌 검증 성공", accountDto));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error("계좌 검증 실패: " + e.getMessage()));
        }
    }
    
    @GetMapping("/info/{accountNumber}")
    @Operation(summary = "계좌 정보 조회", description = "연동된 계좌의 상세 정보를 조회합니다.")
    public ResponseEntity<ApiResponseDto<AccountDto>> getAccountInfo(
            @Parameter(description = "계좌번호") @PathVariable String accountNumber) {
        try {
            Account account = accountService.getAccountByNumber(accountNumber)
                    .orElseThrow(() -> new RuntimeException("계좌를 찾을 수 없습니다."));
            
            AccountDto accountDto = convertToAccountDto(account);
            return ResponseEntity.ok(ApiResponseDto.success("계좌 정보 조회 성공", accountDto));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error("계좌 정보 조회 실패: " + e.getMessage()));
        }
    }

    @GetMapping("/{accountNumber}/transactions")
    @Operation(summary = "계좌 거래내역 조회", description = "계좌번호로 거래내역을 조회합니다.")
    public ResponseEntity<ApiResponseDto<List<AccountTransaction>>> getAccountTransactions(
            @Parameter(description = "계좌번호") @PathVariable String accountNumber,
            @Parameter(description = "조회 건수 (기본값: 20)") @RequestParam(required = false, defaultValue = "20") Integer limit,
            @Parameter(description = "페이지 오프셋 (기본값: 0)") @RequestParam(required = false, defaultValue = "0") Integer offset) {
        try {
            List<AccountTransaction> transactions = accountTransactionService.getTransactionsByAccount(
                    accountNumber, limit, offset);
            return ResponseEntity.ok(ApiResponseDto.success("거래내역 조회 성공", transactions));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error("거래내역 조회 실패: " + e.getMessage()));
        }
    }

    @GetMapping("/{accountNumber}/transactions/recent")
    @Operation(summary = "최근 거래내역 조회", description = "계좌의 최근 거래내역을 조회합니다.")
    public ResponseEntity<ApiResponseDto<List<AccountTransaction>>> getRecentTransactions(
            @Parameter(description = "계좌번호") @PathVariable String accountNumber,
            @Parameter(description = "조회 건수 (기본값: 10)") @RequestParam(required = false, defaultValue = "10") Integer limit) {
        try {
            List<AccountTransaction> transactions = accountTransactionService.getRecentTransactions(
                    accountNumber, limit);
            return ResponseEntity.ok(ApiResponseDto.success("최근 거래내역 조회 성공", transactions));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error("최근 거래내역 조회 실패: " + e.getMessage()));
        }
    }

    @GetMapping("/{accountNumber}/transactions/by-date")
    @Operation(summary = "기간별 거래내역 조회", description = "지정된 기간의 거래내역을 조회합니다.")
    public ResponseEntity<ApiResponseDto<List<AccountTransaction>>> getTransactionsByDateRange(
            @Parameter(description = "계좌번호") @PathVariable String accountNumber,
            @Parameter(description = "시작일 (YYYY-MM-DD HH:MM:SS)") @RequestParam String startDate,
            @Parameter(description = "종료일 (YYYY-MM-DD HH:MM:SS)") @RequestParam String endDate,
            @Parameter(description = "조회 건수 (기본값: 100)") @RequestParam(required = false, defaultValue = "100") Integer limit,
            @Parameter(description = "페이지 오프셋 (기본값: 0)") @RequestParam(required = false, defaultValue = "0") Integer offset) {
        try {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            LocalDateTime start = LocalDateTime.parse(startDate, formatter);
            LocalDateTime end = LocalDateTime.parse(endDate, formatter);

            List<AccountTransaction> transactions = accountTransactionService.getTransactionsByDateRange(
                    accountNumber, start, end, limit, offset);
            return ResponseEntity.ok(ApiResponseDto.success("기간별 거래내역 조회 성공", transactions));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error("기간별 거래내역 조회 실패: " + e.getMessage()));
        }
    }

    @GetMapping("/{accountNumber}/transactions/by-type")
    @Operation(summary = "거래타입별 거래내역 조회", description = "거래타입으로 거래내역을 조회합니다.")
    public ResponseEntity<ApiResponseDto<List<AccountTransaction>>> getTransactionsByType(
            @Parameter(description = "계좌번호") @PathVariable String accountNumber,
            @Parameter(description = "거래타입 (DEPOSIT, WITHDRAWAL, TRANSFER_OUT, TRANSFER_IN)") @RequestParam String transactionType,
            @Parameter(description = "조회 건수 (기본값: 50)") @RequestParam(required = false, defaultValue = "50") Integer limit,
            @Parameter(description = "페이지 오프셋 (기본값: 0)") @RequestParam(required = false, defaultValue = "0") Integer offset) {
        try {
            List<AccountTransaction> transactions = accountTransactionService.getTransactionsByType(
                    accountNumber, transactionType, limit, offset);
            return ResponseEntity.ok(ApiResponseDto.success("거래타입별 거래내역 조회 성공", transactions));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error("거래타입별 거래내역 조회 실패: " + e.getMessage()));
        }
    }

    @GetMapping("/{accountNumber}/transactions/by-category")
    @Operation(summary = "카테고리별 거래내역 조회", description = "카테고리로 거래내역을 조회합니다.")
    public ResponseEntity<ApiResponseDto<List<AccountTransaction>>> getTransactionsByCategory(
            @Parameter(description = "계좌번호") @PathVariable String accountNumber,
            @Parameter(description = "카테고리 (RENT, MANAGEMENT_FEE, GENERAL)") @RequestParam String category,
            @Parameter(description = "조회 건수 (기본값: 50)") @RequestParam(required = false, defaultValue = "50") Integer limit,
            @Parameter(description = "페이지 오프셋 (기본값: 0)") @RequestParam(required = false, defaultValue = "0") Integer offset) {
        try {
            List<AccountTransaction> transactions = accountTransactionService.getTransactionsByCategory(
                    accountNumber, category, limit, offset);
            return ResponseEntity.ok(ApiResponseDto.success("카테고리별 거래내역 조회 성공", transactions));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error("카테고리별 거래내역 조회 실패: " + e.getMessage()));
        }
    }

    @GetMapping("/{accountNumber}/transactions/count")
    @Operation(summary = "거래내역 개수 조회", description = "계좌의 총 거래내역 개수를 조회합니다.")
    public ResponseEntity<ApiResponseDto<Long>> getTransactionCount(
            @Parameter(description = "계좌번호") @PathVariable String accountNumber) {
        try {
            long count = accountTransactionService.getTransactionCount(accountNumber);
            return ResponseEntity.ok(ApiResponseDto.success("거래내역 개수 조회 성공", count));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error("거래내역 개수 조회 실패: " + e.getMessage()));
        }
    }

    @GetMapping("/transactions/{transactionId}")
    @Operation(summary = "거래번호로 거래내역 조회", description = "거래번호로 특정 거래내역을 조회합니다.")
    public ResponseEntity<ApiResponseDto<AccountTransaction>> getTransactionByTransactionId(
            @Parameter(description = "거래번호") @PathVariable String transactionId) {
        try {
            AccountTransaction transaction = accountTransactionService.getTransactionByTransactionId(transactionId);
            if (transaction == null) {
                return ResponseEntity.badRequest()
                        .body(ApiResponseDto.error("해당 거래번호의 거래내역을 찾을 수 없습니다."));
            }
            return ResponseEntity.ok(ApiResponseDto.success("거래내역 조회 성공", transaction));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponseDto.error("거래내역 조회 실패: " + e.getMessage()));
        }
    }

    private AccountDto convertToAccountDto(Account account) {
        return AccountDto.builder()
                .accountNumber(account.getAccountNumber())
                .accountType(account.getAccountType())
                .accountName(account.getAccountName() != null ? account.getAccountName() : "하나통장")
                .bankCode("088")
                .bankName("하나은행")
                .balance(account.getBalance())
                .currency("KRW")
                .status(account.getStatus() != null ? account.getStatus() : "ACTIVE")
                .lastTransactionDate(account.getLastTransactionDate() != null ? account.getLastTransactionDate() : account.getUpdatedAt())
                .build();
    }
}
