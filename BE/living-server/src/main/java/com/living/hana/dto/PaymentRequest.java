package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequest {
    
    private Long buildingId;      // 건물 ID (새 납부 고지 시 사용)
    private String paymentType;   // MONTHLY_RENT, MAINTENANCE_FEE, UTILITY, OTHER
    private String title;         // 납부 제목
    private String description;   // 납부 설명
    private BigDecimal amount;    // 납부 금액
    private String dueDate;       // 납부 기한 (YYYY-MM-DD)
}
