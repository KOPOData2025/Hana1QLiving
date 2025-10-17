package com.living.hana.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class InvestmentProduct {
    
    private String productId;
    private String productName;
    private String productCode;
    private String productType;
    private String issuer;
    private BigDecimal currentPrice;
    private BigDecimal nav;
    private BigDecimal totalReturn;
    private BigDecimal dividendYield;
    private BigDecimal expenseRatio;
    private Integer riskLevel;
    private String riskGrade;
    private String description;
    private BigDecimal minInvestmentAmount;
    private BigDecimal investmentLimit;
    private LocalDate listingDate;
    private String status;
    private BigDecimal marketCap;
    private Long totalShares; // 발행주식수
    private BigDecimal priceChange; // 전일대비 변화량
    private String priceChangeSign; // 전일대비 부호
    private Integer tradingUnit;
    private Integer settlementCycle;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public InvestmentProduct() {}

    // Getters and Setters
    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }

    public String getProductType() { return productType; }
    public void setProductType(String productType) { this.productType = productType; }

    public String getIssuer() { return issuer; }
    public void setIssuer(String issuer) { this.issuer = issuer; }

    public BigDecimal getCurrentPrice() { return currentPrice; }
    public void setCurrentPrice(BigDecimal currentPrice) { this.currentPrice = currentPrice; }

    public BigDecimal getNav() { return nav; }
    public void setNav(BigDecimal nav) { this.nav = nav; }

    public BigDecimal getTotalReturn() { return totalReturn; }
    public void setTotalReturn(BigDecimal totalReturn) { this.totalReturn = totalReturn; }

    public BigDecimal getDividendYield() { return dividendYield; }
    public void setDividendYield(BigDecimal dividendYield) { this.dividendYield = dividendYield; }

    public BigDecimal getExpenseRatio() { return expenseRatio; }
    public void setExpenseRatio(BigDecimal expenseRatio) { this.expenseRatio = expenseRatio; }

    public Integer getRiskLevel() { return riskLevel; }
    public void setRiskLevel(Integer riskLevel) { this.riskLevel = riskLevel; }

    public String getRiskGrade() { return riskGrade; }
    public void setRiskGrade(String riskGrade) { this.riskGrade = riskGrade; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getMinInvestmentAmount() { return minInvestmentAmount; }
    public void setMinInvestmentAmount(BigDecimal minInvestmentAmount) { this.minInvestmentAmount = minInvestmentAmount; }

    public BigDecimal getInvestmentLimit() { return investmentLimit; }
    public void setInvestmentLimit(BigDecimal investmentLimit) { this.investmentLimit = investmentLimit; }

    public LocalDate getListingDate() { return listingDate; }
    public void setListingDate(LocalDate listingDate) { this.listingDate = listingDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getMarketCap() { return marketCap; }
    public void setMarketCap(BigDecimal marketCap) { this.marketCap = marketCap; }

    public Long getTotalShares() { return totalShares; }
    public void setTotalShares(Long totalShares) { this.totalShares = totalShares; }

    public BigDecimal getPriceChange() { return priceChange; }
    public void setPriceChange(BigDecimal priceChange) { this.priceChange = priceChange; }

    public String getPriceChangeSign() { return priceChangeSign; }
    public void setPriceChangeSign(String priceChangeSign) { this.priceChangeSign = priceChangeSign; }

    public Integer getTradingUnit() { return tradingUnit; }
    public void setTradingUnit(Integer tradingUnit) { this.tradingUnit = tradingUnit; }

    public Integer getSettlementCycle() { return settlementCycle; }
    public void setSettlementCycle(Integer settlementCycle) { this.settlementCycle = settlementCycle; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}