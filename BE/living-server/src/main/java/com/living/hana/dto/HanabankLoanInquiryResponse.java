package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HanabankLoanInquiryResponse {
    private boolean success;
    private String message;
    private String error;
    private HanabankLoanData data;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HanabankLoanData {
        private CustomerEligibility customerEligibility;
        private List<LoanProduct> availableProducts;
        private MarketRates marketRates;
        // 하나은행 추천 결과
        private String recommendedLoanAmount;
        private String calculatedSpreadRate;
        private String finalInterestRate;
        private RecommendedRates recommendedRates;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerEligibility {
        private boolean isEligible;
        private String creditGrade;
        private String dtiRatio;
        private String dsrRatio;
        private String riskLevel;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MarketRates {
        private String bankBaseRate;
        private String cofix;
        private String updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RateInfo {
        private String sixMonthRate; // 6개월 금리
        private String twoYearRate; // 2년 금리
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoanProduct {
        private String productCode;
        private String productName;
        private String productType;
        private String maxLimitAmount;
        private String baseInterestRate;
        private String minSpreadRate;
        private String maxSpreadRate;
        private String rateCycle;
        private String rate6m; // 6개월 금리
        private String rate2y; // 2년 금리
        private List<SpecialDiscount> specialDiscounts;
        private List<String> eligibilityConditions;
        private List<String> loanTerms;
        private List<String> repaymentMethods;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendedRates {
        private String sixMonth;
        private String twoYear;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SpecialDiscount {
        private String condition;
        private String discountRate;
    }
}
