package com.living.hana.service;

import com.living.hana.entity.LinkedBankAccount;
import com.living.hana.entity.RentAutoPayment;
import com.living.hana.client.HanaBankClient;
import com.living.hana.dto.AutoTransferRequest;
import com.living.hana.dto.AutoTransferResponse;
import com.living.hana.mapper.LinkedBankAccountMapper;
import com.living.hana.mapper.RentAutoPaymentMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 월세 자동송금 수동 실행 서비스
 * ERP에서 버튼 클릭으로 오늘 결제일인 월세를 즉시 이체
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RentAutoPaymentExecutorService {

    private final RentAutoPaymentMapper rentAutoPaymentMapper;
    private final LinkedBankAccountMapper linkedBankAccountMapper;
    private final HanaBankClient hanaBankClient;
    private final RentPaymentService rentPaymentService;

    @Value("${hana-living.admin.account-number:1002949502923}")
    private String adminAccountNumber;

    @Value("${hana-living.admin.account-name:하나원큐리빙}")
    private String adminAccountName;

    @Value("${hana-living.admin.bank-code:088}")
    private String adminBankCode;

    @Value("${hana-living.admin.bank-name:하나은행}")
    private String adminBankName;

    /**
     * 오늘 결제일인 모든 월세 자동이체 실행
     *
     * @return 실행 결과 요약 (성공/실패 건수 및 상세 내역)
     */
    @Transactional
    public Map<String, Object> executeTodayRentPayments() {

        // 오늘 날짜
        LocalDate today = LocalDate.now();
        Date todaySqlDate = Date.valueOf(today);

        // 1. 오늘 결제일인 자동이체 조회
        List<RentAutoPayment> scheduledPayments = rentAutoPaymentMapper.findTodayScheduledPayments(todaySqlDate);
        log.info("오늘 결제 예정: {}건", scheduledPayments.size());

        if (scheduledPayments.isEmpty()) {
            return createSummary(0, 0, new ArrayList<>(), new ArrayList<>());
        }

        // 2. 각 자동이체 실행
        List<Map<String, Object>> successResults = new ArrayList<>();
        List<Map<String, Object>> failureResults = new ArrayList<>();

        for (RentAutoPayment payment : scheduledPayments) {
            try {
                log.info("월세 이체 실행: contractId={}, userId={}, amount={}",
                    payment.getContractId(), payment.getUserId(), payment.getMonthlyRent());

                // 연결된 계좌 정보 조회 (userCi 필요)
                LinkedBankAccount linkedAccount = linkedBankAccountMapper.findById(payment.getLinkedAccountId());
                if (linkedAccount == null) {
                    String error = "연결된 계좌를 찾을 수 없습니다: linkedAccountId=" + payment.getLinkedAccountId();
                    log.error(error);
                    failureResults.add(createFailureResult(payment, error));
                    continue;
                }

                String userCi = linkedAccount.getUserCi();
                if (userCi == null || userCi.isEmpty()) {
                    String error = "USER_CI가 없습니다: linkedAccountId=" + payment.getLinkedAccountId();
                    log.error(error);
                    failureResults.add(createFailureResult(payment, error));
                    continue;
                }

                // AutoTransferRequest 생성
                AutoTransferRequest request = AutoTransferRequest.builder()
                    .fromAccount(payment.getAccountNumber()) // 출금 계좌 (입주자)
                    .toAccount(adminAccountNumber)            // 입금 계좌 (관리자)
                    .toBankCode(adminBankCode)
                    .toBankName(adminBankName)
                    .amount(payment.getMonthlyRent())
                    .transferDay(payment.getPaymentDay())
                    .beneficiaryName(adminAccountName)
                    .memo("월세 자동이체 - " + payment.getUserName() + " (" + payment.getBuildingName() + " " + payment.getUnitNumber() + ")")
                    .build();

                // 하나은행 즉시 이체 API 호출
                AutoTransferResponse response = hanaBankClient.executeImmediateTransfer(request, userCi);

                if (response != null && response.isSuccess()) {
                    // 성공: 결제 기록 저장
                    String transactionId = response.getTransactionId();
                    rentPaymentService.recordRentAutoTransfer(
                        payment.getContractId(),
                        payment.getUserId(),
                        payment.getUnitId(),
                        payment.getMonthlyRent(),
                        payment.getAccountNumber(),
                        adminAccountNumber,
                        transactionId,
                        true,
                        null
                    );

                    log.info("월세 이체 성공: contractId={}, transactionId={}", payment.getContractId(), transactionId);
                    successResults.add(createSuccessResult(payment, transactionId));

                } else {
                    // 실패: 실패 기록 저장
                    String failureReason = response != null ? response.getStatus() : "응답 없음";
                    rentPaymentService.recordRentAutoTransfer(
                        payment.getContractId(),
                        payment.getUserId(),
                        payment.getUnitId(),
                        payment.getMonthlyRent(),
                        payment.getAccountNumber(),
                        adminAccountNumber,
                        null,
                        false,
                        failureReason
                    );

                    log.error("월세 이체 실패: contractId={}, reason={}", payment.getContractId(), failureReason);
                    failureResults.add(createFailureResult(payment, failureReason));
                }

            } catch (Exception e) {
                log.error("월세 이체 처리 중 예외 발생: contractId={}, error={}", payment.getContractId(), e.getMessage(), e);

                // 예외 발생 시 실패 기록 저장
                try {
                    rentPaymentService.recordRentAutoTransfer(
                        payment.getContractId(),
                        payment.getUserId(),
                        payment.getUnitId(),
                        payment.getMonthlyRent(),
                        payment.getAccountNumber(),
                        adminAccountNumber,
                        null,
                        false,
                        "예외 발생: " + e.getMessage()
                    );
                } catch (Exception recordException) {
                    log.error("실패 기록 저장 실패: {}", recordException.getMessage());
                }

                failureResults.add(createFailureResult(payment, e.getMessage()));
            }
        }

        log.info("=== 오늘 월세 자동송금 실행 완료: 성공 {}건, 실패 {}건 ===",
            successResults.size(), failureResults.size());

        return createSummary(successResults.size(), failureResults.size(), successResults, failureResults);
    }

    /**
     * 실행 결과 요약 생성
     */
    private Map<String, Object> createSummary(int successCount, int failureCount,
                                             List<Map<String, Object>> successResults,
                                             List<Map<String, Object>> failureResults) {
        Map<String, Object> summary = new HashMap<>();
        summary.put("totalCount", successCount + failureCount);
        summary.put("successCount", successCount);
        summary.put("failureCount", failureCount);
        summary.put("successResults", successResults);
        summary.put("failureResults", failureResults);
        summary.put("executedAt", java.time.LocalDateTime.now().toString());
        return summary;
    }

    /**
     * 성공 결과 생성
     */
    private Map<String, Object> createSuccessResult(RentAutoPayment payment, String transactionId) {
        Map<String, Object> result = new HashMap<>();
        result.put("contractId", payment.getContractId());
        result.put("userId", payment.getUserId());
        result.put("userName", payment.getUserName());
        result.put("building", payment.getBuildingName());
        result.put("unit", payment.getUnitNumber());
        result.put("amount", payment.getMonthlyRent());
        result.put("transactionId", transactionId);
        result.put("status", "SUCCESS");
        return result;
    }

    /**
     * 실패 결과 생성
     */
    private Map<String, Object> createFailureResult(RentAutoPayment payment, String reason) {
        Map<String, Object> result = new HashMap<>();
        result.put("contractId", payment.getContractId());
        result.put("userId", payment.getUserId());
        result.put("userName", payment.getUserName());
        result.put("building", payment.getBuildingName());
        result.put("unit", payment.getUnitNumber());
        result.put("amount", payment.getMonthlyRent());
        result.put("reason", reason);
        result.put("status", "FAILURE");
        return result;
    }
}
