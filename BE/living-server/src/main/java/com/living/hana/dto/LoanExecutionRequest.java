package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanExecutionRequest {
    
    private String desiredExecutionDate;  // YYYY-MM-DD 형식
    private String landlordAccountNumber;
    private String landlordBankCode;
    private String landlordAccountHolder;
    private String contractFilePath;      // 업로드된 계약서 파일 경로
}