package com.example.hana_bank.service;

import com.example.hana_bank.entity.MarketRate;
import com.example.hana_bank.mapper.MarketRateMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class MarketRateService {

    @Autowired
    private MarketRateMapper marketRateMapper;

    // 모든 활성 금리 조회
    public List<MarketRate> getAllActiveRates() {
        return marketRateMapper.findAllActiveRates();
    }

    // 특정 금리 타입의 최신 활성 금리 조회
    public MarketRate getCurrentRate(String rateType) {
        return marketRateMapper.findByRateType(rateType);
    }

    // COFIX 6개월 금리 조회
    public double getCofix6mRate() {
        MarketRate rate = getCurrentRate("COFIX_6M");
        return rate != null ? rate.getRateValue().doubleValue() : 0.0251; // 기본값
    }

    // COFIX 2년 금리 조회
    public double getCofix2yRate() {
        MarketRate rate = getCurrentRate("COFIX_2Y");
        return rate != null ? rate.getRateValue().doubleValue() : 0.0283; // 기본값
    }

    // 기준금리 조회
    public double getBaseRate() {
        MarketRate rate = getCurrentRate("BASE_RATE");
        return rate != null ? rate.getRateValue().doubleValue() : 0.0325; // 기본값
    }

    // 금리 정보 입력
    public void insertRate(MarketRate marketRate) {
        marketRateMapper.insert(marketRate);
    }

    // 금리 정보 수정
    public void updateRate(MarketRate marketRate) {
        marketRateMapper.update(marketRate);
    }

    // 금리 상태 변경
    public void updateRateStatus(Long rateId, String status) {
        marketRateMapper.updateStatus(rateId, status);
    }

    // 편의 메서드: 퍼센트 형태의 문자열로 반환
    public String getCofix6mRateAsString() {
        return String.format("%.3f%%", getCofix6mRate() * 100);
    }

    public String getCofix2yRateAsString() {
        return String.format("%.2f%%", getCofix2yRate() * 100);
    }

    public String getBaseRateAsString() {
        return String.format("%.2f%%", getBaseRate() * 100);
    }
}