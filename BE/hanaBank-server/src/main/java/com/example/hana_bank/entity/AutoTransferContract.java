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
public class AutoTransferContract {
    
    private Long id;
    
    private String userCi;                   // 고객 CI
    
    private String fromAccount;              // 출금계좌
    
    private String toAccount;                // 입금계좌 (하나원큐리빙)
    
    private String toBankCode;               // 수취은행 코드
    
    private String toBankName;               // 수취은행명
    
    private BigDecimal amount;               // 이체금액
    
    private Integer transferDay;             // 매월 이체일 (1~31)
    
    private String beneficiaryName;          // 수취인명
    
    private String memo;                     // 이체 메모
    
    @Builder.Default
    private String status = "ACTIVE";        // ACTIVE, SUSPENDED, CANCELLED
    
    private LocalDate nextTransferDate;      // 다음 이체 예정일
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    // 통계 필드들 (실행 시점에 계산되어 설정됨)
    private Long totalExecutions;
    
    private Long successfulExecutions;
    
    private Long failedExecutions;
    
    private LocalDateTime lastExecutionDate;
    
    // 상태 확인 메서드들
    public boolean isActive() {
        return "ACTIVE".equals(status);
    }
    
    public boolean isSuspended() {
        return "SUSPENDED".equals(status);
    }
    
    public boolean isCancelled() {
        return "CANCELLED".equals(status);
    }
    
    // 다음 이체일 계산 메서드
    public LocalDate calculateNextTransferDate() {
        LocalDate now = LocalDate.now();
        LocalDate nextDate = now.withDayOfMonth(Math.min(transferDay, now.lengthOfMonth()));
        
        // 이번 달 이체일이 지났으면 다음 달로
        if (nextDate.isBefore(now) || nextDate.isEqual(now)) {
            LocalDate nextMonth = now.plusMonths(1);
            nextDate = nextMonth.withDayOfMonth(Math.min(transferDay, nextMonth.lengthOfMonth()));
        }
        
        return nextDate;
    }
    
    // 이체 가능 여부 확인
    public boolean canExecuteTransfer() {
        return isActive() && nextTransferDate != null && 
               (nextTransferDate.isBefore(LocalDate.now()) || nextTransferDate.isEqual(LocalDate.now()));
    }
}