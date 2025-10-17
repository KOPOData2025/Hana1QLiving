package com.example.hana_bank.mapper;

import com.example.hana_bank.entity.LoanRepayment;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface LoanRepaymentMapper {
    
    void insertLoanRepayment(LoanRepayment loanRepayment);
    
    Optional<LoanRepayment> findById(@Param("repaymentId") Long repaymentId);
    
    List<LoanRepayment> findByLoanId(@Param("loanId") Long loanId);
    
    List<LoanRepayment> findAll();
    
    void updateLoanRepayment(LoanRepayment loanRepayment);
    
    void deleteLoanRepayment(@Param("repaymentId") Long repaymentId);
}
