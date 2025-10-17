package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HanabankTransferRequest {
    
    private String fromAccountNumber;    // 하나은행 계좌 (대출 실행용)
    private String toAccountNumber;      // 집주인 계좌
    private String toBankCode;           // 집주인 은행 코드
    private String toAccountHolder;      // 집주인 예금주명
    private BigDecimal amount;           // 송금 금액
    private String transferPurpose;      // 송금 목적 (대출실행)
    private String memo;                 // 송금 메모
    private String loanNumber;           // 대출 번호
}