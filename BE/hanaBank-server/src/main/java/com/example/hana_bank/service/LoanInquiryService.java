package com.example.hana_bank.service;

import com.example.hana_bank.entity.LoanProduct;
import com.example.hana_bank.dto.LoanInquiryRequestDto;
import com.example.hana_bank.dto.LoanInquiryResponseDto;
import com.example.hana_bank.service.LoanProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.ArrayList;
import java.util.stream.Collectors;

@Service
public class LoanInquiryService {

    @Autowired
    private LoanProductService loanProductService;

    @Autowired
    private MarketRateService marketRateService;

    public LoanInquiryResponseDto processLoanInquiry(LoanInquiryRequestDto requestDto, com.example.hana_bank.entity.User user) {
        // 순수 계산 로직: DB 저장 없이 실시간 계산만 수행
        return calculateLoanInquiry(requestDto, user);
    }

    private LoanInquiryResponseDto calculateLoanInquiry(LoanInquiryRequestDto requestDto, com.example.hana_bank.entity.User user) {
        // 실제 자격 심사
        boolean isEligible = checkEligibility(requestDto);

        // 실제 계산값들
        String creditGrade = calculateCreditGrade(requestDto);
        double dtiRatio = calculateDTI(requestDto);
        double dsrRatio = calculateDSR(requestDto);
        String riskLevel = calculateRiskLevel(requestDto);

        LoanInquiryResponseDto.LoanInquiryData data = new LoanInquiryResponseDto.LoanInquiryData();

        // 고객 자격 정보
        LoanInquiryResponseDto.CustomerEligibility eligibility = new LoanInquiryResponseDto.CustomerEligibility(
            isEligible, creditGrade, String.format("%.1f%%", dtiRatio),
            String.format("%.1f%%", dsrRatio), riskLevel
        );
        data.setCustomerEligibility(eligibility);

        if (isEligible) {
            // 실제 상품별 조건 계산 (사용자 정보 포함)
            List<LoanInquiryResponseDto.AvailableProduct> availableProducts = getEligibleProducts(requestDto, user);

            // 프론트엔드 호환성을 위해 recommendations로도 설정
            data.setAvailableProducts(availableProducts);
            data.setRecommendations(availableProducts);

            // 최대 한도 (가장 높은 한도를 가진 상품 기준)
            long maxLimit = availableProducts.stream()
                .mapToLong(product -> parseAmountFromString(product.getMaxLimitAmount()))
                .max()
                .orElse(0L);

            data.setRecommendedLoanAmount(formatAmount(maxLimit));
            data.setCalculatedSpreadRate(calculateSpreadRate(requestDto));
            data.setFinalInterestRate(calculateFinalRate(requestDto));

            // 프론트엔드에서 기대하는 추가 필드들
            data.setBaseRate(marketRateService.getCofix6mRateAsString());
            data.setSpread(calculateSpreadRate(requestDto));
            data.setTotalRate(calculateFinalRate(requestDto));
            data.setCycle("6개월");

            // 실제 금리 계산
            LoanInquiryResponseDto.RecommendedRates rates = calculateRates(requestDto);
            data.setRecommendedRates(rates);
        }

        // 시장 금리 (DB에서 조회)
        LoanInquiryResponseDto.MarketRates marketRates = new LoanInquiryResponseDto.MarketRates(
            marketRateService.getCofix6mRateAsString(),
            marketRateService.getCofix2yRateAsString()
        );
        data.setMarketRates(marketRates);

        return new LoanInquiryResponseDto(true, "대출 한도 조회가 완료되었습니다", data);
    }

    private boolean checkEligibility(LoanInquiryRequestDto requestDto) {
        // 주택보유수 체크
        if ("2주택 이상 (신청불가)".equals(requestDto.getHouseOwnership()) ||
            "1주택 (신청불가)".equals(requestDto.getHouseOwnership())) {
            return false;
        }

        // 계약방식 체크
        if ("개인(신청불가)".equals(requestDto.getContractType())) {
            return false;
        }

        // 연소득 최소 조건 (만원 단위로 입력된 값 기준으로 500만원 = 500)
        if (requestDto.getAnnualIncome() < 500) {
            return false;
        }

        return true;
    }

