package com.example.hana_bank.mapper;

import com.example.hana_bank.entity.AccountTransaction;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface AccountTransactionMapper {

    /**
     * 거래내역 생성
     */
    void insertAccountTransaction(AccountTransaction transaction);

    /**
     * ID로 거래내역 조회
     */
    AccountTransaction findById(@Param("id") Long id);

    /**
     * 거래번호로 거래내역 조회
     */
    AccountTransaction findByTransactionId(@Param("transactionId") String transactionId);

    /**
     * 계좌번호로 거래내역 목록 조회
     */
    List<AccountTransaction> findByAccountNumber(
            @Param("accountNumber") String accountNumber,
            @Param("limit") Integer limit,
            @Param("offset") Integer offset
    );

    /**
     * 계좌번호와 기간으로 거래내역 조회
     */
    List<AccountTransaction> findByAccountNumberAndDateRange(
            @Param("accountNumber") String accountNumber,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            @Param("limit") Integer limit,
            @Param("offset") Integer offset
    );

    /**
     * 계좌번호와 거래타입으로 거래내역 조회
     */
    List<AccountTransaction> findByAccountNumberAndType(
            @Param("accountNumber") String accountNumber,
            @Param("transactionType") String transactionType,
            @Param("limit") Integer limit,
            @Param("offset") Integer offset
    );

    /**
     * 계좌번호와 카테고리로 거래내역 조회
     */
    List<AccountTransaction> findByAccountNumberAndCategory(
            @Param("accountNumber") String accountNumber,
            @Param("category") String category,
            @Param("limit") Integer limit,
            @Param("offset") Integer offset
    );

    /**
     * 계좌번호별 거래내역 개수 조회
     */
    long countByAccountNumber(@Param("accountNumber") String accountNumber);

    /**
     * 계좌번호와 기간별 거래내역 개수 조회
     */
    long countByAccountNumberAndDateRange(
            @Param("accountNumber") String accountNumber,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    /**
     * 상대방 계좌와의 거래내역 조회 (이체 내역)
     */
    List<AccountTransaction> findTransfersBetweenAccounts(
            @Param("fromAccount") String fromAccount,
            @Param("toAccount") String toAccount,
            @Param("limit") Integer limit,
            @Param("offset") Integer offset
    );

    /**
     * 거래내역 상태 업데이트
     */
    void updateStatus(
            @Param("id") Long id,
            @Param("status") String status
    );

    /**
     * 거래내역 수정
     */
    void updateAccountTransaction(AccountTransaction transaction);

    /**
     * 거래내역 삭제 (물리 삭제)
     */
    void deleteAccountTransaction(@Param("id") Long id);

    /**
     * 특정 거래번호 존재 여부 확인
     */
    boolean existsByTransactionId(@Param("transactionId") String transactionId);

    /**
     * 최근 거래내역 조회 (최신순)
     */
    List<AccountTransaction> findRecentTransactions(
            @Param("accountNumber") String accountNumber,
            @Param("limit") Integer limit
    );

    /**
     * 월별 거래내역 통계 조회
     */
    List<AccountTransaction> findMonthlyTransactions(
            @Param("accountNumber") String accountNumber,
            @Param("year") Integer year,
            @Param("month") Integer month
    );
}