package com.living.hana.mapper;

import com.living.hana.entity.LinkedBankAccount;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface LinkedBankAccountMapper {

    void insertLinkedAccount(LinkedBankAccount account);

    LinkedBankAccount findById(@Param("id") Long id);

    List<LinkedBankAccount> findAccountsByUserId(@Param("userId") Long userId);

    List<LinkedBankAccount> findActiveAccountsByUserId(@Param("userId") Long userId);


    LinkedBankAccount findAccountByUserIdAndAccountNumber(@Param("userId") Long userId, @Param("accountNumber") String accountNumber);
    
    void updateAccountStatus(@Param("id") Long id, @Param("status") String status);

    boolean existsByUserIdAndAccountNumber(@Param("userId") Long userId, @Param("accountNumber") String accountNumber);
    
    List<LinkedBankAccount> findByUserIdAndAutoPaymentEnabled(@Param("userId") Long userId, @Param("autoPaymentEnabled") Boolean autoPaymentEnabled);
    
    void updateLinkedBankAccount(LinkedBankAccount account);
}