    private int calculateAge(String birthDate) {
        try {
            if (birthDate == null || birthDate.length() < 8) return 35; // 기본값

            // YYYYMMDD 형식으로 파싱
            String yearStr = birthDate.substring(0, 4);
            String monthStr = birthDate.substring(4, 6);
            String dayStr = birthDate.substring(6, 8);

            LocalDate birth = LocalDate.of(Integer.parseInt(yearStr),
                                         Integer.parseInt(monthStr),
                                         Integer.parseInt(dayStr));
            return (int) ChronoUnit.YEARS.between(birth, LocalDate.now());
        } catch (Exception e) {
            return 35; // 파싱 실패시 기본값
        }
    }

    private List<LoanInquiryResponseDto.AvailableProduct> getEligibleProducts(LoanInquiryRequestDto requestDto, com.example.hana_bank.entity.User user) {
        List<LoanInquiryResponseDto.AvailableProduct> eligibleProducts = new ArrayList<>();

        long depositAmount = requestDto.getDepositAmount() * 10000; // 만원을 원으로 변환

        int age = calculateAge(user != null ? user.getBirthDate() : "19900101"); // 실제 생년월일 사용
        boolean isMarriedWithin7Years = "기혼(7년이내)".equals(requestDto.getMaritalStatus());
        boolean isYoung = age <= 34;

        // DB에서 실제 상품 정보 가져오기
        List<LoanProduct> products = loanProductService.getActiveLoanProducts();

        for (LoanProduct product : products) {
            String productName = product.getProductName();
            long maxProductLimit = product.getMaxLoanAmount().longValue();
            double baseRate = product.getInterestRate().doubleValue();

            long calculatedLimit = 0;
            double spreadRate6m = 0;
            double spreadRate2y = 0;

            if (productName.contains("HF")) {
                // HF 전월세보증금 대출 (80% LTV)
                calculatedLimit = Math.min((long)(depositAmount * 0.8), maxProductLimit);
                spreadRate6m = 1.2;
                spreadRate2y = 1.0;
            } else if (productName.contains("청년") && (isYoung || isMarriedWithin7Years)) {
                // 청년 전월세보증금 대출 (90% LTV, 만34세 이하 또는 신혼)
                calculatedLimit = Math.min((long)(depositAmount * 0.9), maxProductLimit);
                spreadRate6m = 0.8; // 청년 우대금리
                spreadRate2y = 0.6;
            } else if (productName.contains("SGI")) {
                // SGI 전월세보증금 대출 (80% LTV)
                calculatedLimit = Math.min((long)(depositAmount * 0.8), maxProductLimit);
                spreadRate6m = 1.0;
                spreadRate2y = 0.8;
            }

            if (calculatedLimit > 0) {
                // DB에서 실시간 금리 가져오기
                double cofix6m = marketRateService.getCofix6mRate() * 100; // 퍼센트로 변환
                double cofix2y = marketRateService.getCofix2yRate() * 100; // 퍼센트로 변환

                eligibleProducts.add(new LoanInquiryResponseDto.AvailableProduct(
                    productName,
                    formatAmountInWon(calculatedLimit), // 만원 단위로 포맷
                    String.format("%.1f%%", cofix6m + spreadRate6m),
                    String.format("%.1f%%", cofix2y + spreadRate2y)
                ));
            }
        }

        // 상품 추천 정렬: 1) 금리 낮은 순 2) 한도 높은 순
        eligibleProducts.sort((p1, p2) -> {
            // 1차 정렬: 6개월 금리 기준 (낮은 금리가 우선)
            double rate1 = Double.parseDouble(p1.getRate6m().replace("%", ""));
            double rate2 = Double.parseDouble(p2.getRate6m().replace("%", ""));
            int rateCompare = Double.compare(rate1, rate2);

            if (rateCompare != 0) {
                return rateCompare; // 금리가 다르면 낮은 금리 우선
            }

            // 2차 정렬: 한도 기준 (높은 한도가 우선)
            long limit1 = Long.parseLong(p1.getMaxLimitAmount());
            long limit2 = Long.parseLong(p2.getMaxLimitAmount());
            return Long.compare(limit2, limit1); // 높은 한도 우선
        });

        return eligibleProducts;
    }

