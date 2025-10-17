package com.living.hana.dto;

import com.living.hana.entity.ReitProduct;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.sql.Date;
import java.sql.Timestamp;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReitProductResponse {
    private String productCode;       // 주식종목 번호
    private String productName;       // 상품명
    private String stockExchange;     // KOSPI, KOSDAQ 등
    private Date listingDate;         // 상장일
    private Long totalShares;         // 총 발행주식수
    private Double managementFee;     // 운용보수 (%)
    private String description;       // 상품 설명
    private Timestamp createdAt;      // 생성일
    private Timestamp updatedAt;      // 수정일

    // Entity -> DTO 변환
    public static ReitProductResponse fromEntity(ReitProduct entity) {
        return ReitProductResponse.builder()
                .productCode(entity.getProductCode())
                .productName(entity.getProductName())
                .stockExchange(entity.getStockExchange())
                .listingDate(entity.getListingDate())
                .totalShares(entity.getTotalShares())
                .managementFee(entity.getManagementFee())
                .description(entity.getDescription())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    // Entity List -> DTO List 변환
    public static List<ReitProductResponse> fromEntityList(List<ReitProduct> entities) {
        return entities.stream()
                .map(ReitProductResponse::fromEntity)
                .collect(Collectors.toList());
    }
}