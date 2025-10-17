package com.hana.securities.entity;

import java.time.LocalDateTime;

public class SecuritiesAccount {
    private String accountNumber;
    private String userCi;
    private String accountName;
    private String accountType;
    private String status;
    private Long balance;
    private LocalDateTime openDate;
    private LocalDateTime lastTransactionDate;
    
    // 기본 생성자
    public SecuritiesAccount() {}
    
    // 모든 필드 생성자
    public SecuritiesAccount(String accountNumber, String userCi, String accountName, 
                           String accountType, String status, Long balance, 
                           LocalDateTime openDate, LocalDateTime lastTransactionDate) {
        this.accountNumber = accountNumber;
        this.userCi = userCi;
        this.accountName = accountName;
        this.accountType = accountType;
        this.status = status;
        this.balance = balance;
        this.openDate = openDate;
        this.lastTransactionDate = lastTransactionDate;
    }
    
    // Getter & Setter
    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }
    
    public String getUserCi() { return userCi; }
    public void setUserCi(String userCi) { this.userCi = userCi; }
    
    public String getAccountName() { return accountName; }
    public void setAccountName(String accountName) { this.accountName = accountName; }
    
    public String getAccountType() { return accountType; }
    public void setAccountType(String accountType) { this.accountType = accountType; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public Long getBalance() { return balance; }
    public void setBalance(Long balance) { this.balance = balance; }
    
    public LocalDateTime getOpenDate() { return openDate; }
    public void setOpenDate(LocalDateTime openDate) { this.openDate = openDate; }
    
    public LocalDateTime getLastTransactionDate() { return lastTransactionDate; }
    public void setLastTransactionDate(LocalDateTime lastTransactionDate) { 
        this.lastTransactionDate = lastTransactionDate; 
    }
}