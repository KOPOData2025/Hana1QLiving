package com.example.hana_bank.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanStatusResponseDto {
    private boolean success;
    private String message;
    private String error;
    private List<LoanApplication> applications;
    
    public static LoanStatusResponseDto success(List<LoanApplication> applications) {
        return new LoanStatusResponseDto(true, "대출 상황 조회 성공", null, applications);
    }
    
    public static LoanStatusResponseDto error(String error, String message) {
        return new LoanStatusResponseDto(false, message, error, null);
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoanApplication {
        private String id;
        private String loanType;
        private Long loanAmount;
        private Long maxAmount;
        private String status;
        private int progress;
        private int currentStep;
        private int totalSteps;
        private LocalDateTime submittedAt;
        private LocalDateTime expectedCompletionDate;
        private Documents documents;
        private String address;
        private boolean addressCorrect;
        private String newAddress;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Documents {
        private boolean leaseContract;
        private boolean residentCopy;
        private boolean incomeProof;
        private boolean bankbook;
    }
}
