package com.living.hana.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Contract {
    
    private Long id;
    private Long userId;
    private Long unitId;
    private String contractNumber;
    private String startDate;
    private String endDate;
    private BigDecimal deposit; // 보증금
    private BigDecimal monthlyRent; // 월세
    private String status; // ACTIVE, EXPIRED, TERMINATED
    private String moveInDate; // 입주일 (YYYY-MM-DD)
    private Integer paymentDay; // 납부일 (1-31일, 입주일 기준)
    private String contractImageUrl; // 계약서 이미지 URL
    private String createdAt;
    private String updatedAt;
}
