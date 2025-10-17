package com.example.hana_bank.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;

public class LoanInquiryRequestDto {
    @NotBlank(message = "대출목적은 필수입니다")
    private String loanPurpose;

    @NotNull(message = "이사여부는 필수입니다")
    private Boolean isMoving;

    @NotBlank(message = "계약형태는 필수입니다")
    private String contractType;

    @NotBlank(message = "주택형태는 필수입니다")
    private String houseType;

    @NotBlank(message = "지역은 필수입니다")
    private String location;

    @NotNull(message = "보증금은 필수입니다")
    @Positive(message = "보증금은 양수여야 합니다")
    private Long depositAmount;

    private Long monthlyRentAmount;

    @NotNull(message = "계약만료일은 필수입니다")
    private LocalDate contractDueDate;

    @NotBlank(message = "소득형태는 필수입니다")
    private String incomeType;

    @NotNull(message = "입사일은 필수입니다")
    private LocalDate employmentDate;

    @NotNull(message = "연소득은 필수입니다")
    @Positive(message = "연소득은 양수여야 합니다")
    private Long annualIncome;

    @NotBlank(message = "결혼상태는 필수입니다")
    private String maritalStatus;

    @NotBlank(message = "주택보유상태는 필수입니다")
    private String houseOwnership;

    public LoanInquiryRequestDto() {}

    // Getters and Setters
    public String getLoanPurpose() { return loanPurpose; }
    public void setLoanPurpose(String loanPurpose) { this.loanPurpose = loanPurpose; }

    public Boolean getIsMoving() { return isMoving; }
    public void setIsMoving(Boolean isMoving) { this.isMoving = isMoving; }

    public String getContractType() { return contractType; }
    public void setContractType(String contractType) { this.contractType = contractType; }

    public String getHouseType() { return houseType; }
    public void setHouseType(String houseType) { this.houseType = houseType; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public Long getDepositAmount() { return depositAmount; }
    public void setDepositAmount(Long depositAmount) { this.depositAmount = depositAmount; }

    public Long getMonthlyRentAmount() { return monthlyRentAmount; }
    public void setMonthlyRentAmount(Long monthlyRentAmount) { this.monthlyRentAmount = monthlyRentAmount; }

    public LocalDate getContractDueDate() { return contractDueDate; }
    public void setContractDueDate(LocalDate contractDueDate) { this.contractDueDate = contractDueDate; }

    public String getIncomeType() { return incomeType; }
    public void setIncomeType(String incomeType) { this.incomeType = incomeType; }

    public LocalDate getEmploymentDate() { return employmentDate; }
    public void setEmploymentDate(LocalDate employmentDate) { this.employmentDate = employmentDate; }

    public Long getAnnualIncome() { return annualIncome; }
    public void setAnnualIncome(Long annualIncome) { this.annualIncome = annualIncome; }

    public String getMaritalStatus() { return maritalStatus; }
    public void setMaritalStatus(String maritalStatus) { this.maritalStatus = maritalStatus; }

    public String getHouseOwnership() { return houseOwnership; }
    public void setHouseOwnership(String houseOwnership) { this.houseOwnership = houseOwnership; }
}
