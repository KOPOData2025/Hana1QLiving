package com.living.hana.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanInquiryResponse {
    private boolean success;
    private LoanInquiryData data;
    private String message;
    private String error;
    
    public LoanInquiryResponse(boolean success, LoanInquiryData data, String message) {
        this.success = success;
        this.data = data;
        this.message = message;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoanInquiryData {
        private String loanLimit;
        private InterestRateInfo interestRate;
        private String baseRate;
        private String spread;
        private String totalRate;
        private String cycle;
        private List<LoanRecommendation> recommendations;
        private CustomerEligibility customerEligibility;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InterestRateInfo {
        @JsonProperty("6month")
        private String sixMonth;
        @JsonProperty("2year")
        private String twoYear;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoanRecommendation {
        private String productName;
        private String maxLimit;
        private String rate6m;
        private String rate2y;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerEligibility {
        private boolean eligible;
        private String creditGrade;
        private String dtiRatio;
        private String dsrRatio;
        private String riskLevel;
    }
}
