package com.living.hana.service;

import com.living.hana.annotation.Logging;
import com.living.hana.entity.LinkedBankAccount;
import com.living.hana.mapper.LinkedBankAccountMapper;
import com.living.hana.client.HanaBankClient;
import com.living.hana.dto.HanaBankAccountDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BankAccountService {

    private final LinkedBankAccountMapper linkedBankAccountMapper;
    private final HanaBankClient hanaBankClient;

    /**
     * 사용자의 연결된 하나은행 계좌 목록 조회
     */
    @Transactional(readOnly = true)
    public List<LinkedBankAccount> getLinkedAccountsByUserId(Long userId) {
        return linkedBankAccountMapper.findAccountsByUserId(userId);
    }

    /**
     * 하나은행 계좌 연결
     */
    @Logging(operation = "은행 계좌 연결", category = "ACCOUNT", maskSensitive = true)
    public LinkedBankAccount linkBankAccount(Long userId, String userCi, String accountNumber) {
        // 이미 연결된 계좌인지 확인
        if (linkedBankAccountMapper.existsByUserIdAndAccountNumber(userId, accountNumber)) {
            throw new RuntimeException("이미 연결된 계좌입니다.");
        }
        
        // 하나은행에서 계좌 정보 조회하여 유효성 검증
        HanaBankAccountDto bankAccount = hanaBankClient.getAccountInfo(accountNumber);
        if (bankAccount == null) {
            throw new RuntimeException("계좌 정보를 찾을 수 없습니다.");
        }
        
        // 연결 정보 저장
        LinkedBankAccount linkedAccount = LinkedBankAccount.builder()
                .userId(userId)
                .userCi(userCi)
                .accountNumber(accountNumber)
                .accountName(bankAccount.getAccountName())
                .accountType(bankAccount.getAccountType())
                .status("ACTIVE")
                .build();
        
        linkedBankAccountMapper.insertLinkedAccount(linkedAccount);
        return linkedAccount;
    }
    
    /**
     * 하나은행 계좌 연결 해제
     */
    @Logging(operation = "은행 계좌 연결 해제", category = "ACCOUNT")
    public void unlinkBankAccount(Long userId, String accountNumber) {
        LinkedBankAccount account = linkedBankAccountMapper.findAccountByUserIdAndAccountNumber(userId, accountNumber);
        if (account == null) {
            throw new RuntimeException("연결된 계좌를 찾을 수 없습니다.");
        }
        
        linkedBankAccountMapper.updateAccountStatus(account.getId(), "INACTIVE");
    }


}