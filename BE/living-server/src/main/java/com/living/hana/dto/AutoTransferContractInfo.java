package com.living.hana.dto;

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
public class AutoTransferContractInfo {
    
    private Long id;
    
    private String userCi;
    
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
    
    private Long totalExecutions;
    
    private Long successfulExecutions;
    
    private Long failedExecutions;
    
    private LocalDateTime lastExecutionDate;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
}