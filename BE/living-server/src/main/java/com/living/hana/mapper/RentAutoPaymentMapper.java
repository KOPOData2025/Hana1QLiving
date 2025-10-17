package com.living.hana.mapper;

import com.living.hana.entity.RentAutoPayment;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.sql.Date;

@Mapper
public interface RentAutoPaymentMapper {
    
    void insertRentAutoPayment(RentAutoPayment rentAutoPayment);
    
    RentAutoPayment findById(@Param("id") Long id);
    
    List<RentAutoPayment> findByUserId(@Param("userId") Long userId);
    
    List<RentAutoPayment> findByContractId(@Param("contractId") Long contractId);
    
    void updateRentAutoPayment(RentAutoPayment rentAutoPayment);

    void updateStatus(@Param("id") Long id, @Param("isActive") String isActive);
    
    List<RentAutoPayment> findTodayScheduledPayments(@Param("today") Date today);
}