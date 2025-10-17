package com.living.hana.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;

public class OrderRequest {
    
    @NotNull(message = "사용자 ID는 필수입니다.")
    private Long userId;
    
    @NotBlank(message = "상품 ID는 필수입니다.")
    private String productId;
    
    @NotBlank(message = "주문 유형은 필수입니다.")
    @Pattern(regexp = "BUY|SELL", message = "주문 유형은 BUY 또는 SELL이어야 합니다.")
    private String orderType;
    
    @NotNull(message = "수량은 필수입니다.")
    @Min(value = 1, message = "수량은 1 이상이어야 합니다.")
    private Long quantity;
    
    @NotNull(message = "단가는 필수입니다.")
    @DecimalMin(value = "0.01", message = "단가는 0보다 커야 합니다.")
    private BigDecimal unitPrice;
    
    @NotBlank(message = "계좌번호는 필수입니다.")
    private String accountNumber;
    
    @NotBlank(message = "비밀번호는 필수입니다.")
    private String password;
    
    private String channel = "APP"; // 기본값

    public OrderRequest() {}

    public OrderRequest(Long userId, String productId, String orderType, Long quantity, 
                       BigDecimal unitPrice, String accountNumber, String password) {
        this.userId = userId;
        this.productId = productId;
        this.orderType = orderType;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.accountNumber = accountNumber;
        this.password = password;
    }

    // Getters and Setters
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getOrderType() { return orderType; }
    public void setOrderType(String orderType) { this.orderType = orderType; }

    public Long getQuantity() { return quantity; }
    public void setQuantity(Long quantity) { this.quantity = quantity; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }
    
    // 총 거래금액 계산
    public BigDecimal getTotalAmount() {
        if (unitPrice != null && quantity != null) {
            return unitPrice.multiply(new BigDecimal(quantity));
        }
        return BigDecimal.ZERO;
    }
}