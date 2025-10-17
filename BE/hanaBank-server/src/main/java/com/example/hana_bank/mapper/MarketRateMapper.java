package com.example.hana_bank.mapper;

import com.example.hana_bank.entity.MarketRate;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface MarketRateMapper {

    List<MarketRate> findAllActiveRates();

    MarketRate findByRateType(@Param("rateType") String rateType);

    List<MarketRate> findByRateTypeAndStatus(@Param("rateType") String rateType, @Param("status") String status);

    void insert(MarketRate marketRate);

    void update(MarketRate marketRate);

    void updateStatus(@Param("rateId") Long rateId, @Param("status") String status);
}