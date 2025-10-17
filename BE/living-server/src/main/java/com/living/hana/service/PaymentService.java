package com.living.hana.service;

import com.living.hana.annotation.Logging;
import com.living.hana.dto.PaymentRequest;
import com.living.hana.entity.Payment;
import com.living.hana.entity.Contract;
import com.living.hana.mapper.PaymentMapper;
import com.living.hana.mapper.ContractMapper;
import com.living.hana.util.BusinessLogger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PaymentService {

    private final PaymentMapper paymentMapper;
    private final ContractMapper contractMapper;

    /**
     * 모든 납부 내역 조회
     */
    public List<Payment> findAll() {
        return paymentMapper.findAll();
    }

    /**
     * ID로 납부 내역 조회
     */
    public Payment findById(Long id) {
        return paymentMapper.findById(id);
    }

    /**
     * 사용자별 납부 내역 조회
     */
    public List<Payment> findByUserId(Long userId) {
        return paymentMapper.findByUserId(userId);
    }

    /**
     * 계약별 납부 내역 조회
     */
    public List<Payment> findByContractId(Long contractId) {
        return paymentMapper.findByContractId(contractId);
    }

    /**
     * 건물별 납부 내역 조회
     */
    public List<Payment> findByBuildingId(Long buildingId) {
        return paymentMapper.findByBuildingId(buildingId);
    }

    /**
     * 호실별 납부 내역 조회
     */
    public List<Payment> findByUnitId(Long unitId) {
        return paymentMapper.findByUnitId(unitId);
    }

    /**
     * 상태별 납부 내역 조회
     */
    public List<Payment> findByStatus(String status) {
        return paymentMapper.findByStatus(status);
    }

    /**
     * 건물의 모든 입주자에게 새 납부 고지 생성
     * 관리자가 특정 건물의 모든 유효한 계약자들에게 납부 고지를 발송
     */
    @Logging(operation = "일괄 이체 생성", category = "TRANSFER", maskSensitive = true)
    @Transactional
    public List<Payment> createBulkPayments(PaymentRequest request) {
        try {
            log.info("[PAYMENT] 일괄 납부 고지 생성 시작: buildingId={}, paymentType={}", request.getBuildingId(), request.getPaymentType());

            // 해당 건물의 모든 유효한 계약 조회
            List<Contract> activeContracts = contractMapper.findByStatus("ACTIVE");
            List<Contract> buildingContracts = new ArrayList<>();

            buildingContracts.addAll(activeContracts);

            List<Payment> createdPayments = new ArrayList<>();
            String currentTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

            // 각 계약자에게 납부 고지 생성
            for (Contract contract : buildingContracts) {
                // 계약의 납부일 확인
                Integer paymentDay = contract.getPaymentDay() != null ? contract.getPaymentDay() : 1;
                String currentDate = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

                // 이번 달에 이미 생성된 납부가 있는지 확인 (중복 방지)
                if (isPaymentAlreadyGenerated(contract.getId(), request.getPaymentType(), currentDate)) {
                    continue;
                }

                Payment payment = new Payment();
                payment.setContractId(contract.getId());
                payment.setUserId(contract.getUserId());
                payment.setUnitId(contract.getUnitId());
                payment.setBuildingId(request.getBuildingId());
                payment.setPaymentType(request.getPaymentType());
                payment.setTitle(request.getTitle());
                payment.setDescription(request.getDescription());
                payment.setAmount(request.getAmount());
                payment.setDueDate(request.getDueDate());
                payment.setStatus("PENDING");
                payment.setCreatedAt(currentTime);
                payment.setUpdatedAt(currentTime);

                paymentMapper.insert(payment);
                createdPayments.add(payment);
            }

            log.info("[PAYMENT] 일괄 납부 고지 생성 완료: buildingId={}, count={}", request.getBuildingId(), createdPayments.size());
            return createdPayments;

        } catch (Exception e) {
            log.error("[PAYMENT] 일괄 납부 고지 생성 실패: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * 개별 납부 내역 생성
     */
    public Payment createPayment(Payment payment) {
        try {
            log.info("[PAYMENT] 개별 납부 생성 시작: contractId={}, amount={}", payment.getContractId(), payment.getAmount());

            String currentTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            payment.setStatus("PENDING");
            payment.setCreatedAt(currentTime);
            payment.setUpdatedAt(currentTime);

            paymentMapper.insert(payment);

            log.info("[PAYMENT] 개별 납부 생성 완료: paymentId={}", payment.getId());
            return payment;
        } catch (Exception e) {
            log.error("[PAYMENT] 개별 납부 생성 실패: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * 납부 내역 수정
     */
    public Payment updatePayment(Payment payment) {
        try {
            log.info("[PAYMENT] 납부 정보 수정 시작: paymentId={}", payment.getId());

            payment.setUpdatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
            paymentMapper.update(payment);

            log.info("[PAYMENT] 납부 정보 수정 완료: paymentId={}", payment.getId());
            return payment;
        } catch (Exception e) {
            log.error("[PAYMENT] 납부 정보 수정 실패: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * 납부 상태 변경 (납부 완료 처리)
     */
    @Logging(operation = "이체 완료 처리", category = "TRANSFER", maskSensitive = true)
    public Payment markAsPaid(Long id, String hanaBankTransactionId) {
        try {
            log.info("[PAYMENT] 납부 완료 처리 시작: paymentId={}", id);

            paymentMapper.updateStatus(id, "PAID", hanaBankTransactionId);

            Payment payment = paymentMapper.findById(id);

            log.info("[PAYMENT] 납부 완료 처리 완료: paymentId={}, transactionId={}", id, hanaBankTransactionId);
            return payment;
        } catch (Exception e) {
            log.error("[PAYMENT] 납부 완료 처리 실패: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * 납부 내역 삭제
     */
    public void deletePayment(Long id) {
        try {
            log.info("[PAYMENT] 납부 내역 삭제 시작: paymentId={}", id);

            paymentMapper.deleteById(id);

            log.info("[PAYMENT] 납부 내역 삭제 완료: paymentId={}", id);
        } catch (Exception e) {
            log.error("[PAYMENT] 납부 내역 삭제 실패: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * 연체 처리 (기한이 지난 미납 건들을 연체로 변경)
     */
    @Logging(operation = "연체 이체 처리", category = "TRANSFER", maskSensitive = false)
    @Transactional
    public int processOverduePayments() {
        try {
            BusinessLogger.logBusinessOperation(PaymentService.class, "연체처리", "system");

            List<Payment> pendingPayments = paymentMapper.findByStatus("PENDING");
            int overdueCount = 0;
            String currentDate = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

            for (Payment payment : pendingPayments) {
                if (payment.getPaymentDate() != null && payment.getPaymentDate().compareTo(currentDate) < 0) {
                    paymentMapper.updateStatus(payment.getId(), "OVERDUE", null);
                    overdueCount++;
                }
            }

            BusinessLogger.logBusinessSuccess(PaymentService.class, "연체처리", "processed=" + overdueCount);
            return overdueCount;
        } catch (Exception e) {
            BusinessLogger.logBusinessError(PaymentService.class, "연체처리", e);
            throw e;
        }
    }
    
    /**
     * 이번 달에 이미 생성된 납부가 있는지 확인
     */
    private boolean isPaymentAlreadyGenerated(Long contractId, String paymentType, String currentDate) {
        try {
            LocalDate date = LocalDate.parse(currentDate);
            String yearMonth = date.format(DateTimeFormatter.ofPattern("yyyy-MM"));
            
            List<Payment> existingPayments = paymentMapper.findByContractId(contractId);
            
            for (Payment payment : existingPayments) {
                if (payment.getPaymentType().equals(paymentType) &&
                    payment.getCreatedAt() != null &&
                    payment.getCreatedAt().startsWith(yearMonth)) {
                    return true;
                }
            }
            
            return false;
        } catch (Exception e) {
            // 중복 확인 실패시 안전하게 false 반환 (로그 제거)
            return false;
        }
    }
}