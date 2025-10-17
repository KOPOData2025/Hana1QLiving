package com.example.hana_bank.mapper;

import com.example.hana_bank.entity.AutoTransferContract;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Mapper
public interface AutoTransferContractMapper {
    
    // 기본 CRUD 메서드
    void insertAutoTransferContract(AutoTransferContract contract);
    
    Optional<AutoTransferContract> findById(@Param("id") Long id);
    
    List<AutoTransferContract> findAll();
    
    void updateAutoTransferContract(AutoTransferContract contract);
    
    void deleteById(@Param("id") Long id);
    
    // 사용자별 자동이체 계약 조회
    List<AutoTransferContract> findByUserCi(@Param("userCi") String userCi);
    
    // 출금계좌별 자동이체 계약 조회
    List<AutoTransferContract> findByFromAccount(@Param("fromAccount") String fromAccount);
    
    // 상태별 자동이체 계약 조회
    List<AutoTransferContract> findByStatus(@Param("status") String status);
    
    // 활성 상태의 자동이체 계약 조회
    List<AutoTransferContract> findActiveContracts();
    
    // 특정 이체일에 실행할 자동이체 계약 조회 (스케줄러에서 사용)
    List<AutoTransferContract> findContractsToExecute(@Param("transferDay") Integer transferDay);
    
    // 특정 날짜에 실행할 자동이체 계약 조회 (다음 이체일 기준)
    List<AutoTransferContract> findContractsToExecuteByDate(@Param("targetDate") LocalDate targetDate);
    
    // 사용자별 활성 자동이체 계약 조회
    List<AutoTransferContract> findActiveContractsByUserCi(@Param("userCi") String userCi);
    
    // 자동이체 계약 상태 업데이트
    void updateStatus(@Param("id") Long id, @Param("status") String status);
    
    // 다음 이체일 업데이트
    void updateNextTransferDate(@Param("id") Long id, @Param("nextTransferDate") LocalDate nextTransferDate);
    
    // 자동이체 계약 존재 여부 확인
    boolean existsById(@Param("id") Long id);
    
    // 사용자의 특정 계좌에 대한 활성 자동이체 존재 여부 확인
    boolean existsActiveContractByUserCiAndAccount(@Param("userCi") String userCi, @Param("fromAccount") String fromAccount);
    
    // 자동이체 계약 개수 조회
    int countByUserCi(@Param("userCi") String userCi);
    
    // 상태별 자동이체 계약 개수 조회
    int countByStatus(@Param("status") String status);
    
    // 사용자별 상태별 자동이체 계약 조회
    List<AutoTransferContract> findByUserCiAndStatus(@Param("userCi") String userCi, @Param("status") String status);
}