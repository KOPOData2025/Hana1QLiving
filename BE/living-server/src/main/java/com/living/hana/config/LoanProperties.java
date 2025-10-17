package com.living.hana.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "loan.default")
public class LoanProperties {
    
    /**
     * 기본 임대인 계좌번호
     * application.yml의 loan.default.landlord-account 값
     */
    private String landlordAccount;
}