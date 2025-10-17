package com.example.hana_bank.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImmediateTransferRequest {

    private Long id;

    private String userCi;                   // 고객 CI

    private String fromAccount;              // 출금계좌번호

    private String toAccount;                // 입금계좌번호

    private String toBankCode;               // 수취은행코드

    private String toBankName;               // 수취은행명

    private BigDecimal amount;               // 이체금액

    private String beneficiaryName;          // 수취인명

    private String memo;                     // 이체 메모

    @Builder.Default
    private String requestType = "MANAGEMENT_FEE";  // MANAGEMENT_FEE, RENT, OTHER

    private Long relatedId;                  // 관련 데이터 ID (관리비 청구 ID 등)

    @Builder.Default
    private String status = "PENDING";       // PENDING, SUCCESS, FAILED

    private String transactionId;            // 성공시 거래번호

    private String failureReason;            // 실패 사유

    private LocalDateTime requestedAt;

    private LocalDateTime processedAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // 상태 확인 메서드들
    public boolean isSuccess() {
        return "SUCCESS".equals(status);
    }

    public boolean isFailed() {
        return "FAILED".equals(status);
    }

    public boolean isPending() {
        return "PENDING".equals(status);
    }

    // 성공으로 상태 변경
    public void markAsSuccess(String transactionId) {
        this.status = "SUCCESS";
        this.transactionId = transactionId;
        this.failureReason = null;
        this.processedAt = LocalDateTime.now();
    }

    // 실패로 상태 변경
    public void markAsFailed(String reason) {
        this.status = "FAILED";
        this.failureReason = reason;
        this.transactionId = null;
        this.processedAt = LocalDateTime.now();
    }

    // 대기 상태로 변경
    public void markAsPending() {
        this.status = "PENDING";
        this.failureReason = null;
        this.transactionId = null;
        this.processedAt = null;
    }
}