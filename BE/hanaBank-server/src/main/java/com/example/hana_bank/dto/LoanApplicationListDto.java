package com.example.hana_bank.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.example.hana_bank.entity.LoanApplicationDocument;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanApplicationListDto {
    private Long applicationId;
    private String applicationNumber;
    private String userName;
    private String userCi;
    private String address;
    private String selectedLoanProduct; // 선택한 대출 상품명
    private String status;
    private LocalDateTime submittedAt;
    private LocalDateTime updatedAt;
    private String reviewerName;
    private String decision;
    private String reviewComments;
    private Long approvedAmount;
    private Double interestRate;
    private Integer loanTerm; // 대출 기간 (개월)
    private List<LoanApplicationDocument> documents;
}
