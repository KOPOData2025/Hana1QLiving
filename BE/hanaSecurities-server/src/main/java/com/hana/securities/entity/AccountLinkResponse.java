package com.hana.securities.entity;

public class AccountLinkResponse {
    private boolean success;
    private String message;
    private String accountNumber;
    private String accountName;
    private Long balance;
    private String linkToken;
    
    // 기본 생성자
    public AccountLinkResponse() {}
    
    // 성공 응답 생성자
    public AccountLinkResponse(boolean success, String message, String accountNumber, 
                             String accountName, Long balance, String linkToken) {
        this.success = success;
        this.message = message;
        this.accountNumber = accountNumber;
        this.accountName = accountName;
        this.balance = balance;
        this.linkToken = linkToken;
    }
    
    // 실패 응답 생성자
    public AccountLinkResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
    }
    
    // Getter & Setter
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    
    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }
    
    public String getAccountName() { return accountName; }
    public void setAccountName(String accountName) { this.accountName = accountName; }
    
    public Long getBalance() { return balance; }
    public void setBalance(Long balance) { this.balance = balance; }
    
    public String getLinkToken() { return linkToken; }
    public void setLinkToken(String linkToken) { this.linkToken = linkToken; }
}