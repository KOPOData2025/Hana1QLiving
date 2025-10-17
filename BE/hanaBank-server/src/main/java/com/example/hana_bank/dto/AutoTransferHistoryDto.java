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
public class AutoTransferHistoryDto {
    
    private Long id;
    
    private Long contractId;
    
    private LocalDateTime executionDate;
    
    private LocalDate scheduledDate;
    
    private BigDecimal amount;
    
    private String status;
    
    private String transactionId;
    
    private String failureReason;
    
    private Integer retryCount;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
}