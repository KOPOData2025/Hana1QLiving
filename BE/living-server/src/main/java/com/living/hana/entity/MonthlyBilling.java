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
public class MonthlyBilling {
    
    private Long id;

    private Long userId;                 // 사용자 ID

    private Long contractId;             // 계약 ID

    private String billingMonth;         // 청구월 (YYYY-MM)

    private String buildingName;         // 건물명

    private String unitNumber;           // 호실

    // MANAGEMENT_FEE_CHARGES 테이블 호환성을 위한 추가 속성들
    private Long unitId;                 // 호실 ID
    private Long chargedByUserId;        // 청구한 관리자 ID
    private String chargeDescription;    // 청구 사유
    private String chargeDate;           // 청구 일자
    private String autoPaymentTriggered; // 자동이체 트리거 여부
    private Long paymentId;              // 결제 ID
    
    // 각종 요금 항목
    private BigDecimal managementFee;    // 관리비
    private BigDecimal waterFee;         // 수도요금
    private BigDecimal electricityFee;   // 전기요금
    private BigDecimal gasFee;           // 가스요금
    private BigDecimal cleaningFee;      // 청소비
    private BigDecimal securityFee;      // 경비비
    private BigDecimal parkingFee;       // 주차비
    private BigDecimal otherFee;         // 기타요금
    
    private BigDecimal totalAmount;      // 총 청구금액
    
    private String dueDate;              // 납부기한 (MANAGEMENT_FEE_CHARGES 호환용)

    @Builder.Default
    private String status = "PENDING";   // PENDING, PAID, FAILED, OVERDUE

    private String paidAt;               // 납부일시 (MANAGEMENT_FEE_CHARGES 호환용)

    private String transactionId;        // 거래번호 (납부 완료시)

    private String failureReason;        // 납부 실패 사유

    private String createdAt;            // 청구서 생성일시 (MANAGEMENT_FEE_CHARGES 호환용)

    private String updatedAt;            // 수정일시 (MANAGEMENT_FEE_CHARGES 호환용)
    
    // 상태 확인 메서드들
    public boolean isPending() {
        return "PENDING".equals(status);
    }
    
    public boolean isPaid() {
        return "PAID".equals(status);
    }
    
    public boolean isFailed() {
        return "FAILED".equals(status);
    }
    
    public boolean isOverdue() {
        return "OVERDUE".equals(status);
    }
    
    // 총 금액 계산
    public BigDecimal calculateTotal() {
        BigDecimal total = BigDecimal.ZERO;
        if (managementFee != null) total = total.add(managementFee);
        if (waterFee != null) total = total.add(waterFee);
        if (electricityFee != null) total = total.add(electricityFee);
        if (gasFee != null) total = total.add(gasFee);
        if (cleaningFee != null) total = total.add(cleaningFee);
        if (securityFee != null) total = total.add(securityFee);
        if (parkingFee != null) total = total.add(parkingFee);
        if (otherFee != null) total = total.add(otherFee);
        return total;
    }
}