package com.living.hana.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Expense {

    private Long id;
    private String category;        // 지출 분류
    private String description;     // 지출 내용
    private BigDecimal amount;      // 지출 금액
    private String expenseDate;     // 지출 일자 (DATE -> String for consistency)
    private Long buildingId;        // 건물별 지출 (선택)
    private Long createdBy;         // 등록자
    private String createdAt;       // 생성일 (TIMESTAMP -> String)

    // JOIN 조회 시 추가 정보
    private String buildingName;    // 건물명
    private String createdByName;   // 등록자명
}