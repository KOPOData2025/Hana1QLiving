package com.living.hana.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class OrderResponse {
    
    private boolean success;
    private String message;
    private Long transactionId;
    private String orderId;
    private String brokerOrderId;
    private String status;
    private String orderType;
    private String productId;
    private String productName;
    private Long quantity;
    private BigDecimal unitPrice;
    private BigDecimal totalAmount;
    private BigDecimal fees;
    private BigDecimal tax;
    private BigDecimal netAmount;
    private LocalDateTime transactionDate;
    private String errorCode;
    private String errorMessage;

    public OrderResponse() {}

    public OrderResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    // 성공 응답 생성
    public static OrderResponse success(Long transactionId, String orderId, String status, 
                                      String orderType, String productId, String productName,
                                      Long quantity, BigDecimal unitPrice, BigDecimal totalAmount,
                                      BigDecimal fees, BigDecimal tax, BigDecimal netAmount,
                                      LocalDateTime transactionDate, String message) {
        OrderResponse response = new OrderResponse();
        response.success = true;
        response.message = message;
        response.transactionId = transactionId;
        response.orderId = orderId;
        response.status = status;
        response.orderType = orderType;
        response.productId = productId;
        response.productName = productName;
        response.quantity = quantity;
        response.unitPrice = unitPrice;
        response.totalAmount = totalAmount;
        response.fees = fees;
        response.tax = tax;
        response.netAmount = netAmount;
        response.transactionDate = transactionDate;
        return response;
    }

    // 실패 응답 생성
    public static OrderResponse failure(String message, String errorCode, String errorMessage) {
        OrderResponse response = new OrderResponse();
        response.success = false;
        response.message = message;
        response.errorCode = errorCode;
        response.errorMessage = errorMessage;
        return response;
    }

    // Getters and Setters
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Long getTransactionId() { return transactionId; }
    public void setTransactionId(Long transactionId) { this.transactionId = transactionId; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getBrokerOrderId() { return brokerOrderId; }
    public void setBrokerOrderId(String brokerOrderId) { this.brokerOrderId = brokerOrderId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getOrderType() { return orderType; }
    public void setOrderType(String orderType) { this.orderType = orderType; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public Long getQuantity() { return quantity; }
    public void setQuantity(Long quantity) { this.quantity = quantity; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public BigDecimal getFees() { return fees; }
    public void setFees(BigDecimal fees) { this.fees = fees; }

    public BigDecimal getTax() { return tax; }
    public void setTax(BigDecimal tax) { this.tax = tax; }

    public BigDecimal getNetAmount() { return netAmount; }
    public void setNetAmount(BigDecimal netAmount) { this.netAmount = netAmount; }

    public LocalDateTime getTransactionDate() { return transactionDate; }
    public void setTransactionDate(LocalDateTime transactionDate) { this.transactionDate = transactionDate; }

    public String getErrorCode() { return errorCode; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
}