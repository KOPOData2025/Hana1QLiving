package com.hana.securities.mapper;

import com.hana.securities.entity.SecuritiesAccount;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SecuritiesAccountMapper {
    
    void insertAccount(SecuritiesAccount account);
    
    SecuritiesAccount findByAccountNumber(@Param("accountNumber") String accountNumber);
    
    List<SecuritiesAccount> findByUserCi(@Param("userCi") String userCi);
    
    void updateUserCi(@Param("accountNumber") String accountNumber, @Param("userCi") String userCi);
    
    void updateBalance(@Param("accountNumber") String accountNumber, @Param("balance") Long balance);
    
    List<SecuritiesAccount> findAll();

    void insertTransaction(@Param("accountNumber") String accountNumber,
                          @Param("transactionType") String transactionType,
                          @Param("productCode") String productCode,
                          @Param("productName") String productName,
                          @Param("amount") Double amount,
                          @Param("description") String description);

    String getProductName(@Param("productCode") String productCode);
}