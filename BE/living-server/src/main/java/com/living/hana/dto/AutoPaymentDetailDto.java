package com.living.hana.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutoPaymentDetailDto {

    private Long id;
    private Long userId;
    private Long unitId;
    private Long contractId;
    private Long linkedAccountId;
    private BigDecimal monthlyRent;
    private Integer paymentDay;
    private String status;
    private String lastPaymentStatus;
    private String failureReason;
    private Integer failureCount;

    // 조인된 정보
    private String accountNumber;
    private String accountName;
    private String buildingName;
    private String unitNumber;
    private String userName;
    private String contractNumber;

    // 계산된 정보
    private String nextTransferDate; // 다음 이체일 (YYYY-MM-DD 형식)
    private boolean isActive;

    // 다음 이체일 계산 메서드
    public void calculateNextTransferDate() {
        if (paymentDay == null || paymentDay <= 0 || paymentDay > 31) {
            this.nextTransferDate = "설정되지 않음";
            return;
        }

        LocalDate today = LocalDate.now();
        LocalDate nextTransfer;

        // 이번 달 이체일
        LocalDate thisMonthTransfer = today.withDayOfMonth(Math.min(paymentDay, today.lengthOfMonth()));

        if (today.isBefore(thisMonthTransfer) || today.isEqual(thisMonthTransfer)) {
            // 이번 달 이체일이 아직 지나지 않았으면 이번 달
            nextTransfer = thisMonthTransfer;
        } else {
            // 이번 달 이체일이 지났으면 다음 달
            LocalDate nextMonth = today.plusMonths(1);
            nextTransfer = nextMonth.withDayOfMonth(Math.min(paymentDay, nextMonth.lengthOfMonth()));
        }

        this.nextTransferDate = nextTransfer.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
    }

    // 활성화 상태 설정
    public void setActiveStatus(boolean active) {
        this.isActive = active;
    }
}