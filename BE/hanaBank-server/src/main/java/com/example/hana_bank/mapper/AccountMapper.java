package com.example.hana_bank.mapper;

import com.example.hana_bank.entity.Account;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface AccountMapper {
    
    void insertAccount(Account account);
    
    Optional<Account> findById(@Param("accountId") Long accountId);
    
    Optional<Account> findByAccountNumber(@Param("accountNumber") String accountNumber);
    
    List<Account> findByUserCi(@Param("userCi") String userCi);
    
    List<Account> findAll();
    
    void updateAccount(Account account);
    
    void deleteAccount(@Param("accountId") Long accountId);
    
    boolean existsByAccountNumber(@Param("accountNumber") String accountNumber);
    
    String generateAccountNumber();
}
