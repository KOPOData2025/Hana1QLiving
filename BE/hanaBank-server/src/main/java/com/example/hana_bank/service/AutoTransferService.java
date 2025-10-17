package com.example.hana_bank.service;

import com.example.hana_bank.entity.Account;
import com.example.hana_bank.entity.AutoTransferContract;
import com.example.hana_bank.entity.AutoTransferHistory;
import com.example.hana_bank.entity.ImmediateTransferRequest;
import com.example.hana_bank.entity.AccountTransaction;
import com.example.hana_bank.mapper.AccountMapper;
import com.example.hana_bank.mapper.AutoTransferContractMapper;
import com.example.hana_bank.mapper.AutoTransferHistoryMapper;
import com.example.hana_bank.mapper.ImmediateTransferRequestMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AutoTransferService {

    private final AutoTransferContractMapper autoTransferContractMapper;
    private final AutoTransferHistoryMapper autoTransferHistoryMapper;
    private final ImmediateTransferRequestMapper immediateTransferRequestMapper;
    private final AccountMapper accountMapper;
    private final AccountTransactionService accountTransactionService;

    /**
     * 자동이체 계약 등록
     */
    public AutoTransferContract registerAutoTransfer(AutoTransferContract contract) {
        validateFromAccount(contract.getFromAccount(), contract.getUserCi());
        validateDuplicateContract(contract.getUserCi(), contract.getFromAccount());

        contract.setNextTransferDate(contract.calculateNextTransferDate());
        contract.setStatus("ACTIVE");

        autoTransferContractMapper.insertAutoTransferContract(contract);

        return contract;
    }

    /**
     * 자동이체 계약 해지
     */
    public void cancelAutoTransfer(Long contractId, String userCi) {
        AutoTransferContract contract = autoTransferContractMapper.findById(contractId)
                .orElseThrow(() -> new RuntimeException("자동이체 계약을 찾을 수 없습니다."));

        if (!contract.getUserCi().equals(userCi)) {
            throw new RuntimeException("자동이체 계약에 대한 권한이 없습니다.");
        }

        if ("CANCELLED".equals(contract.getStatus())) {
            throw new RuntimeException("이미 해지된 자동이체 계약입니다.");
        }

        autoTransferContractMapper.updateStatus(contractId, "CANCELLED");
    }

    /**
     * 자동이체 일시정지
     */
    public void suspendAutoTransfer(Long contractId, String userCi) {
        AutoTransferContract contract = validateContractOwnership(contractId, userCi);

        if (!"ACTIVE".equals(contract.getStatus())) {
            throw new RuntimeException("활성 상태의 자동이체만 일시정지할 수 있습니다.");
        }

        autoTransferContractMapper.updateStatus(contractId, "SUSPENDED");
    }

    public void resumeAutoTransfer(Long contractId, String userCi) {
        AutoTransferContract contract = validateContractOwnership(contractId, userCi);

        if (!"SUSPENDED".equals(contract.getStatus())) {
            throw new RuntimeException("일시정지 상태의 자동이체만 재개할 수 있습니다.");
        }

        LocalDate nextTransferDate = contract.calculateNextTransferDate();
        autoTransferContractMapper.updateNextTransferDate(contractId, nextTransferDate);
        autoTransferContractMapper.updateStatus(contractId, "ACTIVE");
    }

    /**
     * 사용자별 자동이체 계약 목록 조회
     */
    @Transactional(readOnly = true)
    public List<AutoTransferContract> getUserAutoTransferContracts(String userCi) {
        return autoTransferContractMapper.findByUserCi(userCi);
    }

    /**
     * 활성 자동이체 계약 목록 조회
     */
    @Transactional(readOnly = true)
    public List<AutoTransferContract> getActiveAutoTransferContracts(String userCi) {
        return autoTransferContractMapper.findActiveContractsByUserCi(userCi);
    }

    /**
     * 자동이체 계약 상세 조회 (통계 포함)
     */
    @Transactional(readOnly = true)
    public AutoTransferContract getAutoTransferContract(Long contractId, String userCi) {
        AutoTransferContract contract = validateContractOwnership(contractId, userCi);
        
        // 계약별 실행 이력 조회하여 통계 계산
        List<AutoTransferHistory> histories = autoTransferHistoryMapper.findByContractId(contractId);
        
        long totalExecutions = histories.size();
        long successfulExecutions = histories.stream()
                .mapToLong(h -> "SUCCESS".equals(h.getStatus()) ? 1 : 0)
                .sum();
        long failedExecutions = histories.stream()
                .mapToLong(h -> "FAILED".equals(h.getStatus()) ? 1 : 0)
                .sum();
                
        // 마지막 실행일 조회
        LocalDateTime lastExecutionDate = histories.stream()
                .map(AutoTransferHistory::getExecutionDate)
                .max(LocalDateTime::compareTo)
                .orElse(null);
        
        // 통계 정보 설정
        contract.setTotalExecutions(totalExecutions);
        contract.setSuccessfulExecutions(successfulExecutions);
        contract.setFailedExecutions(failedExecutions);
        contract.setLastExecutionDate(lastExecutionDate);
        
        return contract;
    }

    /**
     * 자동이체 실행 이력 조회
     */
    @Transactional(readOnly = true)
    public List<AutoTransferHistory> getAutoTransferHistory(String userCi) {
        return autoTransferHistoryMapper.findByUserCi(userCi);
    }

    /**
     * 계약별 자동이체 실행 이력 조회
     */
    @Transactional(readOnly = true)
    public List<AutoTransferHistory> getContractTransferHistory(Long contractId, String userCi) {
        // 계약 소유자 확인
        validateContractOwnership(contractId, userCi);
        
        return autoTransferHistoryMapper.findByContractId(contractId);
    }

    /**
     * 스케줄러용: 오늘 실행할 자동이체 계약 조회
     */
    @Transactional(readOnly = true)
    public List<AutoTransferContract> getContractsToExecuteToday() {
        int today = LocalDate.now().getDayOfMonth();
        return autoTransferContractMapper.findContractsToExecute(today);
    }

    /**
     * 스케줄러용: 자동이체 실행
     */
    public void executeAutoTransfer(Long contractId) {
        AutoTransferContract contract = autoTransferContractMapper.findById(contractId)
                .orElseThrow(() -> new RuntimeException("자동이체 계약을 찾을 수 없습니다."));

        if (!contract.canExecuteTransfer()) {
            log.warn("자동이체 실행 불가: 계약ID={}, 상태={}, 다음이체일={}",
                    contractId, contract.getStatus(), contract.getNextTransferDate());
            return;
        }

        AutoTransferHistory history = AutoTransferHistory.builder()
                .contractId(contractId)
                .executionDate(LocalDateTime.now())
                .scheduledDate(contract.getNextTransferDate())
                .amount(contract.getAmount())
                .status("PENDING")
                .retryCount(0)
                .build();

        autoTransferHistoryMapper.insertAutoTransferHistory(history);

        try {
            String transactionId = processTransfer(contract);

            history.markAsSuccess(transactionId);
            autoTransferHistoryMapper.updateAsSuccess(history.getId(), transactionId);

            LocalDate nextTransferDate = contract.calculateNextTransferDate();
            autoTransferContractMapper.updateNextTransferDate(contractId, nextTransferDate);

        } catch (Exception e) {
            String failureReason = e.getMessage();
            history.markAsFailed(failureReason);
            autoTransferHistoryMapper.updateAsFailed(history.getId(), failureReason);

            log.error("자동이체 실행 실패: 계약ID={}, 실패사유={}", contractId, failureReason, e);
        }
    }

    /**
     * 실제 계좌 이체 처리
     */
    private String processTransfer(AutoTransferContract contract) {
        // 1. 출금계좌 잔액 확인
        Account fromAccount = accountMapper.findByAccountNumber(contract.getFromAccount())
                .orElseThrow(() -> new RuntimeException("출금계좌를 찾을 수 없습니다."));
        
        if (fromAccount.getBalance().compareTo(contract.getAmount()) < 0) {
            throw new RuntimeException("잔액이 부족합니다.");
        }
        
        // 2. 입금계좌 확인
        Account toAccount = accountMapper.findByAccountNumber(contract.getToAccount())
                .orElseThrow(() -> new RuntimeException("입금계좌를 찾을 수 없습니다."));
        
        // 3. 거래번호 생성
        String transactionId = generateTransactionId(contract.getId());
        
        // 4. 계좌 잔액 업데이트
        BigDecimal fromBalanceBefore = fromAccount.getBalance();
        BigDecimal toBalanceBefore = toAccount.getBalance();

        fromAccount.setBalance(fromAccount.getBalance().subtract(contract.getAmount()));
        toAccount.setBalance(toAccount.getBalance().add(contract.getAmount()));

        accountMapper.updateAccount(fromAccount);
        accountMapper.updateAccount(toAccount);

        // 5. 거래내역 생성 - 출금 거래
        AccountTransaction withdrawalTransaction = AccountTransaction.builder()
                .accountNumber(contract.getFromAccount())
                .transactionType(AccountTransaction.TYPE_TRANSFER_OUT)
                .amount(contract.getAmount())
                .balanceBefore(fromBalanceBefore)
                .balanceAfter(fromAccount.getBalance())
                .transactionId(transactionId + "-OUT")
                .description(String.format("자동이체 출금 (%s)", contract.getToAccount()))
                .relatedAccount(contract.getToAccount())
                .relatedBankCode(contract.getToBankCode() != null ? contract.getToBankCode() : "088")
                .relatedBankName(contract.getToBankName() != null ? contract.getToBankName() : "하나은행")
                .category(AccountTransaction.CATEGORY_RENT) // 자동이체는 대부분 월세
                .status(AccountTransaction.STATUS_SUCCESS)
                .build();

        accountTransactionService.createTransaction(withdrawalTransaction);

        if (contract.getToBankCode() == null || "088".equals(contract.getToBankCode())) {
            AccountTransaction depositTransaction = AccountTransaction.builder()
                    .accountNumber(contract.getToAccount())
                    .transactionType(AccountTransaction.TYPE_TRANSFER_IN)
                    .amount(contract.getAmount())
                    .balanceBefore(toBalanceBefore)
                    .balanceAfter(toAccount.getBalance())
                    .transactionId(transactionId + "-IN")
                    .description(String.format("자동이체 입금 (%s)", contract.getFromAccount()))
                    .relatedAccount(contract.getFromAccount())
                    .relatedBankCode("088")
                    .relatedBankName("하나은행")
                    .category(AccountTransaction.CATEGORY_RENT)
                    .status(AccountTransaction.STATUS_SUCCESS)
                    .build();

            accountTransactionService.createTransaction(depositTransaction);
        }

        return transactionId;
    }

    /**
     * 출금계좌 유효성 검증
     */
    private void validateFromAccount(String accountNumber, String userCi) {
        Account account = accountMapper.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new RuntimeException("출금계좌를 찾을 수 없습니다."));
        
        if (!account.getUserCi().equals(userCi)) {
            throw new RuntimeException("계좌 소유자가 일치하지 않습니다.");
        }
        
        if (!"ACTIVE".equals(account.getStatus())) {
            throw new RuntimeException("비활성 계좌는 자동이체 출금계좌로 사용할 수 없습니다.");
        }
    }

    /**
     * 중복 자동이체 계약 확인
     */
    private void validateDuplicateContract(String userCi, String fromAccount) {
        boolean exists = autoTransferContractMapper.existsActiveContractByUserCiAndAccount(userCi, fromAccount);
        if (exists) {
            throw new RuntimeException("해당 계좌에 이미 활성 상태의 자동이체 계약이 존재합니다.");
        }
    }

    /**
     * 계약 소유권 검증
     */
    private AutoTransferContract validateContractOwnership(Long contractId, String userCi) {
        AutoTransferContract contract = autoTransferContractMapper.findById(contractId)
                .orElseThrow(() -> new RuntimeException("자동이체 계약을 찾을 수 없습니다."));
        
        if (!contract.getUserCi().equals(userCi)) {
            throw new RuntimeException("자동이체 계약에 대한 권한이 없습니다.");
        }
        
        return contract;
    }

    /**
     * 즉시 이체 실행 (하나원큐리빙 관리비 청구용)
     */
    public ImmediateTransferRequest executeImmediateTransfer(AutoTransferContract contract) {
        ImmediateTransferRequest request = ImmediateTransferRequest.builder()
                .userCi(contract.getUserCi())
                .fromAccount(contract.getFromAccount())
                .toAccount(contract.getToAccount())
                .toBankCode(contract.getToBankCode())
                .toBankName(contract.getToBankName())
                .amount(contract.getAmount())
                .beneficiaryName(contract.getBeneficiaryName())
                .memo(contract.getMemo())
                .requestType("MANAGEMENT_FEE")
                .status("PENDING")
                .requestedAt(LocalDateTime.now())
                .build();

        try {
            immediateTransferRequestMapper.insertImmediateTransferRequest(request);
            validateFromAccount(contract.getFromAccount(), contract.getUserCi());
            String transactionId = processTransfer(contract);

            request.markAsSuccess(transactionId);
            immediateTransferRequestMapper.updateAsSuccess(request.getId(), transactionId);

            return request;

        } catch (Exception e) {
            log.error("즉시 이체 실패: 사용자={}, 오류={}", contract.getUserCi(), e.getMessage(), e);

            String failureReason = e.getMessage();
            request.markAsFailed(failureReason);
            if (request.getId() != null) {
                immediateTransferRequestMapper.updateAsFailed(request.getId(), failureReason);
            }

            throw new RuntimeException("즉시 이체 실행에 실패했습니다: " + e.getMessage());
        }
    }


    /**
     * 거래번호 생성
     */
    private String generateTransactionId(Long contractId) {
        if (contractId == null) {
            return String.format("AT%d", System.currentTimeMillis());
        }
        return String.format("AT%d%d", System.currentTimeMillis(), contractId);
    }
}