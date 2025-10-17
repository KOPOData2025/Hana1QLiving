package com.living.hana.mapper;

import com.living.hana.entity.Payment;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface PaymentMapper {

    // 모든 납부 내역 조회
    List<Payment> findAll();

    // ID로 납부 내역 조회
    Payment findById(Long id);

    // 사용자별 납부 내역 조회
    List<Payment> findByUserId(Long userId);

    // 계약별 납부 내역 조회
    List<Payment> findByContractId(Long contractId);

    // 건물별 납부 내역 조회
    List<Payment> findByBuildingId(Long buildingId);

    // 호실별 납부 내역 조회
    List<Payment> findByUnitId(Long unitId);

    // 상태별 납부 내역 조회
    List<Payment> findByStatus(String status);

    // 납부 내역 생성
    int insert(Payment payment);

    // 납부 내역 수정
    int update(Payment payment);

    // 납부 상태 변경
    int updateStatus(@Param("id") Long id, @Param("status") String status, @Param("hanaBankTransactionId") String hanaBankTransactionId);

    // 납부 내역 삭제
    int deleteById(Long id);

    // 사용자별 월세/관리비 결제 내역 조회 (상세 정보 포함)
    List<Payment> findPaymentHistoryByUserId(Long userId);

}