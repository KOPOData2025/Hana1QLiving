package com.hana.securities.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ReitsProduct {
    
    private String productId;
    private String productName;
    private String productType;
    private BigDecimal totalReturn;
    private BigDecimal dividendYield;
    private String riskLevel;
    private String description;
    private BigDecimal minInvestmentAmount;
    private String status; // ACTIVE, INACTIVE
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ReitsProduct() {}

    public ReitsProduct(String productId, String productName, String productType, 
                       BigDecimal totalReturn, BigDecimal dividendYield, String riskLevel, String description,
                       BigDecimal minInvestmentAmount, String status) {
        this.productId = productId;
        this.productName = productName;
        this.productType = productType;
        this.totalReturn = totalReturn;
        this.dividendYield = dividendYield;
        this.riskLevel = riskLevel;
        this.description = description;
        this.minInvestmentAmount = minInvestmentAmount;
        this.status = status;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getProductType() { return productType; }
    public void setProductType(String productType) { this.productType = productType; }



    public BigDecimal getTotalReturn() { return totalReturn; }
    public void setTotalReturn(BigDecimal totalReturn) { this.totalReturn = totalReturn; }

    public BigDecimal getDividendYield() { return dividendYield; }
    public void setDividendYield(BigDecimal dividendYield) { this.dividendYield = dividendYield; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getMinInvestmentAmount() { return minInvestmentAmount; }
    public void setMinInvestmentAmount(BigDecimal minInvestmentAmount) { this.minInvestmentAmount = minInvestmentAmount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}