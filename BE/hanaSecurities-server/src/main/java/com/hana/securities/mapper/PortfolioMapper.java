package com.hana.securities.mapper;

import com.hana.securities.entity.Portfolio;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
public interface PortfolioMapper {
    
    List<Portfolio> findByUserId(@Param("userId") Long userId);
    
    Portfolio findByUserIdAndProductId(@Param("userId") Long userId, @Param("productId") String productId);
    
    List<Portfolio> findByUserIdAndStatus(@Param("userId") Long userId, @Param("status") String status);
    
    int insertPortfolio(Portfolio portfolio);
    
    int updatePortfolio(Portfolio portfolio);
    
    int deletePortfolio(@Param("id") Long id);
    
    Map<String, Object> getPortfolioSummaryByUserId(@Param("userId") Long userId);
    
    List<Map<String, Object>> getPortfolioAnalysisByUserId(@Param("userId") Long userId);
}