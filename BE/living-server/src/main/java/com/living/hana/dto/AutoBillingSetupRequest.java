package com.living.hana.dto;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AutoBillingSetupRequest {
    
    private Long contractId;
    
    private String fromAccount;
    
    private Integer billingDay;
    
    private String memo;
}