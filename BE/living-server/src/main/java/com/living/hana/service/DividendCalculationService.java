package com.living.hana.service;

import com.living.hana.client.KsdClient;
import com.living.hana.entity.ReitDividend;
import com.living.hana.entity.ReitProduct;
import com.living.hana.entity.Building;
import com.living.hana.mapper.ReitDividendMapper;
import com.living.hana.mapper.ReitProductMapper;
import com.living.hana.mapper.BuildingMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class DividendCalculationService {

    private final ReitProductMapper reitProductMapper;
    private final ReitDividendMapper reitDividendMapper;
    private final BuildingMapper buildingMapper;
    private final KsdClient ksdClient;

    /**
     * 배당 계산 및 예탁원 등록
     */
    @Transactional
    public ReitDividend calculateAndRegisterDividend(String productCode, Integer dividendYear,
                                                   Integer dividendQuarter, BigDecimal dividendPerShare,
                                                   LocalDate recordDate, LocalDate paymentDate, BigDecimal basePrice) {

        log.info("배당 계산 및 등록 시작: {} - 주당 배당금: {}", productCode, dividendPerShare);

        try {
            // 1. REIT 상품 정보 조회
            ReitProduct product = reitProductMapper.findByProductCode(productCode);
            if (product == null) {
                throw new RuntimeException("존재하지 않는 상품입니다: " + productCode);
            }

            if (product.getTotalShares() == null || product.getTotalShares() <= 0) {
                throw new RuntimeException("총 발행주식수가 설정되지 않았습니다: " + productCode);
            }

            // 2. 총 배당금 계산
            BigDecimal totalDividendAmount = dividendPerShare
                .multiply(new BigDecimal(product.getTotalShares()))
                .setScale(2, RoundingMode.HALF_UP);

            log.info("배당 계산 결과 - 총 발행주식수: {}, 총 배당금: {}",
                product.getTotalShares(), totalDividendAmount);

            // 3. 배당 기록 저장
            ReitDividend dividend = new ReitDividend();
            dividend.setProductCode(productCode);
            dividend.setDividendYear(dividendYear);
            dividend.setDividendQuarter(dividendQuarter);

            // 기준가가 입력된 경우에만 배당률 계산, 없으면 null로 설정
            if (basePrice != null && basePrice.compareTo(BigDecimal.ZERO) > 0) {
                dividend.setDividendRate(calculateDividendRate(dividendPerShare, basePrice));
            } else {
                dividend.setDividendRate(null); // 기준가가 없으면 배당률도 null
            }
            dividend.setDividendAmount(dividendPerShare);
            dividend.setBasePrice(basePrice); // 배당락일 기준 주가 저장
            dividend.setRecordDate(java.sql.Date.valueOf(recordDate));
            dividend.setPaymentDate(java.sql.Date.valueOf(paymentDate));
            dividend.setAnnouncementDate(java.sql.Date.valueOf(LocalDate.now()));

            reitDividendMapper.insertDividend(dividend);

            log.info("배당 기록 저장 완료: ID {}", dividend.getDividendId());

            // 4. 예탁결제원에 배당 정보 전달
            boolean ksdRegistered = ksdClient.registerDividend(
                productCode, dividendYear, dividendQuarter,
                dividendPerShare, totalDividendAmount,
                recordDate, paymentDate
            );

            if (!ksdRegistered) {
                log.error("KSD 배당 등록 실패, 하지만 내부 기록은 유지: {}", productCode);
                // 실패해도 내부 기록은 유지
            }

            return dividend;

        } catch (Exception e) {
            log.error("배당 계산 및 등록 실패: {} - {}", productCode, e.getMessage(), e);
            throw new RuntimeException("배당 계산 및 등록 실패: " + e.getMessage());
        }
    }

    /**
     * 배당률 계산 (간단한 계산법)
     */
    private BigDecimal calculateDividendRate(BigDecimal dividendPerShare, BigDecimal currentPrice) {
        if (currentPrice == null || currentPrice.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        return dividendPerShare
            .multiply(new BigDecimal("100"))
            .divide(currentPrice, 4, RoundingMode.HALF_UP);
    }

    /**
     * 기간별 임대수익 기반 배당 가능 금액 계산
     */
    public BigDecimal calculateAvailableDividendWithPeriod(String productCode, String period) {
        try {
            log.info("임대수익 기반 배당 가능 금액 계산 시작: {}", productCode);

            // 기간에 따른 날짜 계산
            String[] dateRange = calculateDateRange(period);
            String startDate = dateRange[0];
            String endDate = dateRange[1];

            log.info("배당 계산 기간: {} ~ {} (period: {}, 상품: {})", startDate, endDate, period, productCode);

            // 1. 해당 REIT에 포함된 건물들의 임대수익 합계
            BigDecimal totalRentalIncome = calculateTotalRentalIncomeWithPeriod(productCode, startDate, endDate);
            log.info("총 임대수익: {} (상품: {})", totalRentalIncome, productCode);

            // 2. 운영비용 차감
            BigDecimal totalExpenses = calculateTotalExpensesWithPeriod(productCode, startDate, endDate);
            log.info("총 운영비용: {} (상품: {})", totalExpenses, productCode);

            // 3. 순수익 계산 (임대수익 - 운영비용)
            BigDecimal netIncome = totalRentalIncome.subtract(totalExpenses);
            if (netIncome.compareTo(BigDecimal.ZERO) < 0) {
                log.warn("순수익이 음수입니다. 배당 불가능: {} (상품: {})", netIncome, productCode);
                return BigDecimal.ZERO;
            }

            // 4. 법정 90% 배당률 적용 (과세소득 기준)
            // 과세소득 = 임대수익 - 모든 운영비용 (직원급여, 관리비, 세금 등)
            // REIT는 과세소득의 90% 이상을 배당해야 법인세 면제
            BigDecimal dividendRate = new BigDecimal("0.90");
            BigDecimal availableDividend = netIncome.multiply(dividendRate)
                .setScale(2, RoundingMode.HALF_UP);

            log.info("배당 가능 금액 계산 완료: 과세소득 {} × 90% = {} (상품: {})",
                netIncome, availableDividend, productCode);

            return availableDividend;

        } catch (Exception e) {
            log.error("배당 가능 금액 계산 실패: {} - {}", productCode, e.getMessage(), e);
            // 오류 발생시 0 반환하여 배당 불가 처리
            return BigDecimal.ZERO;
        }
    }

    /**
     * 기간 문자열을 시작일/종료일로 변환 (회계연도 기준)
     */
    private String[] calculateDateRange(String period) {
        java.time.LocalDate today = java.time.LocalDate.now();
        int currentYear = today.getYear();

        java.time.LocalDate startDate;
        java.time.LocalDate endDate;

        switch (period.toLowerCase()) {
            case "current_quarter":
            case "quarter":
                // 현재 분기 (1~3월, 4~6월, 7~9월, 10~12월)
                int currentQuarter = ((today.getMonthValue() - 1) / 3) + 1;
                int startMonth = (currentQuarter - 1) * 3 + 1;
                startDate = java.time.LocalDate.of(currentYear, startMonth, 1);
                endDate = today; // 오늘까지
                break;

            case "current_year":
            case "year":
            default:
                // 당해 연도 (1월 1일 ~ 오늘)
                startDate = java.time.LocalDate.of(currentYear, 1, 1);
                endDate = today;
                break;

            case "last_year":
                // 작년 전체 (작년 1월 1일 ~ 작년 12월 31일)
                startDate = java.time.LocalDate.of(currentYear - 1, 1, 1);
                endDate = java.time.LocalDate.of(currentYear - 1, 12, 31);
                break;

            case "ytd":
                // Year-to-Date (올해 1월 1일 ~ 오늘)
                startDate = java.time.LocalDate.of(currentYear, 1, 1);
                endDate = today;
                break;
        }

        return new String[]{startDate.toString(), endDate.toString()};
    }

    /**
     * 기간별 REIT 상품에 포함된 건물들의 총 임대수익 계산
     */
    private BigDecimal calculateTotalRentalIncomeWithPeriod(String productCode, String startDate, String endDate) {
        log.info("임대수익 계산 기간: {} ~ {} (상품: {})", startDate, endDate, productCode);

        try {
            // 1. REIT 상품에 포함된 활성 건물 ID들 조회
            List<Long> activeBuildingIds = reitProductMapper.getActiveBuildingIdsByProductCode(productCode);
            if (activeBuildingIds == null || activeBuildingIds.isEmpty()) {
                log.warn("REIT 상품에 포함된 활성 건물이 없습니다: {}", productCode);
                return BigDecimal.ZERO;
            }

            log.info("활성 건물 수: {} (상품: {})", activeBuildingIds.size(), productCode);

            // 2. 건물별 임대수익 집계
            BigDecimal totalIncome = BigDecimal.ZERO;
            for (Long buildingId : activeBuildingIds) {
                BigDecimal buildingIncome = calculateBuildingRentalIncome(buildingId, startDate, endDate);
                totalIncome = totalIncome.add(buildingIncome);
            }

            return totalIncome;

        } catch (Exception e) {
            log.error("총 임대수익 계산 실패: {} - {}", productCode, e.getMessage(), e);
            throw new RuntimeException("임대수익 계산 실패", e);
        }
    }

    /**
     * 특정 건물의 임대수익 계산
     */
    private BigDecimal calculateBuildingRentalIncome(Long buildingId, String startDate, String endDate) {
        try {
            // 해당 건물의 완료된 월세 결제 기록들을 집계
            return reitProductMapper.getBuildingRentalIncome(buildingId, startDate, endDate);
        } catch (Exception e) {
            log.error("건물별 임대수익 계산 실패: {} - {}", buildingId, e.getMessage(), e);
            return BigDecimal.ZERO; // 개별 건물 오류시 0 반환
        }
    }

    /**
     * 기간별 REIT 상품에 포함된 건물들의 총 운영비용 계산
     */
    private BigDecimal calculateTotalExpensesWithPeriod(String productCode, String startDate, String endDate) {
        log.info("운영비용 계산 기간: {} ~ {} (상품: {})", startDate, endDate, productCode);

        try {
            // 1. REIT 상품에 포함된 활성 건물 ID들 조회
            List<Long> activeBuildingIds = reitProductMapper.getActiveBuildingIdsByProductCode(productCode);
            if (activeBuildingIds == null || activeBuildingIds.isEmpty()) {
                return BigDecimal.ZERO;
            }

            // 2. 건물별 운영비용 집계
            BigDecimal totalExpenses = BigDecimal.ZERO;
            for (Long buildingId : activeBuildingIds) {
                BigDecimal buildingExpense = calculateBuildingExpenses(buildingId, startDate, endDate);
                totalExpenses = totalExpenses.add(buildingExpense);
            }

            // 3. 공통 운영비용 추가 (한 번만)
            BigDecimal commonExpenses = reitProductMapper.getCommonExpenses(startDate, endDate);
            totalExpenses = totalExpenses.add(commonExpenses);

            return totalExpenses;

        } catch (Exception e) {
            log.error("총 운영비용 계산 실패: {} - {}", productCode, e.getMessage(), e);
            throw new RuntimeException("운영비용 계산 실패", e);
        }
    }

    /**
     * 특정 건물의 운영비용 계산
     */
    private BigDecimal calculateBuildingExpenses(Long buildingId, String startDate, String endDate) {
        try {
            // 해당 건물의 운영비용 기록들을 집계
            return reitProductMapper.getBuildingExpenses(buildingId, startDate, endDate);
        } catch (Exception e) {
            log.error("건물별 운영비용 계산 실패: {} - {}", buildingId, e.getMessage(), e);
            return BigDecimal.ZERO; // 개별 건물 오류시 0 반환
        }
    }

    /**
     * 배당 계산 상세 내역 조회 (프론트엔드 표시용)
     */
    public Map<String, Object> getCalculationDetails(String productCode, String period) {
        try {
            // 기간에 따른 날짜 계산
            String[] dateRange = calculateDateRange(period);
            String startDate = dateRange[0];
            String endDate = dateRange[1];

            log.info("배당 계산 상세 내역 조회: {} (기간: {} ~ {})", productCode, startDate, endDate);

            // 1. 리츠 상품에 포함된 활성 건물 목록
            List<Long> activeBuildingIds = reitProductMapper.getActiveBuildingIdsByProductCode(productCode);

            Map<String, Object> details = new HashMap<>();
            details.put("period", period);
            details.put("startDate", startDate);
            details.put("endDate", endDate);
            details.put("buildingCount", activeBuildingIds != null ? activeBuildingIds.size() : 0);

            if (activeBuildingIds == null || activeBuildingIds.isEmpty()) {
                details.put("totalRentalIncome", BigDecimal.ZERO);
                details.put("totalExpenses", BigDecimal.ZERO);
                details.put("commonExpenses", BigDecimal.ZERO);
                details.put("taxableIncome", BigDecimal.ZERO);
                details.put("buildingDetails", new ArrayList<>());
                return details;
            }

            // 2. 건물별 상세 내역 수집
            List<Map<String, Object>> buildingDetails = new ArrayList<>();
            BigDecimal totalRentalIncome = BigDecimal.ZERO;
            BigDecimal totalBuildingExpenses = BigDecimal.ZERO;

            for (Long buildingId : activeBuildingIds) {
                BigDecimal buildingRentalIncome = calculateBuildingRentalIncome(buildingId, startDate, endDate);
                BigDecimal buildingExpenses = calculateBuildingExpenses(buildingId, startDate, endDate);
                BigDecimal buildingNetIncome = buildingRentalIncome.subtract(buildingExpenses);

                // 건물 정보 조회
                Building building = buildingMapper.findById(buildingId);
                String buildingName = building != null ? building.getName() : "건물 " + buildingId;

                Map<String, Object> buildingDetail = new HashMap<>();
                buildingDetail.put("buildingId", buildingId);
                buildingDetail.put("buildingName", buildingName);
                buildingDetail.put("rentalIncome", buildingRentalIncome);
                buildingDetail.put("expenses", buildingExpenses);
                buildingDetail.put("netIncome", buildingNetIncome);
                buildingDetails.add(buildingDetail);

                totalRentalIncome = totalRentalIncome.add(buildingRentalIncome);
                totalBuildingExpenses = totalBuildingExpenses.add(buildingExpenses);
            }

            // 3. 공통 운영비용 (REIT 운용사 보수, 본사 운영비 등)
            BigDecimal commonExpenses = reitProductMapper.getCommonExpenses(startDate, endDate);
            BigDecimal totalExpenses = totalBuildingExpenses.add(commonExpenses);

            // 4. 과세소득 (임대수익 - 모든 비용)
            BigDecimal taxableIncome = totalRentalIncome.subtract(totalExpenses);

            // 5. 배당 가능 금액 (과세소득의 90%)
            BigDecimal dividendRate = new BigDecimal("0.90");
            BigDecimal availableDividend = taxableIncome.compareTo(BigDecimal.ZERO) > 0 ?
                taxableIncome.multiply(dividendRate).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

            details.put("totalRentalIncome", totalRentalIncome);
            details.put("totalBuildingExpenses", totalBuildingExpenses);
            details.put("commonExpenses", commonExpenses);
            details.put("totalExpenses", totalExpenses);
            details.put("taxableIncome", taxableIncome);
            details.put("dividendRate", dividendRate);
            details.put("availableDividend", availableDividend);
            details.put("buildingDetails", buildingDetails);

            log.info("배당 계산 상세 내역: 임대수익 {}, 총비용 {}, 과세소득 {}, 배당가능 {} (상품: {})",
                totalRentalIncome, totalExpenses, taxableIncome, availableDividend, productCode);

            return details;

        } catch (Exception e) {
            log.error("배당 계산 상세 내역 조회 실패: {} - {}", productCode, e.getMessage(), e);
            Map<String, Object> errorDetails = new HashMap<>();
            errorDetails.put("error", "계산 실패");
            return errorDetails;
        }
    }

}