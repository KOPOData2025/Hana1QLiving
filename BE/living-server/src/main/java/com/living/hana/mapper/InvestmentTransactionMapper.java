package com.living.hana.mapper;

import com.living.hana.entity.InvestmentTransaction;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface InvestmentTransactionMapper {
    
    void insertTransaction(InvestmentTransaction transaction);
    
    int updateTransactionStatus(@Param("transactionId") Long transactionId,
                              @Param("status") String status,
                              @Param("brokerOrderId") String brokerOrderId,
                              @Param("errorMessage") String errorMessage);
}