package com.living.hana.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class ManagementFeeHistoryResponse {
    private Long userId;
    private String userName;
    private List<ManagementFeeTransaction> managementFeeTransactions;
    private List<RentTransaction> rentTransactions;

    @Data
    public static class ManagementFeeTransaction {
        private Long chargeId;
        private String unitNumber;
        private String buildingName;
        private BigDecimal amount;
        private String chargeDate;
        private String paymentDate;
        private String status;
        private String description;
        private String hanaBankTransactionId;
    }

    @Data
    public static class RentTransaction {
        private Long paymentId;
        private String unitNumber;
        private String buildingName;
        private BigDecimal amount;
        private String paymentDate;
        private String status;
        private String hanaBankTransactionId;
    }
}