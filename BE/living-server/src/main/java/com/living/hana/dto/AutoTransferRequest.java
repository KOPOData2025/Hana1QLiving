package com.living.hana.dto;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AutoTransferRequest {
    
    private String fromAccount;
    
    private String toAccount;
    
    private String toBankCode;
    
    private String toBankName;
    
    private BigDecimal amount;
    
    private Integer transferDay;
    
    private String beneficiaryName;
    
    private String memo;
}