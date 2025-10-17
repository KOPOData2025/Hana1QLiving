package com.example.hana_bank.mapper;

import com.example.hana_bank.entity.ImmediateTransferRequest;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface ImmediateTransferRequestMapper {

    // 기본 CRUD 메서드
    void insertImmediateTransferRequest(ImmediateTransferRequest request);

    Optional<ImmediateTransferRequest> findById(@Param("id") Long id);

    List<ImmediateTransferRequest> findAll();

    void updateImmediateTransferRequest(ImmediateTransferRequest request);

    void deleteById(@Param("id") Long id);

    // 사용자별 즉시 이체 요청 조회
    List<ImmediateTransferRequest> findByUserCi(@Param("userCi") String userCi);

    // 상태별 즉시 이체 요청 조회
    List<ImmediateTransferRequest> findByStatus(@Param("status") String status);

    // 요청 유형별 조회
    List<ImmediateTransferRequest> findByRequestType(@Param("requestType") String requestType);

    // 관련 ID별 조회
    List<ImmediateTransferRequest> findByRelatedId(@Param("relatedId") Long relatedId);

    // 상태 업데이트
    void updateStatus(@Param("id") Long id, @Param("status") String status);

    // 성공 처리 업데이트
    void updateAsSuccess(@Param("id") Long id, @Param("transactionId") String transactionId);

    // 실패 처리 업데이트
    void updateAsFailed(@Param("id") Long id, @Param("failureReason") String failureReason);

    // 사용자별 상태별 조회
    List<ImmediateTransferRequest> findByUserCiAndStatus(@Param("userCi") String userCi, @Param("status") String status);

    // 사용자별 요청 유형별 조회
    List<ImmediateTransferRequest> findByUserCiAndRequestType(@Param("userCi") String userCi, @Param("requestType") String requestType);

    // 개수 조회
    int countByUserCi(@Param("userCi") String userCi);

    int countByStatus(@Param("status") String status);

    int countByRequestType(@Param("requestType") String requestType);
}