    private String calculateCreditGrade(LoanInquiryRequestDto requestDto) {
        // 연소득 기반 간단한 신용등급 계산 (만원 단위 입력값 기준)
        long income = requestDto.getAnnualIncome(); // 이미 만원 단위
        if (income >= 8000) return "1등급"; // 8000만원 이상
        else if (income >= 5000) return "2등급"; // 5000만원 이상
        else if (income >= 3000) return "3등급"; // 3000만원 이상
        else return "4등급";
    }

    private double calculateDTI(LoanInquiryRequestDto requestDto) {
        // 보증금 기반 예상 월상환액으로 DTI 계산 (만원 단위 고려)
        long monthlyIncome = requestDto.getAnnualIncome() * 10000 / 12; // 만원을 원으로 변환
        long estimatedMonthlyPayment = (long)(requestDto.getDepositAmount() * 10000 * 0.8 * 0.04 / 12); // 보증금도 만원을 원으로 변환
        return Math.min((double)estimatedMonthlyPayment / monthlyIncome * 100, 40.0);
    }

    private double calculateDSR(LoanInquiryRequestDto requestDto) {
        // DTI보다 5% 높게 설정 (기존 부채 고려)
        return Math.min(calculateDTI(requestDto) + 5.0, 45.0);
    }

    private String calculateRiskLevel(LoanInquiryRequestDto requestDto) {
        double dti = calculateDTI(requestDto);
        if (dti <= 20) return "LOW";
        else if (dti <= 35) return "MEDIUM";
        else return "HIGH";
    }

    private String calculateSpreadRate(LoanInquiryRequestDto requestDto) {
        String creditGrade = calculateCreditGrade(requestDto);
        switch (creditGrade) {
            case "1등급": return "0.8%";
            case "2등급": return "1.0%";
            case "3등급": return "1.2%";
            default: return "1.5%";
        }
    }

    private String calculateFinalRate(LoanInquiryRequestDto requestDto) {
        double baseRate = marketRateService.getCofix6mRate() * 100; // 퍼센트로 변환
        double spread = Double.parseDouble(calculateSpreadRate(requestDto).replace("%", ""));
        return String.format("%.1f%%", baseRate + spread);
    }

    private LoanInquiryResponseDto.RecommendedRates calculateRates(LoanInquiryRequestDto requestDto) {
        double spread = Double.parseDouble(calculateSpreadRate(requestDto).replace("%", ""));
        double cofix6m = marketRateService.getCofix6mRate() * 100; // 퍼센트로 변환
        double cofix2y = marketRateService.getCofix2yRate() * 100; // 퍼센트로 변환

        return new LoanInquiryResponseDto.RecommendedRates(
            String.format("%.1f%%", cofix6m + spread),
            String.format("%.1f%%", cofix2y + spread)
        );
    }

    private long parseAmountFromString(String amountStr) {
        if (amountStr == null) return 0L;

        String numStr = amountStr.replaceAll("[^0-9.]", "");
        try {
            if (amountStr.contains("억")) {
                return (long)(Double.parseDouble(numStr) * 100000000);
            } else if (amountStr.contains("만")) {
                return (long)(Double.parseDouble(numStr) * 10000);
            } else {
                return Long.parseLong(numStr);
            }
        } catch (Exception e) {
            return 0L;
        }
    }

    private String formatAmount(Long amount) {
        if (amount == null) return "0원";
        if (amount >= 100000000) {
            return String.format("%.0f억원", amount / 100000000.0);
        } else if (amount >= 10000) {
            return String.format("%.0f만원", amount / 10000.0);
        } else {
            return amount + "원";
        }
    }

    // 프론트엔드가 기대하는 만원 단위 숫자 문자열로 반환
    private String formatAmountInWon(Long amount) {
        if (amount == null) return "0";
        return String.valueOf(amount / 10000); // 만원 단위로 변환
    }
}
