package com.living.hana.mapper;

import com.living.hana.entity.Loan;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface LoanMapper {
    
    List<Loan> findAll();
    
    Loan findById(Long id);
    
    List<Loan> findByUserId(Long userId);
    
    List<Loan> findByContractId(Long contractId);
    
    List<Loan> findByStatus(String status);
    
    Loan findByApplicationId(String applicationId);
    
    int insert(Loan loan);
    
    int update(Loan loan);
    
    int deleteById(Long id);
    
    int updateExecutionInfo(@Param("loanId") Long loanId,
                           @Param("desiredExecutionDate") String desiredExecutionDate,
                           @Param("landlordAccountNumber") String landlordAccountNumber,
                           @Param("landlordBankCode") String landlordBankCode,
                           @Param("landlordAccountHolder") String landlordAccountHolder,
                           @Param("contractFilePath") String contractFilePath,
                           @Param("executionStatus") String executionStatus);
    
    void updateExecutionResult(@Param("loanId") Long loanId,
                               @Param("actualExecutionDate") String actualExecutionDate,
                               @Param("transactionId") String transactionId,
                               @Param("executionStatus") String executionStatus,
                               @Param("executionResultMessage") String executionResultMessage);
}
