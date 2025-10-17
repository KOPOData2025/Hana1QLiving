package com.example.hana_bank.dto;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AutoTransferRegisterResponse {
    
    private Long contractId;
    
    private String fromAccount;
    
    private String toAccount;
    
    private String toBankCode;
    
    private String toBankName;
    
    private BigDecimal amount;
    
    private Integer transferDay;
    
    private String beneficiaryName;
    
    private String memo;
    
    private LocalDate nextTransferDate;
    
    private String status;

    private Boolean success;

    private String transactionId;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}