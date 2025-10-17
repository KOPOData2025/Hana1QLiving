package com.living.hana.service;

import com.living.hana.dto.RentPaymentHistoryResponse;
import com.living.hana.dto.RentPaymentRecordRequest;
import com.living.hana.entity.RentPaymentRecord;
import com.living.hana.entity.Payment;
import com.living.hana.entity.User;
import com.living.hana.entity.Contract;
import com.living.hana.entity.Unit;
import com.living.hana.mapper.RentPaymentRecordMapper;
import com.living.hana.mapper.PaymentMapper;
import com.living.hana.mapper.ContractMapper;
import com.living.hana.mapper.UnitMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 월세 결제 기록 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RentPaymentService {

    private final RentPaymentRecordMapper rentPaymentRecordMapper;
    private final PaymentMapper paymentMapper;
    private final ContractMapper contractMapper;
    private final UnitMapper unitMapper;
    private final UserService userService;

    /**
     * 월세 결제 기록 생성
     */
    @Transactional
    public RentPaymentRecord createRentPaymentRecord(RentPaymentRecordRequest request) {
        log.info("[PAYMENT] 월세 결제 기록 생성 시작: contractId={}, userId={}, amount={}",
                request.getContractId(), request.getUserId(), request.getAmount());

        try {
            RentPaymentRecord record = RentPaymentRecord.builder()
                    .contractId(request.getContractId())
                    .userId(request.getUserId())
                    .unitId(request.getUnitId())
                    .amount(request.getAmount())
                    .paymentDate(request.getPaymentDate() != null ? request.getPaymentDate() : LocalDateTime.now())
                    .hanabankTransactionId(request.getHanabankTransactionId())
                    .fromAccount(request.getFromAccount())
                    .toAccount(request.getToAccount())
                    .status(request.getStatus() != null ? request.getStatus() : RentPaymentRecord.STATUS_PENDING)
                    .failureReason(request.getFailureReason())
                    .build();

            rentPaymentRecordMapper.insert(record);
            log.info("[PAYMENT] 월세 결제 기록 생성 완료: id={}", record.getId());

            return record;
        } catch (Exception e) {
            log.error("[PAYMENT] 월세 결제 기록 생성 실패: {}", e.getMessage(), e);
            throw new RuntimeException("월세 결제 기록 생성에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 월세 결제 기록 조회 by ID
     */
    public RentPaymentRecord getRentPaymentRecord(Long id) {

        RentPaymentRecord record = rentPaymentRecordMapper.findById(id);
        if (record == null) {
            throw new RuntimeException("월세 결제 기록을 찾을 수 없습니다: id=" + id);
        }

        return record;
    }

    /**
     * 사용자별 월세 결제 이력 조회
     */
    public RentPaymentHistoryResponse getUserRentPaymentHistory(Long userId) {
        log.info("[PAYMENT] 사용자별 월세 결제 이력 조회: userId={}", userId);

        try {
            // 사용자 정보 조회
            User user = userService.findById(userId);
            String userName = user != null ? user.getName() : "Unknown";

            // 월세 결제 이력 조회
            List<RentPaymentRecord> records = rentPaymentRecordMapper.findByUserIdWithDetails(userId);

            log.info("[PAYMENT] 사용자별 월세 결제 이력 조회 완료: userId={}, 건수={}", userId, records.size());

            return RentPaymentHistoryResponse.success(userId, userName, records);
        } catch (Exception e) {
            log.error("[PAYMENT] 사용자별 월세 결제 이력 조회 실패: userId={}, error={}", userId, e.getMessage(), e);
            return RentPaymentHistoryResponse.error("월세 결제 이력 조회에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 계약별 월세 결제 이력 조회
     */
    public List<RentPaymentRecord> getContractRentPaymentHistory(Long contractId) {
        return rentPaymentRecordMapper.findByContractId(contractId);
    }

    /**
     * 호실별 월세 결제 이력 조회
     */
    public List<RentPaymentRecord> getUnitRentPaymentHistory(Long unitId) {
        return rentPaymentRecordMapper.findByUnitId(unitId);
    }

    /**
     * 기간별 월세 결제 이력 조회
     */
    public List<RentPaymentRecord> getRentPaymentHistoryByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return rentPaymentRecordMapper.findByDateRange(startDate, endDate);
    }

    /**
     * 사용자별 기간별 월세 결제 이력 조회
     */
    public List<RentPaymentRecord> getUserRentPaymentHistoryByDateRange(Long userId, LocalDateTime startDate, LocalDateTime endDate) {
        return rentPaymentRecordMapper.findByUserIdAndDateRange(userId, startDate, endDate);
    }

    /**
     * 상태별 월세 결제 이력 조회
     */
    public List<RentPaymentRecord> getRentPaymentHistoryByStatus(String status) {
        return rentPaymentRecordMapper.findByStatus(status);
    }

    /**
     * 하나은행 거래번호로 조회
     */
    public RentPaymentRecord getRentPaymentRecordByTransactionId(String transactionId) {
        return rentPaymentRecordMapper.findByHanabankTransactionId(transactionId);
    }

    /**
     * 하나은행 거래번호 존재 여부 확인
     */
    public boolean existsByHanabankTransactionId(String transactionId) {
        return rentPaymentRecordMapper.existsByHanabankTransactionId(transactionId);
    }

    /**
     * 월세 결제 기록 수정
     */
    @Transactional
    public RentPaymentRecord updateRentPaymentRecord(Long id, RentPaymentRecordRequest request) {
        log.info("월세 결제 기록 수정: id={}", id);

        try {
            RentPaymentRecord existingRecord = getRentPaymentRecord(id);

            RentPaymentRecord updatedRecord = RentPaymentRecord.builder()
                    .id(existingRecord.getId())
                    .contractId(request.getContractId() != null ? request.getContractId() : existingRecord.getContractId())
                    .userId(request.getUserId() != null ? request.getUserId() : existingRecord.getUserId())
                    .unitId(request.getUnitId() != null ? request.getUnitId() : existingRecord.getUnitId())
                    .amount(request.getAmount() != null ? request.getAmount() : existingRecord.getAmount())
                    .paymentDate(request.getPaymentDate() != null ? request.getPaymentDate() : existingRecord.getPaymentDate())
                    .hanabankTransactionId(request.getHanabankTransactionId() != null ? request.getHanabankTransactionId() : existingRecord.getHanabankTransactionId())
                    .fromAccount(request.getFromAccount() != null ? request.getFromAccount() : existingRecord.getFromAccount())
                    .toAccount(request.getToAccount() != null ? request.getToAccount() : existingRecord.getToAccount())
                    .status(request.getStatus() != null ? request.getStatus() : existingRecord.getStatus())
                    .failureReason(request.getFailureReason())
                    .createdAt(existingRecord.getCreatedAt())
                    .build();

            rentPaymentRecordMapper.update(updatedRecord);
            log.info("월세 결제 기록 수정 완료: id={}", id);

            return getRentPaymentRecord(id);
        } catch (Exception e) {
            log.error("월세 결제 기록 수정 실패: id={}, error={}", id, e.getMessage(), e);
            throw new RuntimeException("월세 결제 기록 수정에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 월세 결제 상태 업데이트
     */
    @Transactional
    public void updateRentPaymentStatus(Long id, String status, String failureReason) {
        log.info("월세 결제 상태 업데이트: id={}, status={}", id, status);

        try {
            rentPaymentRecordMapper.updateStatus(id, status, failureReason);
            log.info("월세 결제 상태 업데이트 완료: id={}, status={}", id, status);
        } catch (Exception e) {
            log.error("월세 결제 상태 업데이트 실패: id={}, error={}", id, e.getMessage(), e);
            throw new RuntimeException("월세 결제 상태 업데이트에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 하나은행 거래번호 업데이트
     */
    @Transactional
    public void updateHanabankTransactionId(Long id, String transactionId) {
        log.info("하나은행 거래번호 업데이트: id={}, transactionId={}", id, transactionId);

        try {
            rentPaymentRecordMapper.updateHanabankTransactionId(id, transactionId);
            log.info("하나은행 거래번호 업데이트 완료: id={}, transactionId={}", id, transactionId);
        } catch (Exception e) {
            log.error("하나은행 거래번호 업데이트 실패: id={}, error={}", id, e.getMessage(), e);
            throw new RuntimeException("하나은행 거래번호 업데이트에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 월세 결제 기록 삭제
     */
    @Transactional
    public void deleteRentPaymentRecord(Long id) {
        log.info("월세 결제 기록 삭제: id={}", id);

        try {
            // 기록 존재 여부 확인
            getRentPaymentRecord(id);

            rentPaymentRecordMapper.deleteById(id);
            log.info("월세 결제 기록 삭제 완료: id={}", id);
        } catch (Exception e) {
            log.error("월세 결제 기록 삭제 실패: id={}, error={}", id, e.getMessage(), e);
            throw new RuntimeException("월세 결제 기록 삭제에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 전체 월세 결제 기록 개수 조회
     */
    public long getTotalRentPaymentCount() {
        return rentPaymentRecordMapper.countAll();
    }

    /**
     * 사용자별 월세 결제 기록 개수 조회
     */
    public long getUserRentPaymentCount(Long userId) {
        return rentPaymentRecordMapper.countByUserId(userId);
    }

    /**
     * 상태별 월세 결제 기록 개수 조회
     */
    public long getRentPaymentCountByStatus(String status) {
        return rentPaymentRecordMapper.countByStatus(status);
    }

    /**
     * Cloud Function용 - 월세 자동이체 처리 후 기록 생성
     *
     * @param contractId            계약 ID
     * @param userId                사용자 ID
     * @param unitId                호실 ID
     * @param amount                결제 금액
     * @param fromAccount           출금 계좌
     * @param toAccount             입금 계좌
     * @param hanabankTransactionId 하나은행 거래번호
     * @param success               이체 성공 여부
     * @param failureReason         실패 사유 (실패시)
     */
    @Transactional
    public void recordRentAutoTransfer(Long contractId, Long userId, Long unitId,
                                       BigDecimal amount, String fromAccount, String toAccount,
                                       String hanabankTransactionId, boolean success, String failureReason) {
        log.info("월세 자동이체 기록 생성: contractId={}, success={}", contractId, success);

        try {
            // 1. RENT_PAYMENT_RECORDS 테이블에 기록
            RentPaymentRecordRequest request = RentPaymentRecordRequest.builder()
                    .contractId(contractId)
                    .userId(userId)
                    .unitId(unitId)
                    .amount(amount)
                    .paymentDate(LocalDateTime.now())
                    .hanabankTransactionId(hanabankTransactionId)
                    .fromAccount(fromAccount)
                    .toAccount(toAccount)
                    .status(success ? RentPaymentRecord.STATUS_COMPLETED : RentPaymentRecord.STATUS_FAILED)
                    .failureReason(failureReason)
                    .build();

            RentPaymentRecord rentRecord = createRentPaymentRecord(request);

            // 2. 성공한 경우에만 PAYMENTS 테이블에도 동시 저장
            if (success) {
                createPaymentRecord(contractId, userId, unitId, amount, hanabankTransactionId);
            }
        } catch (Exception e) {
            log.error("월세 자동이체 기록 생성 실패: contractId={}, error={}", contractId, e.getMessage(), e);
            throw new RuntimeException("월세 자동이체 기록 생성에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * PAYMENTS 테이블에 월세 결제 기록 생성
     */
    private void createPaymentRecord(Long contractId, Long userId, Long unitId,
                                   java.math.BigDecimal amount, String hanabankTransactionId) {
        try {
            // 계약 정보 조회
            Contract contract = contractMapper.findById(contractId);

            // 호실 정보 조회하여 buildingId 가져오기
            Unit unit = unitMapper.findById(unitId);
            Long buildingId = (unit != null) ? unit.getBuildingId() : 1L; // fallback은 1L

            String currentDateTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

            Payment payment = Payment.builder()
                    .userId(userId)
                    .contractId(contractId)
                    .unitId(unitId)
                    .buildingId(buildingId) // Unit에서 실제 buildingId 조회
                    .paymentType("MONTHLY_RENT")
                    .paymentCategory("RENT")
                    .title("월세 자동이체")
                    .description("Cloud Run 월세 자동이체")
                    .amount(amount)
                    .dueDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")))
                    .status("COMPLETED")
                    .paidDate(currentDateTime)
                    .paymentMethod("TRANSFER")
                    .hanaBankTransactionId(hanabankTransactionId)
                    .createdAt(currentDateTime)
                    .updatedAt(currentDateTime)
                    .build();

            paymentMapper.insert(payment);
            log.info("PAYMENTS 테이블에 월세 기록 생성 완료: paymentId={}, transactionId={}",
                    payment.getId(), hanabankTransactionId);

        } catch (Exception e) {
            log.error("PAYMENTS 테이블 월세 기록 생성 실패: contractId={}, error={}", contractId, e.getMessage(), e);
        }
    }
}