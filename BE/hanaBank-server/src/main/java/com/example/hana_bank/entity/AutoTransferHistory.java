package com.example.hana_bank.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutoTransferHistory {
    
    private Long id;
    
    private Long contractId;                 // 자동이체 계약 ID
    
    private LocalDateTime executionDate;     // 실제 실행일시
    
    private LocalDate scheduledDate;         // 원래 예정일
    
    private BigDecimal amount;               // 이체금액
    
    private String status;                   // SUCCESS, FAILED, PENDING
    
    private String failureReason;            // 실패 사유
    
    private String transactionId;            // 성공시 거래번호
    
    @Builder.Default
    private Integer retryCount = 0;          // 재시도 횟수
    
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private String fromAccount;              // 출금계좌번호

    private String toAccount;                // 입금계좌번호
    
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
    
    // 재시도 가능 여부 확인
    public boolean canRetry() {
        return isFailed() && retryCount < 3; // 최대 3회까지 재시도
    }
    
    // 재시도 횟수 증가
    public void incrementRetryCount() {
        this.retryCount++;
    }
    
    // 성공으로 상태 변경
    public void markAsSuccess(String transactionId) {
        this.status = "SUCCESS";
        this.transactionId = transactionId;
        this.failureReason = null;
    }
    
    // 실패로 상태 변경
    public void markAsFailed(String reason) {
        this.status = "FAILED";
        this.failureReason = reason;
        this.transactionId = null;
    }
    
    // 대기 상태로 변경
    public void markAsPending() {
        this.status = "PENDING";
        this.failureReason = null;
        this.transactionId = null;
    }
}