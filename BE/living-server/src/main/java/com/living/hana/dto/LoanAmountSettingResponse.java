package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanAmountSettingResponse {
    private String status;
    private String message;
    private String applicationNumber;
    private String contractDate;
    private String paymentDate;
}