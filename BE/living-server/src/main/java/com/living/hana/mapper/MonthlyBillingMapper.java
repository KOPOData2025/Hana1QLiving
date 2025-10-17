package com.living.hana.mapper;

import com.living.hana.entity.MonthlyBilling;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface MonthlyBillingMapper {
    
    MonthlyBilling findById(@Param("id") Long id);
    
    List<MonthlyBilling> findByUserId(@Param("userId") Long userId);

    List<MonthlyBilling> findByStatus(@Param("status") String status);
    
    List<MonthlyBilling> findAll();
}