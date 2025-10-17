package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanContractResponse {
    private String contractNumber;
    private String status;
    private String message;
    private String scheduledDate;
    private String scheduledTime;
    private String hanaBankReference; // 하나은행 참조번호
}