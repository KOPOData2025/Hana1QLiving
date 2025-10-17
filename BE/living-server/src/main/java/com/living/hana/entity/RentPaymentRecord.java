package com.living.hana.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 월세 결제 기록 엔티티
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RentPaymentRecord {

    private Long id;
    private Long contractId;
    private Long userId;
    private Long unitId;
    private BigDecimal amount;
    private LocalDateTime paymentDate;
    private String hanabankTransactionId;
    private String fromAccount;
    private String toAccount;
    private String status;
    private String failureReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 조인용 필드들
    private String userName;
    private String unitNumber;
    private String buildingName;
    private Integer floor;

    // 상태 상수
    public static final String STATUS_COMPLETED = "COMPLETED";
    public static final String STATUS_FAILED = "FAILED";
    public static final String STATUS_PENDING = "PENDING";

    /**
     * 성공 상태 확인
     */
    public boolean isCompleted() {
        return STATUS_COMPLETED.equals(this.status);
    }

    /**
     * 실패 상태 확인
     */
    public boolean isFailed() {
        return STATUS_FAILED.equals(this.status);
    }

    /**
     * 대기 상태 확인
     */
    public boolean isPending() {
        return STATUS_PENDING.equals(this.status);
    }
}