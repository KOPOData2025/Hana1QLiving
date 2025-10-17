package com.living.hana.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 월세 결제 기록 생성 요청 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RentPaymentRecordRequest {

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
}