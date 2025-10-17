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
public class AutoPaymentSetupRequest {
    
    private Long contractId;
    
    private String fromAccount;
    
    private BigDecimal amount;
    
    private Integer transferDay;
}