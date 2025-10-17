package com.example.hana_bank.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanApplicationDetailDto {
    private Long applicationId;
    private String applicationNumber;
    private String userName;
    private String userCi;
    private String address;
    private String status;
    private LocalDateTime submittedAt;
    private LocalDateTime updatedAt;
    private List<DocumentInfo> documents;
    private ReviewInfo review;
    private List<StatusHistory> statusHistory;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DocumentInfo {
        private String documentType;
        private String fileName;
        private String fileUrl;
        private LocalDateTime uploadedAt;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewInfo {
        private String reviewerName;
        private LocalDateTime reviewDate;
        private String decision;
        private String comments;
        private Long approvedAmount;
        private Double interestRate;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusHistory {
        private String status;
        private String changedBy;
        private LocalDateTime changedAt;
        private String comments;
    }
}
