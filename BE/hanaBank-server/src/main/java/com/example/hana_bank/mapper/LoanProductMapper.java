package com.example.hana_bank.mapper;

import com.example.hana_bank.entity.LoanProduct;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface LoanProductMapper {
    
    void insertLoanProduct(LoanProduct loanProduct);
    
    Optional<LoanProduct> findById(@Param("productId") Long productId);
    
    List<LoanProduct> findAll();
    
    List<LoanProduct> findByStatus(@Param("status") String status);
    
    void updateLoanProduct(LoanProduct loanProduct);
    
    void deleteLoanProduct(@Param("productId") Long productId);
}
