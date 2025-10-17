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
public class Payment {
    
    private Long id;
    private Long contractId;      // 계약 ID
    private Long userId;          // 사용자 ID
    private Long unitId;          // 호실 ID
    private Long buildingId;      // 건물 ID
    private String paymentType;   // MONTHLY_RENT, MAINTENANCE_FEE, UTILITY, OTHER
    private String paymentCategory; // RENT, MANAGEMENT_FEE (DDL에서 추가된 필드)
    private String title;         // 납부 제목 (예: "2024년 1월 월세", "2024년 1월 관리비")
    private String description;   // 납부 설명
    private BigDecimal amount;    // 납부 금액
    private String dueDate;       // 납부 기한 (YYYY-MM-DD)
    private String status;        // PENDING, PAID, OVERDUE
    private String paidDate;      // 납부일 (YYYY-MM-DD HH:mm:ss)
    private String paymentDate;   // 결제일 (YYYY-MM-DD)
    private String paymentMethod; // BANK_TRANSFER, CARD, CASH
    private Long managementChargeId; // 관리비 청구 ID (DDL에서 추가된 필드)
    private String hanaBankTransactionId; // 하나은행 거래 ID (DDL에서 추가된 필드)
    private String createdAt;     // 생성일
    private String updatedAt;     // 수정일

    // JOIN 조회 시 추가 정보
    private String unitNumber;    // 호실 번호
    private String buildingName;  // 건물명
    private String userName;      // 사용자명
}