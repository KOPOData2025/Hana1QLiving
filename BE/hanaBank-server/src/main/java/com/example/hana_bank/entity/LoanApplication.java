package com.example.hana_bank.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanApplication {
    private Long applicationId;
    private String applicationNumber;
    private String userCi;
    private String address;
    private String selectedLoanProduct; // 선택한 대출 상품명
    private String status;
    private LocalDateTime submittedAt;
    private LocalDateTime updatedAt;
    
    // 검토 관련 필드들
    private String reviewerId;
    private LocalDateTime reviewDate;
    private String decision;
    private String reviewComments;
    private Long approvedAmount;
    private Double interestRate;
    private Integer loanTerm; // 대출 기간 (개월)
}
