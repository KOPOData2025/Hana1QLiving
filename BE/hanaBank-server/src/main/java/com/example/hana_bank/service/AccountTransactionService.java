package com.example.hana_bank.service;

import com.example.hana_bank.entity.Account;
import com.example.hana_bank.entity.AccountTransaction;
import com.example.hana_bank.mapper.AccountMapper;
import com.example.hana_bank.mapper.AccountTransactionMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AccountTransactionService {

    private final AccountTransactionMapper accountTransactionMapper;
    private final AccountMapper accountMapper;

    /**
     * 거래내역 생성 (일반적인 거래 기록용)
     */
    public AccountTransaction createTransaction(AccountTransaction transaction) {
        try {
            if (transaction.getTransactionId() == null || transaction.getTransactionId().trim().isEmpty()) {
                transaction.setTransactionId(generateTransactionId());
            }

            if (transaction.getStatus() == null) {
                transaction.setStatus(AccountTransaction.STATUS_SUCCESS);
            }
            if (transaction.getCategory() == null) {
                transaction.setCategory(AccountTransaction.CATEGORY_GENERAL);
            }

            if (transaction.getDescription() == null || transaction.getDescription().trim().isEmpty()) {
                transaction.setDescription(transaction.generateDescription());
            }

            accountTransactionMapper.insertAccountTransaction(transaction);

            return transaction;

        } catch (Exception e) {
            log.error("거래내역 생성 실패: 계좌={}, 타입={}, 금액={}, 오류={}",
                    transaction.getAccountNumber(), transaction.getTransactionType(),
                    transaction.getAmount(), e.getMessage(), e);
            throw new RuntimeException("거래내역 생성에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 이체 거래내역 생성 (출금 + 입금 한 번에 처리)
     */
    @Transactional
    public String createTransferTransactions(String fromAccount, String toAccount,
                                           BigDecimal amount, String description,
                                           String category, String relatedBankCode, String relatedBankName) {
        try {
            String transactionId = generateTransactionId();

            // 출금계좌 정보 조회
            Account fromAccountInfo = accountMapper.findByAccountNumber(fromAccount)
                    .orElseThrow(() -> new RuntimeException("출금계좌를 찾을 수 없습니다: " + fromAccount));

            // 입금계좌 정보 조회 (같은 은행인 경우만)
            Account toAccountInfo = null;
            if (relatedBankCode == null || "088".equals(relatedBankCode)) {
                toAccountInfo = accountMapper.findByAccountNumber(toAccount).orElse(null);
            }

            // 1. 출금 거래내역 생성
            String withdrawalTransactionId = transactionId + "-OUT";
            AccountTransaction withdrawalTransaction = AccountTransaction.builder()
                    .accountNumber(fromAccount)
                    .transactionType(AccountTransaction.TYPE_TRANSFER_OUT)
                    .amount(amount)
                    .balanceBefore(fromAccountInfo.getBalance())
                    .balanceAfter(fromAccountInfo.getBalance().subtract(amount))
                    .transactionId(withdrawalTransactionId)
                    .description(description != null ? description :
                        String.format("이체 출금 (%s)", toAccount))
                    .relatedAccount(toAccount)
                    .relatedBankCode(relatedBankCode != null ? relatedBankCode : "088")
                    .relatedBankName(relatedBankName != null ? relatedBankName : "하나은행")
                    .category(category != null ? category : AccountTransaction.CATEGORY_GENERAL)
                    .status(AccountTransaction.STATUS_SUCCESS)
                    .build();

            accountTransactionMapper.insertAccountTransaction(withdrawalTransaction);

            if (toAccountInfo != null) {
                String depositTransactionId = transactionId + "-IN";
                AccountTransaction depositTransaction = AccountTransaction.builder()
                        .accountNumber(toAccount)
                        .transactionType(AccountTransaction.TYPE_TRANSFER_IN)
                        .amount(amount)
                        .balanceBefore(toAccountInfo.getBalance())
                        .balanceAfter(toAccountInfo.getBalance().add(amount))
                        .transactionId(depositTransactionId)
                        .description(description != null ? description :
                            String.format("이체 입금 (%s)", fromAccount))
                        .relatedAccount(fromAccount)
                        .relatedBankCode("088")
                        .relatedBankName("하나은행")
                        .category(category != null ? category : AccountTransaction.CATEGORY_GENERAL)
                        .status(AccountTransaction.STATUS_SUCCESS)
                        .build();

                accountTransactionMapper.insertAccountTransaction(depositTransaction);
            }

            return transactionId;

        } catch (Exception e) {
            log.error("이체 거래내역 생성 실패: {}→{}, 금액={}, 오류={}",
                    fromAccount, toAccount, amount, e.getMessage(), e);
            throw new RuntimeException("이체 거래내역 생성에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 계좌별 거래내역 조회
     */
    @Transactional(readOnly = true)
    public List<AccountTransaction> getTransactionsByAccount(String accountNumber,
                                                           Integer limit, Integer offset) {
        try {
            return accountTransactionMapper.findByAccountNumber(accountNumber, limit, offset);
        } catch (Exception e) {
            log.error("계좌 거래내역 조회 실패: 계좌={}, 오류={}", accountNumber, e.getMessage(), e);
            throw new RuntimeException("거래내역 조회에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 기간별 거래내역 조회
     */
    @Transactional(readOnly = true)
    public List<AccountTransaction> getTransactionsByDateRange(String accountNumber,
                                                             LocalDateTime startDate,
                                                             LocalDateTime endDate,
                                                             Integer limit, Integer offset) {
        try {
            return accountTransactionMapper.findByAccountNumberAndDateRange(
                    accountNumber, startDate, endDate, limit, offset);
        } catch (Exception e) {
            log.error("기간별 거래내역 조회 실패: 계좌={}, 기간={}~{}, 오류={}",
                    accountNumber, startDate, endDate, e.getMessage(), e);
            throw new RuntimeException("거래내역 조회에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 거래타입별 거래내역 조회
     */
    @Transactional(readOnly = true)
    public List<AccountTransaction> getTransactionsByType(String accountNumber,
                                                        String transactionType,
                                                        Integer limit, Integer offset) {
        try {
            return accountTransactionMapper.findByAccountNumberAndType(
                    accountNumber, transactionType, limit, offset);
        } catch (Exception e) {
            log.error("타입별 거래내역 조회 실패: 계좌={}, 타입={}, 오류={}",
                    accountNumber, transactionType, e.getMessage(), e);
            throw new RuntimeException("거래내역 조회에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 카테고리별 거래내역 조회
     */
    @Transactional(readOnly = true)
    public List<AccountTransaction> getTransactionsByCategory(String accountNumber,
                                                            String category,
                                                            Integer limit, Integer offset) {
        try {
            return accountTransactionMapper.findByAccountNumberAndCategory(
                    accountNumber, category, limit, offset);
        } catch (Exception e) {
            log.error("카테고리별 거래내역 조회 실패: 계좌={}, 카테고리={}, 오류={}",
                    accountNumber, category, e.getMessage(), e);
            throw new RuntimeException("거래내역 조회에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 최근 거래내역 조회
     */
    @Transactional(readOnly = true)
    public List<AccountTransaction> getRecentTransactions(String accountNumber, Integer limit) {
        try {
            return accountTransactionMapper.findRecentTransactions(accountNumber, limit);
        } catch (Exception e) {
            log.error("최근 거래내역 조회 실패: 계좌={}, 오류={}", accountNumber, e.getMessage(), e);
            throw new RuntimeException("거래내역 조회에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 거래내역 개수 조회
     */
    @Transactional(readOnly = true)
    public long getTransactionCount(String accountNumber) {
        try {
            return accountTransactionMapper.countByAccountNumber(accountNumber);
        } catch (Exception e) {
            log.error("거래내역 개수 조회 실패: 계좌={}, 오류={}", accountNumber, e.getMessage(), e);
            return 0;
        }
    }

    /**
     * 거래번호로 거래내역 조회
     */
    @Transactional(readOnly = true)
    public AccountTransaction getTransactionByTransactionId(String transactionId) {
        try {
            return accountTransactionMapper.findByTransactionId(transactionId);
        } catch (Exception e) {
            log.error("거래번호별 거래내역 조회 실패: 거래번호={}, 오류={}", transactionId, e.getMessage(), e);
            return null;
        }
    }

    /**
     * 거래내역 상태 업데이트
     */
    public void updateTransactionStatus(Long transactionId, String status) {
        try {
            accountTransactionMapper.updateStatus(transactionId, status);
        } catch (Exception e) {
            log.error("거래내역 상태 업데이트 실패: ID={}, 상태={}, 오류={}",
                    transactionId, status, e.getMessage(), e);
            throw new RuntimeException("거래내역 상태 업데이트에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 거래번호 생성
     */
    private String generateTransactionId() {
        return String.format("TXN_%d_%s",
                System.currentTimeMillis(),
                UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    }
}