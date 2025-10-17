package com.hana.securities.controller;

import com.hana.securities.entity.AccountLinkRequest;
import com.hana.securities.entity.AccountLinkResponse;
import com.hana.securities.entity.AccountCreateRequest;
import com.hana.securities.entity.AccountCreateResponse;
import com.hana.securities.entity.SecuritiesAccount;
import com.hana.securities.service.SecuritiesAccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/securities")
@CrossOrigin(originPatterns = "*")
public class SecuritiesAccountController {
    
    @Autowired
    private SecuritiesAccountService accountService;
    
    /**
     * 증권계좌 연동 요청
     */
    @PostMapping("/accounts/link")
    public ResponseEntity<AccountLinkResponse> linkAccount(@RequestBody AccountLinkRequest request) {
        try {
            AccountLinkResponse response = accountService.linkAccount(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.ok(new AccountLinkResponse(false, "서버 오류가 발생했습니다: " + e.getMessage()));
        }
    }
    
    /**
     * 사용자 CI로 연동된 계좌 목록 조회
     */
    @GetMapping("/accounts/user/{userCi}")
    public ResponseEntity<List<SecuritiesAccount>> getUserAccounts(@PathVariable String userCi) {
        try {
            List<SecuritiesAccount> accounts = accountService.getAccountsByUserCi(userCi);
            return ResponseEntity.ok(accounts);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * 특정 계좌 정보 조회
     */
    @GetMapping("/accounts/{accountNumber}")
    public ResponseEntity<SecuritiesAccount> getAccount(@PathVariable String accountNumber) {
        try {
            SecuritiesAccount account = accountService.getAccountByNumber(accountNumber);
            if (account != null) {
                return ResponseEntity.ok(account);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * 계좌 연동 상태 확인
     */
    @PostMapping("/accounts/verify")
    public ResponseEntity<Map<String, Object>> verifyAccount(@RequestBody Map<String, String> request) {
        try {
            String userCi = request.get("userCi");
            String accountNumber = request.get("accountNumber");
            
            boolean verified = accountService.verifyAccount(userCi, accountNumber);
            
            Map<String, Object> response = new HashMap<>();
            response.put("verified", verified);
            response.put("message", verified ? "계좌 연동이 확인되었습니다." : "계좌 연동 상태를 확인할 수 없습니다.");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("verified", false);
            response.put("message", "서버 오류가 발생했습니다.");
            return ResponseEntity.ok(response);
        }
    }
    
    /**
     * 계좌 잔액 업데이트 (거래 시 사용)
     */
    @PutMapping("/accounts/{accountNumber}/balance")
    public ResponseEntity<Map<String, Object>> updateBalance(
            @PathVariable String accountNumber, 
            @RequestBody Map<String, Long> request) {
        try {
            Long newBalance = request.get("balance");
            boolean updated = accountService.updateBalance(accountNumber, newBalance);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", updated);
            response.put("message", updated ? "잔액이 업데이트되었습니다." : "잔액 업데이트에 실패했습니다.");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "서버 오류가 발생했습니다.");
            return ResponseEntity.ok(response);
        }
    }
    
    /**
     * 새 증권계좌 생성
     */
    @PostMapping("/accounts/create")
    public ResponseEntity<AccountCreateResponse> createAccount(@RequestBody AccountCreateRequest request) {
        try {
            // 새 계좌 생성 (userCi와 함께)
            SecuritiesAccount newAccount = accountService.createAccount(
                request.getAccountName(), 
                request.getAccountType(),
                request.getUserCi()  // userCi를 전달
            );
            
            // 연동 토큰 생성
            String linkToken = null;
            if (request.getUserCi() != null && !request.getUserCi().isEmpty()) {
                linkToken = "LINK_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16);
            }
            
            return ResponseEntity.ok(new AccountCreateResponse(
                true, 
                "계좌가 성공적으로 생성되었습니다.",
                newAccount.getAccountNumber(),
                newAccount.getAccountName(),
                newAccount.getAccountType(),
                newAccount.getBalance(),
                linkToken
            ));
            
        } catch (Exception e) {
            System.err.println("=== 하나증권 Mock API 예외 발생 ===");
            System.err.println("Exception Type: " + e.getClass().getSimpleName());
            System.err.println("Exception Message: " + e.getMessage());
            e.printStackTrace();
            
            String errorMessage = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.ok(new AccountCreateResponse(false, "계좌 생성 중 오류가 발생했습니다: " + errorMessage));
        }
    }
    
    /**
     * 특정 상품의 주주명부 조회 (KSD에서 호출)
     */
    @GetMapping("/shareholders/{productCode}")
    public ResponseEntity<List<Map<String, Object>>> getShareholders(
            @PathVariable String productCode,
            @RequestParam String recordDate) {
        try {
            List<Map<String, Object>> shareholders = accountService.getShareholdersByProduct(productCode, recordDate);
            return ResponseEntity.ok(shareholders);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 배당금 지급 (계좌 잔고 업데이트 및 거래내역 기록)
     */
    @PostMapping("/credit-dividend")
    public ResponseEntity<Map<String, Object>> creditDividend(@RequestBody Map<String, Object> request) {
        try {
            String accountNumber = (String) request.get("accountNumber");
            Double amount = ((Number) request.get("amount")).doubleValue();
            String description = (String) request.get("description");

            // 실제 계좌 조회 및 잔고 업데이트
            SecuritiesAccount account = accountService.getAccountByNumber(accountNumber);
            boolean success = false;

            if (account != null) {
                // 잔고 업데이트
                Long newBalance = account.getBalance() + amount.longValue();
                success = accountService.updateBalance(accountNumber, newBalance);

                // transactions 테이블에 배당 거래 내역 기록
                if (success) {
                    // description에서 productCode 추출 (예: "배당금 지급 - 395400")
                    String productCode = extractProductCodeFromDescription(description);
                    String productName = accountService.getProductName(productCode);

                    // DB 조회 실패시 기본값 사용
                    if (productName == null) {
                        productName = "리츠 상품 (" + productCode + ")";
                    }

                    accountService.recordTransaction(accountNumber, "DIVIDEND", productCode, productName, amount, description);
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", success);
            response.put("message", success ? "배당금이 성공적으로 지급되었습니다." : "배당금 지급에 실패했습니다.");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "서버 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.ok(response);
        }
    }



    /**
     * 헬스체크
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "Hana Securities Mock API");
        return ResponseEntity.ok(response);
    }

    /**
     * description에서 상품코드 추출
     */
    private String extractProductCodeFromDescription(String description) {
        if (description != null && description.contains(" - ")) {
            String[] parts = description.split(" - ");
            if (parts.length > 1) {
                return parts[1].trim();
            }
        }
        return null;
    }

}