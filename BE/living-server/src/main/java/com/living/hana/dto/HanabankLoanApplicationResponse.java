package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HanabankLoanApplicationResponse {
    private boolean success;
    private String message;
    private String error;
    private String applicationId;
    private String status;
}
