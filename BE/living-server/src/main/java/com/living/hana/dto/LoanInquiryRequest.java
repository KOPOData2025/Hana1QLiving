package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanInquiryRequest {
    private String loanPurpose; // new|transfer
    private Boolean isMoving;
    private String contractType; // 공인중개업소|공공주택사업자|개인(신청불가)
    private String houseType; // 오피스텔|아파트|빌라|주택
    private String location; // 수도권(서울/경기/인천)|수도권 외
    private String deposit; // 5000만원
    private String monthlyRent; // 50만원
    private String dueDate; // 2025-08-31
    private String incomeType; // 근로소득|사업소득|기타소득|무소득
    private String employmentDate; // 2020-03-01
    private String annualIncome; // 3500만원
    private String maritalStatus; // 기혼(7년이내)|기혼|미혼
    private String houseOwnership; // 보유주택 없음|1주택 (신청불가)|2주택 이상 (신청불가)
    private String inquiryType; // limit_and_rate
    private String timestamp; // 2025-01-27T10:30:00.000Z
    private String deviceInfo; // mobile_app
}
