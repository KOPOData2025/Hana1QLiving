package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HanabankTransferResponse {
    
    private String transactionId;      // 거래 ID
    private String status;             // SUCCESS, FAILED
    private String transferDate;       // 송금 일시
    private BigDecimal amount;         // 송금 금액
    private String fromAccount;        // 출금 계좌
    private String toAccount;          // 입금 계좌
    private String message;           // 결과 메시지
    private String errorCode;         // 오류 코드 (실패시)
    private String errorMessage;      // 오류 메시지 (실패시)
}