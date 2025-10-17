package com.living.hana.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InvestmentOrder {
    private Long id;
    private Long userId;
    private String orderId;
    private String orderType; // BUY, SELL
    private String productId;
    private String productName;
    private Integer quantity;
    private Long amount;
    private String orderStatus; // PENDING, COMPLETED, FAILED, CANCELLED
    private String accountNumber;
    private String userCi;
    private Boolean mockProcessed;
    private String orderTime;
    private String completedTime;
    private String errorMessage;
    private String createdAt;
    private String updatedAt;
}