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
public class AccountTransaction {

    private Long id;

    private String accountNumber;           // 거래 계좌번호

    private String transactionType;         // DEPOSIT, WITHDRAWAL, TRANSFER_OUT, TRANSFER_IN

    private BigDecimal amount;              // 거래 금액

    private BigDecimal balanceBefore;       // 거래 전 잔액

    private BigDecimal balanceAfter;        // 거래 후 잔액

    private String transactionId;           // 고유 거래번호

    private String description;             // 거래 설명/메모

    private String relatedAccount;          // 상대방 계좌번호 (이체시)

    private String relatedBankCode;         // 상대방 은행코드 (이체시)

    private String relatedBankName;         // 상대방 은행명 (이체시)

    private String category;                // 거래 카테고리 (RENT, MANAGEMENT_FEE, GENERAL 등)

    private String status;                  // SUCCESS, FAILED, PENDING

    private LocalDateTime createdAt;        // 거래일시

    private LocalDateTime updatedAt;        // 수정일시

    // 거래 유형 상수
    public static final String TYPE_DEPOSIT = "DEPOSIT";
    public static final String TYPE_WITHDRAWAL = "WITHDRAWAL";
    public static final String TYPE_TRANSFER_OUT = "TRANSFER_OUT";
    public static final String TYPE_TRANSFER_IN = "TRANSFER_IN";

    // 거래 카테고리 상수
    public static final String CATEGORY_RENT = "RENT";
    public static final String CATEGORY_MANAGEMENT_FEE = "MANAGEMENT_FEE";
    public static final String CATEGORY_GENERAL = "GENERAL";

    // 상태 상수
    public static final String STATUS_SUCCESS = "SUCCESS";
    public static final String STATUS_FAILED = "FAILED";
    public static final String STATUS_PENDING = "PENDING";

    // 편의 메서드들
    public boolean isDeposit() {
        return TYPE_DEPOSIT.equals(transactionType);
    }

    public boolean isWithdrawal() {
        return TYPE_WITHDRAWAL.equals(transactionType);
    }

    public boolean isTransferOut() {
        return TYPE_TRANSFER_OUT.equals(transactionType);
    }

    public boolean isTransferIn() {
        return TYPE_TRANSFER_IN.equals(transactionType);
    }

    public boolean isSuccess() {
        return STATUS_SUCCESS.equals(status);
    }

    public boolean isFailed() {
        return STATUS_FAILED.equals(status);
    }

    public boolean isPending() {
        return STATUS_PENDING.equals(status);
    }

    // 거래 타입별 설명 생성 헬퍼
    public String generateDescription() {
        if (description != null && !description.trim().isEmpty()) {
            return description;
        }

        switch (transactionType) {
            case TYPE_DEPOSIT:
                return "입금";
            case TYPE_WITHDRAWAL:
                return "출금";
            case TYPE_TRANSFER_OUT:
                return relatedAccount != null ?
                    String.format("이체 출금 (%s)", relatedAccount) : "이체 출금";
            case TYPE_TRANSFER_IN:
                return relatedAccount != null ?
                    String.format("이체 입금 (%s)", relatedAccount) : "이체 입금";
            default:
                return "기타 거래";
        }
    }
}