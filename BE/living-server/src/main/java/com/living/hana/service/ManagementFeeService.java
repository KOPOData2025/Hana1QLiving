package com.living.hana.service;

import com.living.hana.entity.ManagementFeeCharge;
import com.living.hana.entity.LinkedBankAccount;
import com.living.hana.entity.Contract;
import com.living.hana.entity.User;
import com.living.hana.entity.Unit;
import com.living.hana.entity.Payment;
import com.living.hana.dto.ManagementFeeChargeRequest;
import com.living.hana.dto.ManagementFeeChargeResponse;
import com.living.hana.mapper.ManagementFeeChargeMapper;
import com.living.hana.mapper.LinkedBankAccountMapper;
import com.living.hana.mapper.ContractMapper;
import com.living.hana.mapper.UserMapper;
import com.living.hana.mapper.UnitMapper;
import com.living.hana.mapper.PaymentMapper;
import com.living.hana.client.HanaBankClient;
import com.living.hana.dto.AutoTransferRequest;
import com.living.hana.dto.AutoTransferResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ManagementFeeService {

    private final ManagementFeeChargeMapper managementFeeChargeMapper;
    private final LinkedBankAccountMapper linkedBankAccountMapper;
    private final ContractMapper contractMapper;
    private final UserMapper userMapper;
    private final UnitMapper unitMapper;
    private final PaymentMapper paymentMapper;
    private final HanaBankClient hanaBankClient;
    private final HanabankAccountService hanabankAccountService;

    /**
     * 관리비 청구 및 즉시 자동이체 실행
     */
    @Transactional
    public ManagementFeeChargeResponse chargeManagementFee(ManagementFeeChargeRequest request, Long chargedByUserId) {
        try {
            log.info("관리비 청구 시작: 호실ID={}, 청구금액={}", request.getUnitId(), request.getChargeAmount());

            // 1. 호실 정보 조회
            Unit unit = unitMapper.findById(request.getUnitId());
            if (unit == null) {
                throw new RuntimeException("호실을 찾을 수 없습니다.");
            }

            // 2. 해당 호실의 활성 계약 조회
            Contract activeContract = contractMapper.findActiveContractByUnitId(request.getUnitId());
            if (activeContract == null) {
                throw new RuntimeException("해당 호실에 활성화된 계약이 없습니다.");
            }

            // 3. 입주자 정보 조회
            User tenant = userMapper.findById(activeContract.getUserId());
            if (tenant == null) {
                throw new RuntimeException("입주자 정보를 찾을 수 없습니다.");
            }

            // 4. 관리비 청구 레코드 생성
            String currentDateTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

            ManagementFeeCharge charge = ManagementFeeCharge.builder()
                    .unitId(request.getUnitId())
                    .chargedByUserId(chargedByUserId)
                    .chargeAmount(request.getChargeAmount())
                    .chargeDescription(request.getChargeDescription())
                    .chargeDate(currentDateTime)
                    .dueDate(request.getDueDate())
                    .status("PENDING")
                    .autoPaymentTriggered("N")
                    .createdAt(currentDateTime)
                    .updatedAt(currentDateTime)
                    .build();

            managementFeeChargeMapper.insertManagementFeeCharge(charge);
            log.info("관리비 청구 레코드 생성 완료: ID={}", charge.getId());

            // 5. 즉시 자동이체 실행
            boolean autoPaymentResult = executeImmediateAutoPayment(charge, activeContract, tenant, unit);

            if (autoPaymentResult) {
                log.info("관리비 즉시 자동이체 성공: 청구ID={}", charge.getId());
            } else {
                log.warn("관리비 즉시 자동이체 실패 - 수동 결제 필요: 청구ID={}", charge.getId());
            }

            // 6. 응답 생성을 위해 상세 정보 조회
            return getManagementFeeChargeById(charge.getId());

        } catch (Exception e) {
            log.error("관리비 청구 실패: 호실ID={}, 오류={}", request.getUnitId(), e.getMessage(), e);
            throw new RuntimeException("관리비 청구에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 즉시 자동이체 실행
     */
    private boolean executeImmediateAutoPayment(ManagementFeeCharge charge, Contract contract, User tenant, Unit unit) {
        try {
            // 1. 입주자의 연결된 은행계좌 조회
            List<LinkedBankAccount> linkedAccounts = linkedBankAccountMapper.findActiveAccountsByUserId(tenant.getId());
            if (linkedAccounts.isEmpty()) {
                log.warn("연결된 은행계좌가 없습니다: 사용자ID={}", tenant.getId());
                return false;
            }

            // 2. 자동결제 설정된 계좌 찾기
            LinkedBankAccount autoPayAccount = linkedAccounts.stream()
                    .filter(account -> account.getAutoPaymentEnabled() != null && account.getAutoPaymentEnabled())
                    .findFirst()
                    .orElse(linkedAccounts.get(0)); // 설정된 계좌가 없으면 첫 번째 계좌 사용

            // 3. 하나은행 즉시이체 요청
            AutoTransferRequest transferRequest = AutoTransferRequest.builder()
                    .fromAccount(autoPayAccount.getAccountNumber())
                    .toAccount("110-123456-78901") // 하나원큐리빙 관리비 수납계좌
                    .toBankCode("088")
                    .toBankName("하나은행")
                    .amount(charge.getChargeAmount())
                    .beneficiaryName("하나원큐리빙")
                    .memo("관리비 납부 - 청구ID: " + charge.getId())
                    .build();

            AutoTransferResponse transferResponse = hanaBankClient.executeImmediateTransfer(transferRequest, tenant.getUserCi());

            if (transferResponse != null && transferResponse.isSuccess()) {
                // 4. PAYMENTS 테이블에 결제 기록 생성
                String currentDateTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

                Payment payment = Payment.builder()
                        .userId(tenant.getId())
                        .contractId(contract.getId())
                        .unitId(contract.getUnitId())
                        .buildingId(unit.getBuildingId())
                        .paymentType("TRANSFER")
                        .paymentCategory("MANAGEMENT_FEE")
                        .title("관리비 납부")
                        .description("관리비 자동이체 - 청구ID: " + charge.getId())
                        .amount(charge.getChargeAmount())
                        .dueDate(charge.getDueDate())
                        .status("COMPLETED")
                        .paidDate(currentDateTime)
                        .paymentMethod("TRANSFER")
                        .managementChargeId(charge.getId())
                        .hanaBankTransactionId(transferResponse.getTransactionId())
                        .createdAt(currentDateTime)
                        .updatedAt(currentDateTime)
                        .build();

                paymentMapper.insert(payment);

                // 5. 관리비 청구 상태 업데이트
                managementFeeChargeMapper.updateManagementFeeChargeStatus(charge.getId(), "PAID");
                managementFeeChargeMapper.updateManagementFeeChargePaymentInfo(charge.getId(), payment.getId(), "Y");

                log.info("즉시 자동이체 성공: 청구ID={}, 거래ID={}", charge.getId(), transferResponse.getTransactionId());
                return true;
            } else {
                log.error("하나은행 즉시이체 실패: 청구ID={}, 응답={}", charge.getId(), transferResponse);
                return false;
            }

        } catch (Exception e) {
            log.error("즉시 자동이체 실행 실패: 청구ID={}, 오류={}", charge.getId(), e.getMessage(), e);
            return false;
        }
    }

    /**
     * 관리비 청구 상세 정보 조회
     */
    public ManagementFeeChargeResponse getManagementFeeChargeById(Long chargeId) {
        List<ManagementFeeChargeResponse> charges = managementFeeChargeMapper.selectManagementFeeChargesByUnitId(
            managementFeeChargeMapper.selectManagementFeeChargeById(chargeId).getUnitId()
        );

        return charges.stream()
                .filter(charge -> charge.getId().equals(chargeId))
                .findFirst()
                .orElse(null);
    }

    /**
     * 사용자별 관리비 청구 목록 조회
     */
    public List<ManagementFeeChargeResponse> getManagementFeeChargesByUserId(Long userId) {
        return managementFeeChargeMapper.selectManagementFeeChargesByUserId(userId);
    }

    /**
     * 관리자용 전체 관리비 청구 목록 조회
     */
    public List<ManagementFeeChargeResponse> getAllManagementFeeCharges() {
        return managementFeeChargeMapper.selectAllManagementFeeCharges();
    }

    /**
     * DB 매칭 기반 결제 이력 조회 (DB에 저장된 실제 월세/관리비 납부 내역만 반환)
     */
    public Object getPaymentHistoryFromHanaBank(Long userId) {
        try {
            User user = userMapper.findById(userId);
            if (user == null) {
                throw new RuntimeException("사용자를 찾을 수 없습니다.");
            }

            // 1. DB에 저장된 사용자의 월세/관리비 결제 내역 조회
            List<Payment> dbPayments = paymentMapper.findPaymentHistoryByUserId(userId);

            java.util.Map<String, Object> result = new java.util.HashMap<>();
            result.put("userId", userId);
            result.put("userName", user.getName());

            // 2. 월세 결제 내역 필터링 및 변환
            List<java.util.Map<String, Object>> rentTransactions = dbPayments.stream()
                .filter(payment -> "RENT".equals(payment.getPaymentCategory()))
                .map(this::convertPaymentToPaymentHistory)
                .toList();
            result.put("rentTransactions", rentTransactions);

            // 3. 관리비 결제 내역 필터링 및 변환
            List<java.util.Map<String, Object>> managementTransactions = dbPayments.stream()
                .filter(payment -> "MANAGEMENT_FEE".equals(payment.getPaymentCategory()))
                .map(this::convertPaymentToPaymentHistory)
                .toList();
            result.put("managementFeeTransactions", managementTransactions);

            log.info("DB 매칭 기반 결제 이력 조회 완료: userId={}, 월세 {}건, 관리비 {}건",
                    userId, rentTransactions.size(), managementTransactions.size());

            return result;

        } catch (Exception e) {
            log.error("DB 매칭 기반 결제 이력 조회 실패: userId={}", userId, e);
            throw new RuntimeException("결제 이력 조회에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 빈 결제 이력 응답 생성
     */
    private Object createEmptyPaymentHistory() {
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("userId", null);
        result.put("userName", null);
        result.put("rentTransactions", List.of());
        result.put("managementFeeTransactions", List.of());
        return result;
    }

    /**
     * DB Payment 엔티티를 결제 이력 형태로 변환
     */
    private java.util.Map<String, Object> convertPaymentToPaymentHistory(Payment payment) {
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("id", payment.getId());
        result.put("amount", payment.getAmount());
        result.put("paymentDate", payment.getPaidDate());
        result.put("chargeDate", payment.getCreatedAt());
        result.put("hanaBankTransactionId", payment.getHanaBankTransactionId());
        result.put("status", payment.getStatus());
        result.put("unitNumber", payment.getUnitNumber() != null ? payment.getUnitNumber() : "정보 없음");
        result.put("buildingName", payment.getBuildingName() != null ? payment.getBuildingName() : "정보 없음");
        result.put("description", payment.getTitle() != null ? payment.getTitle() :
                   ("RENT".equals(payment.getPaymentCategory()) ? "월세 결제" : "관리비 결제"));
        result.put("paymentCategory", payment.getPaymentCategory());
        return result;
    }
    /**
     * 호실별 관리비 청구 목록 조회
     */
    public List<ManagementFeeChargeResponse> getManagementFeeChargesByUnitId(Long unitId) {
        return managementFeeChargeMapper.selectManagementFeeChargesByUnitId(unitId);
    }

    /**
     * 관리비 청구 취소
     */
    @Transactional
    public boolean cancelManagementFeeCharge(Long chargeId, Long cancelledByUserId) {
        try {
            ManagementFeeCharge charge = managementFeeChargeMapper.selectManagementFeeChargeById(chargeId);
            if (charge == null) {
                throw new RuntimeException("관리비 청구를 찾을 수 없습니다.");
            }

            if ("PAID".equals(charge.getStatus())) {
                throw new RuntimeException("이미 결제된 관리비는 취소할 수 없습니다.");
            }

            managementFeeChargeMapper.updateManagementFeeChargeStatus(chargeId, "CANCELLED");
            log.info("관리비 청구 취소: 청구ID={}, 취소자ID={}", chargeId, cancelledByUserId);
            return true;

        } catch (Exception e) {
            log.error("관리비 청구 취소 실패: 청구ID={}, 오류={}", chargeId, e.getMessage(), e);
            return false;
        }
    }
}