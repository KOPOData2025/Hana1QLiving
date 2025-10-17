package com.example.hana_bank.service;

import com.example.hana_bank.dto.AccountCreateDto;
import com.example.hana_bank.entity.Account;
import com.example.hana_bank.entity.User;
import com.example.hana_bank.mapper.AccountMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class AccountService {
    
    private final AccountMapper accountMapper;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    
    public Account createAccount(AccountCreateDto dto, String username) {
        User user = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        String accountNumber = accountMapper.generateAccountNumber();
        
        Account account = Account.builder()
                .accountNumber(accountNumber)
                .accountPassword(passwordEncoder.encode(dto.getAccountPassword()))
                .userCi(user.getUserCi())
                .accountType(dto.getAccountType())
                .balance(BigDecimal.ZERO)
                .status("ACTIVE")
                .build();
        
        accountMapper.insertAccount(account);
        return account;
    }
    
    public Account createAccountByUserCi(String userCi, String accountType, String accountPassword, 
                                        BigDecimal initialBalance, String accountName) {
        // 사용자 존재 여부 확인 및 자동 생성
        Optional<User> existingUser = userService.findByUserCi(userCi);
        if (existingUser.isEmpty()) {
            // 사용자가 없으면 자동 생성
            User newUser = User.builder()
                    .userCi(userCi)
                    .name("하나원큐리빙 사용자") // 기본 이름
                    .role("CUSTOMER")
                    .status("ACTIVE")
                    .authType("PASSWORD")
                    .build();
            userService.createUser(newUser);
        }
        
        String accountNumber = accountMapper.generateAccountNumber();
        
        Account account = Account.builder()
                .accountNumber(accountNumber)
                .accountPassword(passwordEncoder.encode(accountPassword))
                .userCi(userCi)
                .accountType(accountType)
                .balance(initialBalance != null ? initialBalance : BigDecimal.ZERO)
                .status("ACTIVE")
                .accountName(accountName)
                .build();
        
        accountMapper.insertAccount(account);
        return account;
    }
    
    @Transactional(readOnly = true)
    public List<Account> getAccountsByUserCi(String userCi) {
        return accountMapper.findByUserCi(userCi);
    }
    
    @Transactional(readOnly = true)
    public List<Account> getAllAccounts() {
        return accountMapper.findAll();
    }
    
    @Transactional(readOnly = true)
    public Optional<Account> getAccountByNumber(String accountNumber) {
        return accountMapper.findByAccountNumber(accountNumber);
    }
    
    @Transactional(readOnly = true)
    public Optional<Account> getAccountById(Long accountId) {
        return accountMapper.findById(accountId);
    }
    
    public boolean validateAccountPassword(String accountNumber, String password) {
        Optional<Account> account = accountMapper.findByAccountNumber(accountNumber);
        if (account.isPresent()) {
            return passwordEncoder.matches(password, account.get().getAccountPassword());
        }
        return false;
    }
    
    public void updateAccount(Account account) {
        accountMapper.updateAccount(account);
    }
    
    public void deleteAccount(Long accountId) {
        accountMapper.deleteAccount(accountId);
    }
}
