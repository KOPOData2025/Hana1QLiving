package com.example.hana_bank.mapper;

import com.example.hana_bank.entity.Loan;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface LoanMapper {
    
    void insertLoan(Loan loan);
    
    Optional<Loan> findById(@Param("loanId") Long loanId);
    
    List<Loan> findByUserCi(@Param("userCi") String userCi);
    
    List<Loan> findAll();
    
    List<Loan> findByStatus(@Param("status") String status);
    
    void updateLoan(Loan loan);
    
    void deleteLoan(@Param("loanId") Long loanId);
}
