package com.example.hana_bank.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanProductCreateDto {
    private String productName;
    private String productDescription;
    private Double interestRate;
    private Long maxLoanAmount;
    private Integer maxLoanPeriod;
    private String eligibilityRequirements;
    private String status;
}
