package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseRequest {

    private String category;        // 지출 분류
    private String description;     // 지출 내용
    private BigDecimal amount;      // 지출 금액
    private String expenseDate;     // 지출 일자 (YYYY-MM-DD)
    private Long buildingId;        // 건물별 지출 (선택)
    private Long createdBy;         // 등록자
}