package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanAmountSettingRequest {
    private String approvalId;
    private BigDecimal requestedAmount;
    private String loanPurpose;
    
    private LandlordInfo landlordInfo;
    private ScheduleInfo schedules;
    private String specialNotes;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LandlordInfo {
        private String name;
        private String account;
        private String bank;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScheduleInfo {
        private String contractDate;
        private String paymentDate;
    }
}