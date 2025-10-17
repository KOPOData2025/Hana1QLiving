package com.hana.securities.entity;

public class AccountLinkRequest {
    private String userCi;
    private String accountNumber;
    private String accountPassword;
    private String userName;
    private String phoneNumber;
    private String birthDate;
    
    // 기본 생성자
    public AccountLinkRequest() {}
    
    // 모든 필드 생성자
    public AccountLinkRequest(String userCi, String accountNumber, String accountPassword,
                            String userName, String phoneNumber, String birthDate) {
        this.userCi = userCi;
        this.accountNumber = accountNumber;
        this.accountPassword = accountPassword;
        this.userName = userName;
        this.phoneNumber = phoneNumber;
        this.birthDate = birthDate;
    }
    
    // Getter & Setter
    public String getUserCi() { return userCi; }
    public void setUserCi(String userCi) { this.userCi = userCi; }
    
    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }
    
    public String getAccountPassword() { return accountPassword; }
    public void setAccountPassword(String accountPassword) { this.accountPassword = accountPassword; }
    
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    
    public String getBirthDate() { return birthDate; }
    public void setBirthDate(String birthDate) { this.birthDate = birthDate; }
}