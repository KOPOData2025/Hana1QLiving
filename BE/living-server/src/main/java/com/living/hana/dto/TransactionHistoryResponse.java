package com.living.hana.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionHistoryResponse {

    private boolean success;
    private String message;
    private List<TransactionInfo> transactions;
    private int totalCount;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransactionInfo {
        private Long id;
        private String accountNumber;
        private String transactionType;
        private BigDecimal amount;
        private BigDecimal balanceBefore;
        private BigDecimal balanceAfter;
        private String transactionId;
        private String description;
        private String relatedAccount;
        private String relatedBankCode;
        private String relatedBankName;
        private String category;
        private String status;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}