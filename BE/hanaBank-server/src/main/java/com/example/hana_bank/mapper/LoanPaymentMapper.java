package com.example.hana_bank.mapper;

import com.example.hana_bank.entity.LoanPayment;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface LoanPaymentMapper {
    
    void insertLoanPayment(LoanPayment payment);
    
    List<LoanPayment> findAllLoanPayments();
    
    LoanPayment findByTransactionId(String transactionId);
    
    LoanPayment findByContractNumber(String contractNumber);
    
    void updatePaymentStatus(@Param("paymentId") Long paymentId, @Param("status") String status);
    
    List<LoanPayment> findByStatus(String status);
    
    List<LoanPayment> findByScheduledDate(String scheduledDate);
}