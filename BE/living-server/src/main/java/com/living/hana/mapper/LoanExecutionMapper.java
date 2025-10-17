package com.living.hana.mapper;

import com.living.hana.entity.LoanExecution;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface LoanExecutionMapper {
    
    List<LoanExecution> findAll();
    
    LoanExecution findById(Long id);
    
    List<LoanExecution> findByStatus(String status);
    
    int insert(LoanExecution loanExecution);
    
    int update(LoanExecution loanExecution);
    
    int deleteById(Long id);
}