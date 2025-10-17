package com.example.hana_bank.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
public class LoanApplicationResponseDto {
    private boolean success;
    private String message;
    private String error;
    private ApplicationData data;
    private List<ValidationDetail> details;
    
    public LoanApplicationResponseDto(boolean success, String message, String error, ApplicationData data, List<ValidationDetail> details) {
        this.success = success;
        this.message = message;
        this.error = error;
        this.data = data;
        this.details = details;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApplicationData {
        private String applicationId;
        private String status;
        private LocalDateTime submittedAt;
        private String estimatedReviewTime;
        private List<String> nextSteps;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValidationDetail {
        private String field;
        private String message;
    }
    
    public static LoanApplicationResponseDto success(ApplicationData data) {
        return new LoanApplicationResponseDto(true, "대출 심사 신청이 성공적으로 접수되었습니다.", null, data, null);
    }
    
    public static LoanApplicationResponseDto error(String error, String message, List<ValidationDetail> details) {
        return new LoanApplicationResponseDto(false, message, error, null, details);
    }
}
