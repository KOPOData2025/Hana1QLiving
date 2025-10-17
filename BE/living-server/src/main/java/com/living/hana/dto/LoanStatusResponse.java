package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanStatusResponse {
    private boolean success;
    private String message;
    private List<LoanApplication> applications;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoanApplication {
        private String id;
        private String loanType;
        private Integer loanAmount;
        private Integer maxAmount;
        private String status;
        private Integer progress;
        private Integer currentStep;
        private Integer totalSteps;
        private String submittedAt;
        private String expectedCompletionDate;
        private DocumentStatus documents;
        private String address;
        private Boolean addressCorrect;
        private String newAddress;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DocumentStatus {
        private Boolean leaseContract;
        private Boolean residentCopy;
        private Boolean incomeProof;
        private Boolean bankbook;
    }
}
