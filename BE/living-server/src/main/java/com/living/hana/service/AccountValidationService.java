package com.living.hana.service;

import com.living.hana.client.MainServiceClient;
import com.living.hana.client.UserServiceClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AccountValidationService {
    
    @Autowired
    private MainServiceClient mainServiceClient;
    
    @Autowired
    private UserServiceClient userServiceClient;
    
    /**
     * 종합적인 계좌 검증
     */
    public AccountValidationResult validateAccountForTrading(Long userId, String accountNumber, 
                                                           String password, String token) {
        try {
            // 1. 기본 계좌번호 형식 검증
            if (!isValidAccountNumberFormat(accountNumber)) {
                return AccountValidationResult.failure("계좌번호 형식이 올바르지 않습니다.");
            }
            
            // 2. 비밀번호 기본 검증
            if (!isValidPassword(password)) {
                return AccountValidationResult.failure("계좌 비밀번호가 올바르지 않습니다.");
            }
            
            // 3. 메인 서비스에서 계좌 연동 상태 확인
            boolean isLinked = mainServiceClient.verifySecuritiesAccount(userId, accountNumber, token);
            if (!isLinked) {
                return AccountValidationResult.failure("연동되지 않은 계좌입니다. 먼저 계좌를 연동해주세요.");
            }
            
            // 4. 사용자 정보 검증 (userServiceClient를 통해)
            Map<String, Object> userInfo = userServiceClient.getUserInfo(userId, token);
            if (userInfo == null || !"ACTIVE".equals(userInfo.get("status"))) {
                return AccountValidationResult.failure("사용자 계정 상태를 확인할 수 없습니다.");
            }
            
            String userCi = (String) userInfo.get("userCi");
            if (userCi == null || userCi.isEmpty()) {
                return AccountValidationResult.failure("사용자 CI 정보가 없습니다.");
            }
            
            // 5. 하나증권을 통한 계좌 상태 및 잔액 확인
            Long accountBalance = mainServiceClient.getAccountBalance(userCi, accountNumber);
            if (accountBalance == null) {
                return AccountValidationResult.failure("계좌 정보를 확인할 수 없습니다.");
            }
            
            return AccountValidationResult.success(accountBalance, userCi, "계좌 검증이 완료되었습니다.");
            
        } catch (Exception e) {
            return AccountValidationResult.failure("계좌 검증 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
    
    /**
     * 거래 가능 잔액 확인 (매수 시)
     */
    public boolean hasSufficientBalance(Long userId, String accountNumber, Long requiredAmount, String token) {
        try {
            Map<String, Object> userInfo = userServiceClient.getUserInfo(userId, token);
            if (userInfo == null) {
                return false;
            }
            
            String userCi = (String) userInfo.get("userCi");
            Long balance = mainServiceClient.getAccountBalance(userCi, accountNumber);
            
            return balance != null && balance >= requiredAmount;
            
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 거래 후 계좌 잔액 업데이트
     */
    public void updateAccountBalanceAfterTrade(String accountNumber, Long newBalance) {
        mainServiceClient.updateAccountBalance(accountNumber, newBalance);
    }
    
    private boolean isValidAccountNumberFormat(String accountNumber) {
        if (accountNumber == null || accountNumber.trim().isEmpty()) {
            return false;
        }
        
        // 하나증권 계좌번호 형식: XXX-XXXXXX-XX (12-15자리)
        String cleanAccountNumber = accountNumber.replace("-", "");
        return cleanAccountNumber.length() >= 10 && cleanAccountNumber.length() <= 15 && 
               cleanAccountNumber.matches("\\d+");
    }
    
    private boolean isValidPassword(String password) {
        return password != null && password.length() >= 4 && password.length() <= 6 && 
               password.matches("\\d+");
    }
    
    /**
     * 계좌 검증 결과 클래스
     */
    public static class AccountValidationResult {
        private final boolean valid;
        private final String message;
        private final Long accountBalance;
        private final String userCi;
        
        private AccountValidationResult(boolean valid, String message, Long accountBalance, String userCi) {
            this.valid = valid;
            this.message = message;
            this.accountBalance = accountBalance;
            this.userCi = userCi;
        }
        
        public static AccountValidationResult success(Long balance, String userCi, String message) {
            return new AccountValidationResult(true, message, balance, userCi);
        }
        
        public static AccountValidationResult failure(String message) {
            return new AccountValidationResult(false, message, null, null);
        }
        
        // Getters
        public boolean isValid() { return valid; }
        public String getMessage() { return message; }
        public Long getAccountBalance() { return accountBalance; }
        public String getUserCi() { return userCi; }
    }
}