package com.example.hana_bank.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanReviewRequestDto {
    private String status; // UNDER_REVIEW, APPROVED, REJECTED
    private String decision; // APPROVED, REJECTED
    private String comments;
    private Long approvedAmount;
    private Double interestRate;
    private Integer loanTerm; // 대출 기간 (개월)
}
