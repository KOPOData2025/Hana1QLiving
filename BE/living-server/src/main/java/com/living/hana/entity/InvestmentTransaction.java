package com.living.hana.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class InvestmentTransaction {
    
    private Long transactionId;
    private Long userId;
    private String userCi;  // userCi 필드 추가
    private String productId;
    private String orderId;
    private String transactionType; // BUY, SELL, DIVIDEND
    private Long quantity;
    private BigDecimal unitPrice;
    private BigDecimal transactionAmount;
    private BigDecimal fees;
    private BigDecimal tax;
    private BigDecimal netAmount;
    private LocalDateTime transactionDate;
    private LocalDate settlementDate;
    private String status; // PENDING, CONFIRMED, SETTLED, CANCELLED, FAILED
    private String channel; // APP, WEB, API
    private String brokerOrderId;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime executedAt;
    
    // 조인용 필드들
    private String productName;
    private String productCode;
    private String productType;

    public InvestmentTransaction() {}

    // Getters and Setters
    public Long getTransactionId() { return transactionId; }
    public void setTransactionId(Long transactionId) { this.transactionId = transactionId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUserCi() { return userCi; }
    public void setUserCi(String userCi) { this.userCi = userCi; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getTransactionType() { return transactionType; }
    public void setTransactionType(String transactionType) { this.transactionType = transactionType; }

    public Long getQuantity() { return quantity; }
    public void setQuantity(Long quantity) { this.quantity = quantity; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public BigDecimal getTransactionAmount() { return transactionAmount; }
    public void setTransactionAmount(BigDecimal transactionAmount) { this.transactionAmount = transactionAmount; }

    public BigDecimal getFees() { return fees; }
    public void setFees(BigDecimal fees) { this.fees = fees; }

    public BigDecimal getTax() { return tax; }
    public void setTax(BigDecimal tax) { this.tax = tax; }

    public BigDecimal getNetAmount() { return netAmount; }
    public void setNetAmount(BigDecimal netAmount) { this.netAmount = netAmount; }

    public LocalDateTime getTransactionDate() { return transactionDate; }
    public void setTransactionDate(LocalDateTime transactionDate) { this.transactionDate = transactionDate; }

    public LocalDate getSettlementDate() { return settlementDate; }
    public void setSettlementDate(LocalDate settlementDate) { this.settlementDate = settlementDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }

    public String getBrokerOrderId() { return brokerOrderId; }
    public void setBrokerOrderId(String brokerOrderId) { this.brokerOrderId = brokerOrderId; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public LocalDateTime getExecutedAt() { return executedAt; }
    public void setExecutedAt(LocalDateTime executedAt) { this.executedAt = executedAt; }

    // 조인용 필드 Getters and Setters
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }

    public String getProductType() { return productType; }
    public void setProductType(String productType) { this.productType = productType; }
    
    // 프론트엔드 호환성을 위한 별칭
    public BigDecimal getTotalAmount() { return this.transactionAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.transactionAmount = totalAmount; }
    
    public Integer getQuantityInt() { 
        return this.quantity != null ? this.quantity.intValue() : null; 
    }
    public void setQuantityInt(Integer quantity) { 
        this.quantity = quantity != null ? quantity.longValue() : null; 
    }
}