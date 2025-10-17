package com.example.hana_bank.mapper;

import com.example.hana_bank.entity.AutoTransferHistory;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Mapper
public interface AutoTransferHistoryMapper {
    
    // 기본 CRUD 메서드
    void insertAutoTransferHistory(AutoTransferHistory history);
    
    Optional<AutoTransferHistory> findById(@Param("id") Long id);
    
    List<AutoTransferHistory> findAll();
    
    void updateAutoTransferHistory(AutoTransferHistory history);
    
    void deleteById(@Param("id") Long id);
    
    // 계약별 실행 이력 조회
    List<AutoTransferHistory> findByContractId(@Param("contractId") Long contractId);
    
    // 상태별 실행 이력 조회
    List<AutoTransferHistory> findByStatus(@Param("status") String status);
    
    // 실행일 범위별 조회
    List<AutoTransferHistory> findByExecutionDateRange(
        @Param("startDate") LocalDateTime startDate, 
        @Param("endDate") LocalDateTime endDate
    );
    
    // 예정일 범위별 조회
    List<AutoTransferHistory> findByScheduledDateRange(
        @Param("startDate") LocalDate startDate, 
        @Param("endDate") LocalDate endDate
    );
    
    // 계약별 최근 실행 이력 조회
    Optional<AutoTransferHistory> findLatestByContractId(@Param("contractId") Long contractId);
    
    // 계약별 성공한 실행 이력 조회
    List<AutoTransferHistory> findSuccessHistoryByContractId(@Param("contractId") Long contractId);
    
    // 계약별 실패한 실행 이력 조회
    List<AutoTransferHistory> findFailedHistoryByContractId(@Param("contractId") Long contractId);
    
    // 재시도 가능한 실패 이력 조회
    List<AutoTransferHistory> findRetryableFailedHistory();
    
    // 특정 날짜의 실행 이력 조회
    List<AutoTransferHistory> findByExecutionDate(@Param("executionDate") LocalDate executionDate);
    
    // 특정 예정일의 실행 이력 조회
    List<AutoTransferHistory> findByScheduledDate(@Param("scheduledDate") LocalDate scheduledDate);
    
    // 거래번호로 실행 이력 조회
    Optional<AutoTransferHistory> findByTransactionId(@Param("transactionId") String transactionId);
    
    // 계약별 실행 이력 개수 조회
    int countByContractId(@Param("contractId") Long contractId);
    
    // 상태별 실행 이력 개수 조회
    int countByStatus(@Param("status") String status);
    
    // 계약별 상태별 실행 이력 개수 조회
    int countByContractIdAndStatus(@Param("contractId") Long contractId, @Param("status") String status);
    
    // 특정 기간의 성공률 조회 (통계용)
    Double getSuccessRateByDateRange(
        @Param("startDate") LocalDate startDate, 
        @Param("endDate") LocalDate endDate
    );
    
    // 재시도 횟수 업데이트
    void updateRetryCount(@Param("id") Long id, @Param("retryCount") Integer retryCount);
    
    // 실행 결과 업데이트 (성공)
    void updateAsSuccess(
        @Param("id") Long id, 
        @Param("transactionId") String transactionId
    );
    
    // 실행 결과 업데이트 (실패)
    void updateAsFailed(
        @Param("id") Long id, 
        @Param("failureReason") String failureReason
    );
    
    // 페이징을 위한 계약별 실행 이력 조회
    List<AutoTransferHistory> findByContractIdWithPaging(
        @Param("contractId") Long contractId,
        @Param("offset") int offset,
        @Param("limit") int limit
    );
    
    // 사용자별 실행 이력 조회 (계약 테이블과 조인)
    List<AutoTransferHistory> findByUserCi(@Param("userCi") String userCi);
}