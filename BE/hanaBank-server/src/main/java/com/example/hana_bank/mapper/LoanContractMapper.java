package com.example.hana_bank.mapper;

import com.example.hana_bank.entity.LoanContract;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface LoanContractMapper {
    
    void insertLoanContract(LoanContract contract);
    
    List<LoanContract> findAllLoanContracts();
    
    LoanContract findByContractNumber(String contractNumber);
    
    void updateContractStatus(@Param("contractId") Long contractId, @Param("status") String status);
    
    List<LoanContract> findByStatus(String status);
    
    List<LoanContract> findByScheduledDate(String scheduledDate);
    
    LoanContract findByOneQReference(String applicationId);
}