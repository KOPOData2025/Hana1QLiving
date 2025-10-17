package com.living.hana.mapper;

import com.living.hana.entity.LinkedSecuritiesAccount;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface LinkedSecuritiesAccountMapper {
    
    void insertLinkedAccount(LinkedSecuritiesAccount account);
    
    List<LinkedSecuritiesAccount> findAccountsByUserId(@Param("userId") Long userId);

    boolean existsByUserIdAndAccountNumber(
        @Param("userId") Long userId, 
        @Param("accountNumber") String accountNumber
    );
}