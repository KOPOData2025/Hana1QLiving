package com.example.hana_bank.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanCreateDto {
    private String userCi;           // 대출받을 사용자 CI
    private Long productId;          // 대출상품 ID
    private BigDecimal loanAmount;   // 대출금액
    private BigDecimal interestRate; // 금리
    private Integer loanPeriod;      // 대출기간(개월)
    private LocalDate startDate;     // 시작일
    private String notes;            // 관리자 메모
}
