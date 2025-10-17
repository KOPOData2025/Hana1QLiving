package com.living.hana.mapper;

import com.living.hana.entity.AutoBillingContract;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AutoBillingContractMapper {
    
    void insertAutoBillingContract(AutoBillingContract contract);
    
    AutoBillingContract findById(@Param("id") Long id);
    
    AutoBillingContract findByUserId(@Param("userId") Long userId);
    
    AutoBillingContract findByContractId(@Param("contractId") Long contractId);

    void updateAutoBillingContract(AutoBillingContract contract);
    

    boolean existsByUserId(@Param("userId") Long userId);
    
}