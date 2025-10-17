package com.living.hana.mapper;

import com.living.hana.entity.RentPaymentRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 월세 결제 기록 매퍼
 */
@Mapper
public interface RentPaymentRecordMapper {

    /**
     * 월세 결제 기록 생성
     */
    void insert(RentPaymentRecord record);

    /**
     * ID로 조회
     */
    RentPaymentRecord findById(Long id);

    /**
     * 사용자별 월세 결제 이력 조회 (상세 정보 포함)
     */
    List<RentPaymentRecord> findByUserIdWithDetails(@Param("userId") Long userId);

    /**
     * 계약별 월세 결제 이력 조회
     */
    List<RentPaymentRecord> findByContractId(@Param("contractId") Long contractId);

    /**
     * 호실별 월세 결제 이력 조회
     */
    List<RentPaymentRecord> findByUnitId(@Param("unitId") Long unitId);

    /**
     * 하나은행 거래번호로 조회
     */
    RentPaymentRecord findByHanabankTransactionId(@Param("hanabankTransactionId") String hanabankTransactionId);

    /**
     * 하나은행 거래번호 존재 여부 확인
     */
    boolean existsByHanabankTransactionId(@Param("hanabankTransactionId") String hanabankTransactionId);

    /**
     * 기간별 월세 결제 이력 조회
     */
    List<RentPaymentRecord> findByDateRange(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    /**
     * 사용자별 기간별 월세 결제 이력 조회
     */
    List<RentPaymentRecord> findByUserIdAndDateRange(
            @Param("userId") Long userId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    /**
     * 상태별 월세 결제 이력 조회
     */
    List<RentPaymentRecord> findByStatus(@Param("status") String status);

    /**
     * 월세 결제 기록 수정
     */
    void update(RentPaymentRecord record);

    /**
     * 상태 업데이트
     */
    void updateStatus(
            @Param("id") Long id,
            @Param("status") String status,
            @Param("failureReason") String failureReason
    );

    /**
     * 하나은행 거래번호 업데이트
     */
    void updateHanabankTransactionId(
            @Param("id") Long id,
            @Param("hanabankTransactionId") String hanabankTransactionId
    );

    /**
     * ID로 삭제
     */
    void deleteById(Long id);

    /**
     * 전체 개수 조회
     */
    long countAll();

    /**
     * 사용자별 개수 조회
     */
    long countByUserId(@Param("userId") Long userId);

    /**
     * 상태별 개수 조회
     */
    long countByStatus(@Param("status") String status);
}