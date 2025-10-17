package com.living.hana.service;

import com.living.hana.dto.MyAccountsResponseDto;
import com.living.hana.dto.MyAccountsResponseDto.BankAccountDto;
import com.living.hana.dto.MyAccountsResponseDto.SecuritiesAccountDto;
import com.living.hana.entity.LinkedSecuritiesAccount;
import com.living.hana.entity.LinkedBankAccount;
import com.living.hana.entity.User;
import com.living.hana.mapper.LinkedSecuritiesAccountMapper;
import com.living.hana.mapper.LinkedBankAccountMapper;
import com.living.hana.mapper.UserMapper;
import com.living.hana.client.HanaBankClient;
import com.living.hana.dto.HanaBankAccountDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class MyAccountService {
    
    @Autowired
    private UserMapper userMapper;
    
    @Autowired
    private LinkedSecuritiesAccountMapper linkedAccountMapper;
    
    @Autowired
    private LinkedBankAccountMapper linkedBankAccountMapper;
    
    @Autowired
    private HanaBankClient hanaBankClient;
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Value("${hana.securities.api.base-url:http://localhost:8093}")
    private String hanaSecuritiesApiUrl;
    
    /**
     * 사용자의 모든 계좌 정보 조회 (은행계좌 + 증권계좌)
     */
    public MyAccountsResponseDto getMyAccounts(Long userId) {
        try {
            User user = userMapper.findById(userId);
            String userCi = "HANA_20990621_M_61f728f7"; // 기본 사용자 CI
            
            if (user != null && user.getUserCi() != null) {
                userCi = user.getUserCi();
            }
            
            // 1. 연동된 하나은행 계좌 조회
            List<BankAccountDto> bankAccounts = getBankAccounts(userId);
            
            // 2. 연동된 증권계좌 조회
            List<SecuritiesAccountDto> securitiesAccounts = getSecuritiesAccounts(userId, userCi);
            
            return new MyAccountsResponseDto(true, "계좌 조회 성공", bankAccounts, securitiesAccounts);
            
        } catch (Exception e) {
            return new MyAccountsResponseDto(false, "계좌 조회 중 오류가 발생했습니다: " + e.getMessage(), null, null);
        }
    }
    
    /**
     * 하나은행 계좌 조회 (연동된 계좌 우선, 없으면 전체 계좌 조회)
     */
    private List<BankAccountDto> getBankAccounts(Long userId) {
        List<BankAccountDto> bankAccounts = new ArrayList<>();
        
        try {
            // 1. 연동된 은행 계좌 목록 조회
            List<LinkedBankAccount> linkedAccounts = linkedBankAccountMapper.findAccountsByUserId(userId);
            
            if (!linkedAccounts.isEmpty()) {
                // 연동된 계좌가 있는 경우: 각 연동된 계좌의 실시간 정보 조회
                for (LinkedBankAccount linkedAccount : linkedAccounts) {
                    try {
                        HanaBankAccountDto accountInfo = hanaBankClient.getAccountInfo(linkedAccount.getAccountNumber());
                        if (accountInfo != null) {
                            BankAccountDto bankAccount = new BankAccountDto();
                            bankAccount.setAccountNumber(accountInfo.getAccountNumber());
                            bankAccount.setAccountName(accountInfo.getAccountName());
                            bankAccount.setAccountType(accountInfo.getAccountType());
                            bankAccount.setBalance(accountInfo.getBalance());
                            bankAccount.setBankCode(accountInfo.getBankCode());
                            bankAccount.setBankName(accountInfo.getBankName());
                            bankAccount.setCurrency(accountInfo.getCurrency());
                            bankAccount.setStatus(accountInfo.getStatus());
                            bankAccount.setLastTransactionDate(accountInfo.getLastTransactionDate());
                            
                            bankAccounts.add(bankAccount);
                        }
                    } catch (Exception e) {
                        log.error("계좌 정보 조회 실패: {}, {}", linkedAccount.getAccountNumber(), e.getMessage());
                    }
                }
            } else {
                // 연동된 계좌가 없는 경우: 하나은행에서 전체 계좌 조회
                log.info("[ACCOUNT] 연동된 계좌 없음 - 하나은행에서 전체 계좌 조회: userId={}", userId);
                String userCi = "HANA_20990621_M_61f728f7"; // 기본 사용자 CI
                
                // 사용자 정보에서 userCi 가져오기
                User user = userMapper.findById(userId);
                if (user != null && user.getUserCi() != null) {
                    userCi = user.getUserCi();
                }
                
                List<HanaBankAccountDto> allBankAccounts = hanaBankClient.getAllAccountsByUserCi(userCi);
                for (HanaBankAccountDto account : allBankAccounts) {
                    BankAccountDto bankAccount = new BankAccountDto();
                    bankAccount.setAccountNumber(account.getAccountNumber());
                    bankAccount.setAccountName(account.getAccountName());
                    bankAccount.setAccountType(account.getAccountType());
                    bankAccount.setBalance(account.getBalance());
                    bankAccount.setBankCode(account.getBankCode());
                    bankAccount.setBankName(account.getBankName());
                    bankAccount.setCurrency(account.getCurrency());
                    bankAccount.setStatus(account.getStatus());
                    
                    bankAccounts.add(bankAccount);
                }
            }
            
        } catch (Exception e) {
            log.error("은행계좌 조회 실패: {}", e.getMessage());
        }
        
        return bankAccounts;
    }
    
    /**
     * 연동된 증권계좌 조회
     */
    private List<SecuritiesAccountDto> getSecuritiesAccounts(Long userId, String userCi) {
        List<SecuritiesAccountDto> securitiesAccounts = new ArrayList<>();
        
        try {
            // 연동된 증권계좌 목록 조회
            List<LinkedSecuritiesAccount> linkedAccounts = linkedAccountMapper.findAccountsByUserId(userId);
            
            for (LinkedSecuritiesAccount linkedAccount : linkedAccounts) {
                try {
                    // 하나증권에서 계좌 정보 조회
                    String url = hanaSecuritiesApiUrl + "/api/securities/accounts/" + linkedAccount.getAccountNumber();
                    ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
                    Map<String, Object> responseBody = response.getBody();
                    
                    if (responseBody != null && userCi.equals(responseBody.get("userCi"))) {
                        SecuritiesAccountDto securitiesAccount = new SecuritiesAccountDto();
                        securitiesAccount.setAccountNumber(linkedAccount.getAccountNumber());
                        securitiesAccount.setAccountName(linkedAccount.getAccountName());
                        securitiesAccount.setAccountType(linkedAccount.getAccountType());
                        securitiesAccount.setBrokerCode("088");
                        securitiesAccount.setBrokerName("하나증권");
                        
                        Object balance = responseBody.get("balance");
                        if (balance instanceof Number) {
                            securitiesAccount.setBalance(((Number) balance).longValue());
                        }
                        
                        securitiesAccount.setStatus(linkedAccount.getStatus());
                        securitiesAccounts.add(securitiesAccount);
                    }
                } catch (Exception e) {
                    log.error("증권계좌 조회 실패: {}, {}", linkedAccount.getAccountNumber(), e.getMessage());
                }
            }

        } catch (Exception e) {
            log.error("연동된 증권계좌 조회 실패: {}", e.getMessage());
        }
        
        return securitiesAccounts;
    }
    
    /**
     * 하나은행에서 사용 가능한 모든 계좌 조회 (연동용)
     */
    public List<BankAccountDto> getAvailableBankAccounts(String userCi) {
        List<BankAccountDto> availableAccounts = new ArrayList<>();
        
        try {
            // 하나은행에서 사용 가능한 계좌 목록 조회
            List<HanaBankAccountDto> bankAccounts = hanaBankClient.getAllAccountsByUserCi(userCi);
            
            for (HanaBankAccountDto account : bankAccounts) {
                BankAccountDto bankAccount = new BankAccountDto();
                bankAccount.setAccountNumber(account.getAccountNumber());
                bankAccount.setAccountName(account.getAccountName());
                bankAccount.setAccountType(account.getAccountType());
                bankAccount.setBalance(account.getBalance());
                bankAccount.setBankCode(account.getBankCode());
                bankAccount.setBankName(account.getBankName());
                bankAccount.setCurrency(account.getCurrency());
                bankAccount.setStatus(account.getStatus());
                
                availableAccounts.add(bankAccount);
            }
            
        } catch (Exception e) {
            log.error("하나은행 사용 가능한 계좌 조회 실패: {}", e.getMessage());
        }
        
        return availableAccounts;
    }
}