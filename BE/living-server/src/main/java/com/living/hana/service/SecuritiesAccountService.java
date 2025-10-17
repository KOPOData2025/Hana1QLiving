package com.living.hana.service;

import com.living.hana.dto.AccountLinkRequestDto;
import com.living.hana.dto.AccountLinkResponseDto;
import com.living.hana.entity.LinkedSecuritiesAccount;
import com.living.hana.entity.User;
import com.living.hana.mapper.LinkedSecuritiesAccountMapper;
import com.living.hana.mapper.UserMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class SecuritiesAccountService {
    
    @Autowired
    private LinkedSecuritiesAccountMapper linkedAccountMapper;
    
    @Autowired
    private UserMapper userMapper;
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Value("${hana.securities.api.base-url:http://localhost:8093}")
    private String hanaSecuritiesApiUrl;
    
    /**
     * 증권계좌 연동 요청
     */
    public AccountLinkResponseDto linkAccount(Long userId, AccountLinkRequestDto request) {
        try {
            // 1. 사용자 정보 조회
            User user = userMapper.findById(userId);
            if (user == null) {
                return new AccountLinkResponseDto(false, "사용자를 찾을 수 없습니다.");
            }
            
            // 2. user_ci가 없으면 생성
            if (user.getUserCi() == null || user.getUserCi().isEmpty()) {
                String userCi = generateUserCi(user.getId(), user.getEmail());
                user.setUserCi(userCi);
                userMapper.update(user);
            }
            
            // 3. 이미 연동된 계좌인지 확인
            boolean exists = linkedAccountMapper.existsByUserIdAndAccountNumber(userId, request.getAccountNumber());
            if (exists) {
                return new AccountLinkResponseDto(false, "이미 연동된 계좌입니다.");
            }

            // 4. 하나증권 호출
            AccountLinkResponseDto mockResponse = callHanaSecuritiesApi(user.getUserCi(), request);
            
            if (!mockResponse.isSuccess()) {
                return mockResponse;
            }
            
            // 5. 연동 성공 시 DB에 저장
            LinkedSecuritiesAccount linkedAccount = new LinkedSecuritiesAccount();
            linkedAccount.setUserId(userId);
            linkedAccount.setUserCi(user.getUserCi());
            linkedAccount.setAccountNumber(mockResponse.getAccountNumber());
            linkedAccount.setAccountName(mockResponse.getAccountName());
            linkedAccount.setAccountType("NORMAL");
            linkedAccount.setStatus("ACTIVE");
            linkedAccount.setLinkToken(mockResponse.getLinkToken());
            
            linkedAccountMapper.insertLinkedAccount(linkedAccount);
            
            return mockResponse;
            
        } catch (Exception e) {
            return new AccountLinkResponseDto(false, "계좌 연동 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
    
    /**
     * 사용자의 연동된 계좌 목록 조회
     */
    public List<LinkedSecuritiesAccount> getUserLinkedAccounts(Long userId) {
        return linkedAccountMapper.findAccountsByUserId(userId);
    }

    /**
     * 하나증권 호출
     */
    private AccountLinkResponseDto callHanaSecuritiesApi(String userCi, AccountLinkRequestDto request) {
        try {
            String url = hanaSecuritiesApiUrl + "/api/securities/accounts/link";
            
            Map<String, Object> apiRequest = new HashMap<>();
            apiRequest.put("userCi", userCi);
            apiRequest.put("accountNumber", request.getAccountNumber());
            apiRequest.put("accountPassword", request.getAccountPassword());
            apiRequest.put("userName", request.getUserName());
            apiRequest.put("phoneNumber", request.getPhoneNumber());
            apiRequest.put("birthDate", request.getBirthDate());
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, apiRequest, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            if (responseBody != null) {
                boolean success = (Boolean) responseBody.get("success");
                String message = (String) responseBody.get("message");
                
                if (success) {
                    String accountNumber = (String) responseBody.get("accountNumber");
                    String accountName = (String) responseBody.get("accountName");
                    Long balance = responseBody.get("balance") != null ? 
                        ((Number) responseBody.get("balance")).longValue() : 0L;
                    String linkToken = (String) responseBody.get("linkToken");
                    
                    return new AccountLinkResponseDto(success, message, accountNumber, 
                                                    accountName, balance, linkToken);
                } else {
                    return new AccountLinkResponseDto(success, message);
                }
            }
            
            return new AccountLinkResponseDto(false, "API 응답을 처리할 수 없습니다.");
            
        } catch (HttpClientErrorException e) {
            return new AccountLinkResponseDto(false, "하나증권 API 호출 실패: " + e.getMessage());
        } catch (Exception e) {
            return new AccountLinkResponseDto(false, "서버 오류가 발생했습니다: " + e.getMessage());
        }
    }

    private String generateUserCi(Long userId, String email) {
        // 하나은행과 유사한 CI 형식으로 생성
        // CI + YYMMDD + 성별코드 + 일련번호
        String birthPart = String.format("%06d", (userId * 19 + 850101) % 1000000); // 가상 생년월일
        String genderPart = String.valueOf((userId % 2) + 1); // 1 또는 2 (성별코드)
        String serialPart = String.format("%06d", userId * 13 % 1000000); // 일련번호
        
        return "CI" + birthPart + genderPart + serialPart;
    }
}