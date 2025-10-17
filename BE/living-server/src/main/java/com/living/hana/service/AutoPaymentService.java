package com.living.hana.service;

import com.living.hana.annotation.Logging;
import com.living.hana.entity.LinkedBankAccount;
import com.living.hana.entity.Contract;
import com.living.hana.entity.User;
import com.living.hana.client.HanaBankClient;
import com.living.hana.dto.AutoTransferContractInfo;
import com.living.hana.mapper.LinkedBankAccountMapper;
import com.living.hana.mapper.ContractMapper;
import com.living.hana.mapper.UserMapper;
import com.living.hana.mapper.PaymentMapper;
import com.living.hana.mapper.RentAutoPaymentMapper;
import com.living.hana.mapper.RentPaymentRecordMapper;
import com.living.hana.entity.RentAutoPayment;
import com.living.hana.entity.RentPaymentRecord;
import com.living.hana.entity.Payment;
import com.living.hana.dto.AutoPaymentDetailDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AutoPaymentService {

    private final LinkedBankAccountMapper linkedBankAccountMapper;
    private final ContractMapper contractMapper;
    private final UserMapper userMapper;
    private final PaymentMapper paymentMapper;
    private final RentAutoPaymentMapper rentAutoPaymentMapper;
    private final RentPaymentRecordMapper rentPaymentRecordMapper;
    private final HanaBankClient hanaBankClient;

    /**
     * 자동결제 설정
     */
    @Logging(operation = "자동이체 설정", category = "TRANSFER", maskSensitive = true)
    public boolean setupAutoPayment(Long userId, Long contractId, String fromAccount, BigDecimal amount, Integer transferDay) {
        try {
            log.info("자동결제 설정 시작: 사용자ID={}, 계약ID={}", userId, contractId);
            
            // 1. 사용자 조회
            User user = userMapper.findById(userId);
            if (user == null) {
                throw new RuntimeException("사용자를 찾을 수 없습니다.");
            }
            
            // 2. 계약 조회
            Contract contract = contractMapper.findById(contractId);
            if (contract == null) {
                throw new RuntimeException("계약을 찾을 수 없습니다.");
            }
            
            if (!contract.getUserId().equals(userId)) {
                throw new RuntimeException("계약에 대한 권한이 없습니다.");
            }
            
            // 3. 연결된 은행계좌 조회
            LinkedBankAccount linkedAccount = linkedBankAccountMapper.findAccountByUserIdAndAccountNumber(userId, fromAccount);
            if (linkedAccount == null) {
                throw new RuntimeException("연결된 은행계좌를 찾을 수 없습니다. 먼저 계좌를 등록해주세요: " + fromAccount);
            }
            
            // 4. 하나원큐리빙 RENT_AUTO_PAYMENTS 테이블에 자동이체 등록
            RentAutoPayment rentAutoPayment = RentAutoPayment.builder()
                    .contractId(contractId)
                    .userId(userId)
                    .unitId(contract.getUnitId())
                    .linkedAccountId(linkedAccount.getId())
                    .monthlyRent(amount)
                    .paymentDay(transferDay)
                    .autoPaymentEnabled(1)
                    .status("ACTIVE")
                    .createdAt(new java.sql.Timestamp(System.currentTimeMillis()))
                    .updatedAt(new java.sql.Timestamp(System.currentTimeMillis()))
                    .build();

            rentAutoPaymentMapper.insertRentAutoPayment(rentAutoPayment);
            Long autoTransferContractId = rentAutoPayment.getId(); // 자동이체 ID만 저장

            // 5. 연결된 은행계좌에 자동결제 정보 업데이트
            linkedAccount.setAutoPaymentEnabled(true);
            linkedAccount.setAutoPaymentAmount(amount);
            linkedAccount.setAutoPaymentTransferDay(transferDay);
            linkedAccount.setHanaContractId(autoTransferContractId.toString());
            
            linkedBankAccountMapper.updateLinkedBankAccount(linkedAccount);
            
            log.info("자동결제 설정 완료: 사용자ID={}, 자동이체계약ID={}", userId, autoTransferContractId);
            
            return true;
            
        } catch (Exception e) {
            log.error("자동결제 설정 실패: 사용자ID={}, 계약ID={}, 오류={}", userId, contractId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 자동결제 해지
     */
    @Logging(operation = "자동이체 취소", category = "TRANSFER", maskSensitive = true)
    public boolean cancelAutoPayment(Long userId, Long contractId) {
        try {
            log.info("자동결제 해지 시작: 사용자ID={}, 계약ID={}", userId, contractId);
            
            // 1. 사용자 조회
            User user = userMapper.findById(userId);
            if (user == null) {
                throw new RuntimeException("사용자를 찾을 수 없습니다.");
            }
            
            // 2. 계약 조회
            Contract contract = contractMapper.findById(contractId);
            if (contract == null) {
                throw new RuntimeException("계약을 찾을 수 없습니다.");
            }
            
            if (!contract.getUserId().equals(userId)) {
                throw new RuntimeException("계약에 대한 권한이 없습니다.");
            }
            
            // 3. 자동결제가 설정된 계좌 조회
            List<LinkedBankAccount> autoPaymentAccounts = linkedBankAccountMapper.findByUserIdAndAutoPaymentEnabled(userId, true);
            LinkedBankAccount targetAccount = autoPaymentAccounts.stream()
                    .filter(account -> account.getHanaContractId() != null)
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("자동결제 설정된 계좌를 찾을 수 없습니다."));
            
            // 4. 하나원큐리빙 RENT_AUTO_PAYMENTS 테이블에서 자동이체 해지
            String contractIdStr = targetAccount.getHanaContractId();
            if (contractIdStr != null) {
                Long rentAutoPaymentId = Long.parseLong(contractIdStr); // 숫자 ID 직접 사용
                RentAutoPayment rentAutoPayment = rentAutoPaymentMapper.findById(rentAutoPaymentId);
                if (rentAutoPayment != null) {
                    rentAutoPayment.deactivate(); // isActive = "N"으로 설정
                    rentAutoPaymentMapper.updateRentAutoPayment(rentAutoPayment);
                }
            }
            
            // 5. 연결된 은행계좌의 자동결제 정보 제거
            targetAccount.setAutoPaymentEnabled(false);
            targetAccount.setAutoPaymentAmount(null);
            targetAccount.setAutoPaymentTransferDay(null);
            targetAccount.setHanaContractId(null);
            
            linkedBankAccountMapper.updateLinkedBankAccount(targetAccount);
            
            log.info("자동결제 해지 완료: 사용자ID={}, 하나은행계약ID={}", userId, targetAccount.getHanaContractId());
            
            return true;
            
        } catch (Exception e) {
            log.error("자동결제 해지 실패: 사용자ID={}, 계약ID={}, 오류={}", userId, contractId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 자동결제 일시정지
     */
    public boolean suspendAutoPayment(Long userId) {
        try {
            log.info("자동결제 일시정지 시작: 사용자ID={}", userId);
            
            // 1. 사용자 조회
            User user = userMapper.findById(userId);
            if (user == null) {
                throw new RuntimeException("사용자를 찾을 수 없습니다.");
            }
            
            // 2. 자동결제가 설정된 계좌 조회
            List<LinkedBankAccount> autoPaymentAccounts = linkedBankAccountMapper.findByUserIdAndAutoPaymentEnabled(userId, true);
            LinkedBankAccount targetAccount = autoPaymentAccounts.stream()
                    .filter(account -> account.getHanaContractId() != null)
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("자동결제 설정된 계좌를 찾을 수 없습니다."));
            
            // 3. 하나원큐리빙 RENT_AUTO_PAYMENTS 테이블에서 자동이체 일시정지
            String contractIdStr = targetAccount.getHanaContractId();
            if (contractIdStr != null) {
                Long rentAutoPaymentId = Long.parseLong(contractIdStr); // 숫자 ID 직접 사용
                RentAutoPayment rentAutoPayment = rentAutoPaymentMapper.findById(rentAutoPaymentId);
                if (rentAutoPayment != null) {
                    rentAutoPayment.deactivate(); // 일시정지는 비활성화
                    rentAutoPaymentMapper.updateRentAutoPayment(rentAutoPayment);
                }
            }
            
            log.info("자동결제 일시정지 완료: 사용자ID={}, 하나은행계약ID={}", userId, targetAccount.getHanaContractId());
            
            return true;
            
        } catch (Exception e) {
            log.error("자동결제 일시정지 실패: 사용자ID={}, 오류={}", userId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 자동결제 재개
     */
    public boolean resumeAutoPayment(Long userId) {
        try {
            log.info("자동결제 재개 시작: 사용자ID={}", userId);
            
            // 1. 사용자 조회
            User user = userMapper.findById(userId);
            if (user == null) {
                throw new RuntimeException("사용자를 찾을 수 없습니다.");
            }
            
            // 2. 자동결제가 설정된 계좌 조회
            List<LinkedBankAccount> autoPaymentAccounts = linkedBankAccountMapper.findByUserIdAndAutoPaymentEnabled(userId, true);
            LinkedBankAccount targetAccount = autoPaymentAccounts.stream()
                    .filter(account -> account.getHanaContractId() != null)
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("자동결제 설정된 계좌를 찾을 수 없습니다."));
            
            // 3. 하나원큐리빙 RENT_AUTO_PAYMENTS 테이블에서 자동이체 재개
            String contractIdStr = targetAccount.getHanaContractId();
            if (contractIdStr != null) {
                Long rentAutoPaymentId = Long.parseLong(contractIdStr); // 숫자 ID 직접 사용
                RentAutoPayment rentAutoPayment = rentAutoPaymentMapper.findById(rentAutoPaymentId);
                if (rentAutoPayment != null) {
                    rentAutoPayment.activate(); // 재개는 활성화
                    rentAutoPaymentMapper.updateRentAutoPayment(rentAutoPayment);
                }
            }
            
            log.info("자동결제 재개 완료: 사용자ID={}, 하나은행계약ID={}", userId, targetAccount.getHanaContractId());
            
            return true;
            
        } catch (Exception e) {
            log.error("자동결제 재개 실패: 사용자ID={}, 오류={}", userId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 사용자의 자동결제 설정 조회
     */
    @Transactional(readOnly = true)
    public AutoTransferContractInfo getAutoPaymentInfo(Long userId) {
        try {
            log.info("자동결제 정보 조회: 사용자ID={}", userId);
            
            // 1. 사용자 조회
            User user = userMapper.findById(userId);
            if (user == null) {
                throw new RuntimeException("사용자를 찾을 수 없습니다.");
            }
            
            // 2. 자동결제가 설정된 계좌 조회
            List<LinkedBankAccount> autoPaymentAccounts = linkedBankAccountMapper.findByUserIdAndAutoPaymentEnabled(userId, true);
            LinkedBankAccount targetAccount = autoPaymentAccounts.stream()
                    .filter(account -> account.getHanaContractId() != null)
                    .findFirst()
                    .orElse(null);
            
            if (targetAccount == null) {
                log.info("자동결제 설정이 없음: 사용자ID={}", userId);
                return null;
            }
            
            // 3. 하나원큐리빙 RENT_AUTO_PAYMENTS 테이블에서 정보 조회
            String contractIdStr = targetAccount.getHanaContractId();
            if (contractIdStr != null) {
                Long rentAutoPaymentId = Long.parseLong(contractIdStr);
                RentAutoPayment rentAutoPayment = rentAutoPaymentMapper.findById(rentAutoPaymentId);

                if (rentAutoPayment != null) {
                    // RentAutoPayment 정보를 AutoTransferContractInfo로 변환
                    AutoTransferContractInfo contractInfo = new AutoTransferContractInfo();
                    contractInfo.setId(rentAutoPaymentId);
                    contractInfo.setFromAccount(targetAccount.getAccountNumber());
                    contractInfo.setAmount(rentAutoPayment.getMonthlyRent());
                    contractInfo.setTransferDay(rentAutoPayment.getPaymentDay());
                    contractInfo.setStatus(rentAutoPayment.getStatus());

                    log.info("자동결제 정보 조회 완료: 사용자ID={}, 계약ID={}", userId, rentAutoPaymentId);
                    return contractInfo;
                }
            }

            log.info("자동결제 정보 없음: 사용자ID={}", userId);
            return null;
            
        } catch (Exception e) {
            log.error("자동결제 정보 조회 실패: 사용자ID={}, 오류={}", userId, e.getMessage(), e);
            return null;
        }
    }

    /**
     * 자동결제 설정 여부 확인
     */
    @Transactional(readOnly = true)
    public boolean hasAutoPaymentSetup(Long userId) {
        try {
            List<LinkedBankAccount> autoPaymentAccounts = linkedBankAccountMapper.findByUserIdAndAutoPaymentEnabled(userId, true);
            return autoPaymentAccounts.stream()
                    .anyMatch(account -> account.getHanaContractId() != null);
        } catch (Exception e) {
            log.error("자동결제 설정 여부 확인 실패: 사용자ID={}, 오류={}", userId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 사용자의 자동결제 설정 목록 조회 (관리 화면용)
     */
    @Transactional
    public List<AutoPaymentDetailDto> getAutoPaymentList(Long userId) {
        try {
            log.info("자동결제 설정 목록 조회: 사용자ID={}", userId);

            List<RentAutoPayment> autoPayments = rentAutoPaymentMapper.findByUserId(userId);

            // 기존 데이터의 상태가 잘못되었을 경우를 대비한 임시 수정
            for (RentAutoPayment payment : autoPayments) {
                if (payment.getStatus() == null || (!payment.getStatus().equals("ACTIVE") && !payment.getStatus().equals("SUSPENDED"))) {
                    log.warn("자동결제 상태 불일치 감지 - 활성화로 업데이트: ID={}, 현재상태={}", payment.getId(), payment.getStatus());
                    payment.setStatus("ACTIVE");
                    if (payment.getAutoPaymentEnabled() == null || payment.getAutoPaymentEnabled() != 1) {
                        payment.setAutoPaymentEnabled(1);
                    }
                    // 상태 업데이트
                    rentAutoPaymentMapper.updateRentAutoPayment(payment);
                }
            }

            List<AutoPaymentDetailDto> result = autoPayments.stream()
                .map(this::convertToDetailDto)
                .collect(java.util.stream.Collectors.toList());

            log.info("자동결제 설정 목록 조회 완료: 사용자ID={}, 건수={}", userId, result.size());

            return result;

        } catch (Exception e) {
            log.error("자동결제 설정 목록 조회 실패: 사용자ID={}, 오류={}", userId, e.getMessage(), e);
            return java.util.Collections.emptyList();
        }
    }

    /**
     * RentAutoPayment를 AutoPaymentDetailDto로 변환
     */
    private AutoPaymentDetailDto convertToDetailDto(RentAutoPayment payment) {
        // 디버깅을 위한 로그
        log.info("자동결제 상태 확인: ID={}, status={}, autoPaymentEnabled={}, isActive={}",
            payment.getId(), payment.getStatus(), payment.getAutoPaymentEnabled(), payment.isActive());

        AutoPaymentDetailDto dto = AutoPaymentDetailDto.builder()
            .id(payment.getId())
            .userId(payment.getUserId())
            .unitId(payment.getUnitId())
            .contractId(payment.getContractId())
            .linkedAccountId(payment.getLinkedAccountId())
            .monthlyRent(payment.getMonthlyRent())
            .paymentDay(payment.getPaymentDay())
            .status(payment.getStatus())
            .lastPaymentStatus(payment.getLastPaymentStatus())
            .failureReason(payment.getFailureReason())
            .failureCount(payment.getFailureCount())
            .accountNumber(payment.getAccountNumber())
            .accountName(payment.getAccountName())
            .buildingName(payment.getBuildingName())
            .unitNumber(payment.getUnitNumber())
            .userName(payment.getUserName())
            .contractNumber(payment.getContractNumber())
            .build();

        // 다음 이체일 계산
        dto.calculateNextTransferDate();

        // 활성화 상태 설정
        dto.setActiveStatus(payment.isActive());

        return dto;
    }

    /**
     * 자동결제 설정 여부 확인 (컨트롤러에서 사용)
     */
    @Transactional(readOnly = true)
    public boolean hasAutoPayment(Long userId) {
        return hasAutoPaymentSetup(userId);
    }

    /**
     * 자동결제 서비스 상태 확인 (헬스체크)
     */
    @Transactional(readOnly = true)
    public boolean checkServiceHealth() {
        try {
            // 하나은행 API 연결 상태 확인
            boolean bankApiHealthy = hanaBankClient.checkHealth();
            
            // 데이터베이스 연결 상태 확인 (간단한 쿼리 실행)
            List<LinkedBankAccount> accounts = linkedBankAccountMapper.findAccountsByUserId(1L);
            boolean dbHealthy = accounts != null;
            
            log.info("자동결제 서비스 상태 - 은행API: {}, DB: {}", bankApiHealthy, dbHealthy);
            
            return bankApiHealthy && dbHealthy;
            
        } catch (Exception e) {
            log.error("자동결제 서비스 상태 확인 실패: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * 자동결제 실행 이력 조회
     */
    @Transactional(readOnly = true)
    public Object getAutoPaymentHistory(Long userId) {
        try {
            log.info("자동결제 이력 조회: 사용자ID={}", userId);

            // 1. 사용자 조회
            User user = userMapper.findById(userId);
            if (user == null) {
                throw new RuntimeException("사용자를 찾을 수 없습니다.");
            }

            // 2. 하나원큐리빙 RENT_PAYMENT_RECORDS 테이블에서 이력 조회
            List<RentPaymentRecord> history = rentPaymentRecordMapper.findByUserIdWithDetails(userId);

            log.info("자동결제 이력 조회 완료: 사용자ID={}, 건수={}", userId, history.size());

            return history;

        } catch (Exception e) {
            log.error("자동결제 이력 조회 실패: 사용자ID={}, 오류={}", userId, e.getMessage(), e);
            return java.util.Collections.emptyList();
        }
    }

    /**
     * 하나은행 자동이체 완료 알림 처리
     */
    @Logging(operation = "자동이체 완료 처리", category = "TRANSFER", maskSensitive = true)
    @Transactional
    public boolean processAutoPaymentCompletion(String userCi, String transactionId, String fromAccount, String toAccount, BigDecimal amount, String memo, String executedAt) {
        try {
            log.info("자동이체 완료 처리 시작: userCi={}, transactionId={}, amount={}", userCi, transactionId, amount);

            // 1. userCi로 사용자 조회
            User user = userMapper.findByUserCi(userCi);
            if (user == null) {
                log.error("사용자를 찾을 수 없습니다: userCi={}", userCi);
                return false;
            }

            // 2. 사용자의 활성 계약 조회
            List<Contract> activeContracts = contractMapper.findByUserIdAndStatus(user.getId(), "ACTIVE");
            if (activeContracts.isEmpty()) {
                log.error("활성 계약을 찾을 수 없습니다: userId={}", user.getId());
                return false;
            }

            Contract contract = activeContracts.get(0); // 첫 번째 활성 계약 사용

            // 3. 중복 결제 확인 (같은 거래ID로 이미 처리된 결제가 있는지 확인)
            List<Payment> existingPayments = paymentMapper.findByUserId(user.getId());
            boolean duplicateFound = existingPayments.stream()
                .anyMatch(payment -> transactionId.equals(payment.getHanaBankTransactionId()));

            if (duplicateFound) {
                log.warn("이미 처리된 거래입니다: transactionId={}", transactionId);
                return true; // 이미 처리되었으므로 성공으로 처리
            }

            // 4. PAYMENTS 테이블에 월세 결제 기록 생성
            String currentDateTime = LocalDateTime.now().toString().replace("T", " ");
            if (currentDateTime.length() > 19) {
                currentDateTime = currentDateTime.substring(0, 19);
            }

            Payment payment = Payment.builder()
                    .userId(user.getId())
                    .contractId(contract.getId())
                    .unitId(contract.getUnitId())
                    .buildingId(1L) // 기본값, 실제로는 Unit 테이블에서 조회 필요
                    .paymentType("MONTHLY_RENT")
                    .paymentCategory("RENT")
                    .title("월세 자동이체")
                    .description("하나은행 자동이체 - " + memo)
                    .amount(amount)
                    .dueDate(LocalDate.now().toString())
                    .status("PAID")
                    .paidDate(executedAt != null ? executedAt : currentDateTime)
                    .paymentDate(LocalDate.now().toString())
                    .paymentMethod("TRANSFER")
                    .hanaBankTransactionId(transactionId)
                    .createdAt(currentDateTime)
                    .updatedAt(currentDateTime)
                    .build();

            paymentMapper.insert(payment);

            log.info("자동이체 완료 처리 성공: userId={}, paymentId={}, transactionId={}",
                user.getId(), payment.getId(), transactionId);

            return true;

        } catch (Exception e) {
            log.error("자동이체 완료 처리 실패: userCi={}, transactionId={}, 오류={}", userCi, transactionId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 자동결제 금액 수정
     */
    public boolean updateAutoPaymentAmount(Long userId, BigDecimal newAmount) {
        try {
            log.info("자동결제 금액 수정 시작: 사용자ID={}, 새로운금액={}", userId, newAmount);

            // 1. 기존 자동결제 해지
            if (!cancelAutoPayment(userId, null)) {
                throw new RuntimeException("기존 자동결제 해지에 실패했습니다.");
            }

            // 2. 새로운 금액으로 자동결제 재설정
            // 기존 계약 정보를 가져와서 새로운 금액으로 설정
            List<LinkedBankAccount> accounts = linkedBankAccountMapper.findAccountsByUserId(userId);
            if (accounts.isEmpty()) {
                throw new RuntimeException("연결된 은행계좌를 찾을 수 없습니다.");
            }

            LinkedBankAccount primaryAccount = accounts.get(0);
            List<Contract> userContracts = contractMapper.findByUserId(userId);
            if (userContracts.isEmpty()) {
                throw new RuntimeException("사용자 계약을 찾을 수 없습니다.");
            }

            Contract activeContract = userContracts.stream()
                    .filter(contract -> "ACTIVE".equals(contract.getStatus()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("활성 계약을 찾을 수 없습니다."));

            // 기본 이체일을 매월 25일로 설정
            return setupAutoPayment(userId, activeContract.getId(), primaryAccount.getAccountNumber(), newAmount, 25);

        } catch (Exception e) {
            log.error("자동결제 금액 수정 실패: 사용자ID={}, 새로운금액={}, 오류={}", userId, newAmount, e.getMessage(), e);
            return false;
        }
    }
}