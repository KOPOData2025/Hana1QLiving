package com.living.hana.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractDetailResponse {
    
    // 계약 기본 정보
    private Long id;
    private String contractNumber;
    private String startDate;
    private String endDate;
    private BigDecimal deposit;
    private BigDecimal monthlyRent;
    private String status;
    private String moveInDate;        // 입주일
    private Integer paymentDay;       // 납부일
    private String contractImageUrl;  // 계약서 이미지 URL
    private String createdAt;
    private String updatedAt;
    
    // 사용자 정보
    private Long userId;
    private String userName;
    private String userEmail;
    private String userPhone;
    
    // 호실 정보
    private Long unitId;
    private String unitNumber;
    private Integer floor;
    private String unitType;
    private BigDecimal unitArea;
    private BigDecimal unitMonthlyRent;
    private BigDecimal unitDeposit;
    private String unitStatus;
    private String unitImages; // 호실 이미지 JSON 배열
    
    // 건물 정보
    private Long buildingId;
    private String buildingName;
    private String buildingAddress;
    
    // 계약 상태 정보
    private String contractStatusText; // 상태 한글 설명
    private Long remainingDays;        // 계약 만료까지 남은 일수
}
