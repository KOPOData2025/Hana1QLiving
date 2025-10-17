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
public class AutoTransferResponse {
    
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

    private String transactionId;

    private Boolean success;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // 편의 메서드들
    public boolean isSuccess() {
        return Boolean.TRUE.equals(success) || "SUCCESS".equals(status);
    }

    public String getTransactionId() {
        return this.transactionId;
    }
}