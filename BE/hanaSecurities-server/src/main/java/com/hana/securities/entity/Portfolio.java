package com.hana.securities.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Portfolio {
    private Long id;
    private Long userId;
    private String productId;
    private String productName;
    private String productType;
    private Integer quantity;
    private BigDecimal avgPurchasePrice;
    private BigDecimal totalInvestedAmount;
    private BigDecimal currentPrice;
    private BigDecimal currentValue;
    private BigDecimal unrealizedGainLoss;
    private BigDecimal unrealizedReturnRate;
    private String status;
    private LocalDateTime firstPurchaseDate;
    private LocalDateTime lastPurchaseDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}