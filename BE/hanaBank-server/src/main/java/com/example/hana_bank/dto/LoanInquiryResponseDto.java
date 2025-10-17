package com.example.hana_bank.dto;

import java.util.List;

public class LoanInquiryResponseDto {
    private boolean success;
    private String message;
    private LoanInquiryData data;

    public LoanInquiryResponseDto() {}

    public LoanInquiryResponseDto(boolean success, String message, LoanInquiryData data) {
        this.success = success;
        this.message = message;
        this.data = data;
    }

    public static class LoanInquiryData {
        private CustomerEligibility customerEligibility;
        private List<AvailableProduct> availableProducts;
        private List<AvailableProduct> recommendations; // 프론트엔드 호환성
        private MarketRates marketRates;
        private String recommendedLoanAmount;
        private String calculatedSpreadRate;
        private String finalInterestRate;
        private RecommendedRates recommendedRates;

        // 프론트엔드에서 기대하는 추가 필드들
        private String baseRate;
        private String spread;
        private String totalRate;
        private String cycle;

        public CustomerEligibility getCustomerEligibility() { return customerEligibility; }
        public void setCustomerEligibility(CustomerEligibility customerEligibility) { this.customerEligibility = customerEligibility; }

        public List<AvailableProduct> getAvailableProducts() { return availableProducts; }
        public void setAvailableProducts(List<AvailableProduct> availableProducts) { this.availableProducts = availableProducts; }

        public MarketRates getMarketRates() { return marketRates; }
        public void setMarketRates(MarketRates marketRates) { this.marketRates = marketRates; }

        public String getRecommendedLoanAmount() { return recommendedLoanAmount; }
        public void setRecommendedLoanAmount(String recommendedLoanAmount) { this.recommendedLoanAmount = recommendedLoanAmount; }

        public String getCalculatedSpreadRate() { return calculatedSpreadRate; }
        public void setCalculatedSpreadRate(String calculatedSpreadRate) { this.calculatedSpreadRate = calculatedSpreadRate; }

        public String getFinalInterestRate() { return finalInterestRate; }
        public void setFinalInterestRate(String finalInterestRate) { this.finalInterestRate = finalInterestRate; }

        public RecommendedRates getRecommendedRates() { return recommendedRates; }
        public void setRecommendedRates(RecommendedRates recommendedRates) { this.recommendedRates = recommendedRates; }

        // 프론트엔드 호환성을 위한 getter/setter
        public List<AvailableProduct> getRecommendations() { return recommendations; }
        public void setRecommendations(List<AvailableProduct> recommendations) { this.recommendations = recommendations; }

        public String getBaseRate() { return baseRate; }
        public void setBaseRate(String baseRate) { this.baseRate = baseRate; }

        public String getSpread() { return spread; }
        public void setSpread(String spread) { this.spread = spread; }

        public String getTotalRate() { return totalRate; }
        public void setTotalRate(String totalRate) { this.totalRate = totalRate; }

        public String getCycle() { return cycle; }
        public void setCycle(String cycle) { this.cycle = cycle; }
    }

    public static class CustomerEligibility {
        private boolean isEligible;
        private String creditGrade;
        private String dtiRatio;
        private String dsrRatio;
        private String riskLevel;

        public CustomerEligibility() {}

        public CustomerEligibility(boolean isEligible, String creditGrade, String dtiRatio, String dsrRatio, String riskLevel) {
            this.isEligible = isEligible;
            this.creditGrade = creditGrade;
            this.dtiRatio = dtiRatio;
            this.dsrRatio = dsrRatio;
            this.riskLevel = riskLevel;
        }

        public boolean isEligible() { return isEligible; }
        public void setEligible(boolean eligible) { isEligible = eligible; }

        public String getCreditGrade() { return creditGrade; }
        public void setCreditGrade(String creditGrade) { this.creditGrade = creditGrade; }

        public String getDtiRatio() { return dtiRatio; }
        public void setDtiRatio(String dtiRatio) { this.dtiRatio = dtiRatio; }

        public String getDsrRatio() { return dsrRatio; }
        public void setDsrRatio(String dsrRatio) { this.dsrRatio = dsrRatio; }

        public String getRiskLevel() { return riskLevel; }
        public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }
    }

    public static class AvailableProduct {
        private String productName;
        private String maxLimitAmount;
        private String maxLimit; // 프론트엔드에서 기대하는 필드명
        private String rate6m;
        private String rate2y;

        public AvailableProduct() {}

        public AvailableProduct(String productName, String maxLimitAmount, String rate6m, String rate2y) {
            this.productName = productName;
            this.maxLimitAmount = maxLimitAmount;
            this.maxLimit = maxLimitAmount; // 프론트엔드 호환성
            this.rate6m = rate6m;
            this.rate2y = rate2y;
        }

        public String getProductName() { return productName; }
        public void setProductName(String productName) { this.productName = productName; }

        public String getMaxLimitAmount() { return maxLimitAmount; }
        public void setMaxLimitAmount(String maxLimitAmount) {
            this.maxLimitAmount = maxLimitAmount;
            this.maxLimit = maxLimitAmount; // 프론트엔드 호환성
        }

        public String getMaxLimit() { return maxLimit; }
        public void setMaxLimit(String maxLimit) { this.maxLimit = maxLimit; }

        public String getRate6m() { return rate6m; }
        public void setRate6m(String rate6m) { this.rate6m = rate6m; }

        public String getRate2y() { return rate2y; }
        public void setRate2y(String rate2y) { this.rate2y = rate2y; }
    }

    public static class MarketRates {
        private String bankBaseRate;
        private String cofix;

        public MarketRates() {}

        public MarketRates(String bankBaseRate, String cofix) {
            this.bankBaseRate = bankBaseRate;
            this.cofix = cofix;
        }

        public String getBankBaseRate() { return bankBaseRate; }
        public void setBankBaseRate(String bankBaseRate) { this.bankBaseRate = bankBaseRate; }

        public String getCofix() { return cofix; }
        public void setCofix(String cofix) { this.cofix = cofix; }
    }

    public static class RecommendedRates {
        private String sixMonth;
        private String twoYear;

        public RecommendedRates() {}

        public RecommendedRates(String sixMonth, String twoYear) {
            this.sixMonth = sixMonth;
            this.twoYear = twoYear;
        }

        public String getSixMonth() { return sixMonth; }
        public void setSixMonth(String sixMonth) { this.sixMonth = sixMonth; }

        public String getTwoYear() { return twoYear; }
        public void setTwoYear(String twoYear) { this.twoYear = twoYear; }
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public LoanInquiryData getData() { return data; }
    public void setData(LoanInquiryData data) { this.data = data; }
}
