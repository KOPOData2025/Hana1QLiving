package com.living.hana.dto;

import com.living.hana.entity.Payment;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;
import java.util.ArrayList;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponse {
    
    // 납부 기본 정보
    private Long id;
    private Long contractId;
    private Long userId;
    private Long unitId;
    private Long buildingId;
    private String paymentType;
    private String title;
    private String description;
    private BigDecimal amount;
    private String dueDate;
    private String status;
    private String paidDate;
    private String paymentMethod;
    private String createdAt;
    private String updatedAt;
    
    // 추가 정보 (조인된 데이터)
    private String userName;      // 사용자 이름
    private String userEmail;     // 사용자 이메일
    private String unitNumber;    // 호실 번호
    private String buildingName;  // 건물 이름
    private String contractNumber; // 계약 번호
    
    // 상태 텍스트
    private String statusText;    // 상태 한글 설명
    private String paymentTypeText; // 납부 유형 한글 설명
    private Long daysUntilDue;    // 납부 기한까지 남은 일수
    
    /**
     * Payment 엔티티를 PaymentResponse로 변환
     */
    public static PaymentResponse fromEntity(Payment payment) {
        PaymentResponse response = new PaymentResponse();
        response.setId(payment.getId());
        response.setContractId(payment.getContractId());
        response.setUserId(payment.getUserId());
        response.setUnitId(payment.getUnitId());
        response.setBuildingId(payment.getBuildingId());
        response.setPaymentType(payment.getPaymentType());
        response.setTitle(payment.getTitle());
        response.setDescription(payment.getDescription());
        response.setAmount(payment.getAmount());
        response.setDueDate(payment.getDueDate());
        response.setStatus(payment.getStatus());
        response.setPaidDate(payment.getPaidDate());
        response.setPaymentMethod(payment.getPaymentMethod());
        response.setCreatedAt(payment.getCreatedAt());
        response.setUpdatedAt(payment.getUpdatedAt());
        
        // 상태 텍스트 설정
        response.setStatusText(getStatusText(payment.getStatus()));
        response.setPaymentTypeText(getPaymentTypeText(payment.getPaymentType()));
        
        return response;
    }
    
    /**
     * Payment 엔티티 리스트를 PaymentResponse 리스트로 변환
     */
    public static List<PaymentResponse> fromEntityList(List<Payment> payments) {
        List<PaymentResponse> responses = new ArrayList<>();
        for (Payment payment : payments) {
            responses.add(fromEntity(payment));
        }
        return responses;
    }
    
    /**
     * 상태 코드를 한글로 변환
     */
    private static String getStatusText(String status) {
        if (status == null) return "";
        return switch (status) {
            case "PENDING" -> "미납";
            case "PAID" -> "완납";
            case "OVERDUE" -> "연체";
            default -> status;
        };
    }
    
    /**
     * 납부 유형 코드를 한글로 변환
     */
    private static String getPaymentTypeText(String paymentType) {
        if (paymentType == null) return "";
        return switch (paymentType) {
            case "MONTHLY_RENT" -> "월세";
            case "MAINTENANCE_FEE" -> "관리비";
            case "UTILITY" -> "공과금";
            case "OTHER" -> "기타";
            default -> paymentType;
        };
    }
}
