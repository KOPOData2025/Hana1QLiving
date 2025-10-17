package com.living.hana.dto;

import com.living.hana.entity.RentPaymentRecord;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 월세 결제 이력 응답 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RentPaymentHistoryResponse {

    private Long userId;
    private String userName;
    private List<RentPaymentRecord> rentTransactions;
    private int totalCount;
    private boolean success;
    private String message;

    public static RentPaymentHistoryResponse success(Long userId, String userName, List<RentPaymentRecord> transactions) {
        return RentPaymentHistoryResponse.builder()
                .userId(userId)
                .userName(userName)
                .rentTransactions(transactions)
                .totalCount(transactions != null ? transactions.size() : 0)
                .success(true)
                .message("월세 결제 이력을 성공적으로 조회했습니다.")
                .build();
    }

    public static RentPaymentHistoryResponse error(String message) {
        return RentPaymentHistoryResponse.builder()
                .success(false)
                .message(message)
                .totalCount(0)
                .build();
    }
}