package com.living.hana.mapper;

import com.living.hana.dto.ContractDetailResponse;
import com.living.hana.entity.Contract;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ContractMapper {
    
    List<Contract> findAll();
    
    Contract findById(Long id);
    
    List<Contract> findByUserId(Long userId);
    
    List<Contract> findByUnitId(Long unitId);

    Contract findActiveContractByUnitId(Long unitId);

    List<Contract> findByStatus(String status);

    List<Contract> findByUserIdAndStatus(@Param("userId") Long userId, @Param("status") String status);

    int insert(Contract contract);
    
    int update(Contract contract);
    
    int deleteById(Long id);

    // 계약 상세 정보 조회
    ContractDetailResponse findContractDetailById(Long id);
    
    // 사용자별 계약 상세 정보 조회
    List<ContractDetailResponse> findContractDetailsByUserId(Long userId);
    
    // 호실별 계약 상세 정보 조회
    List<ContractDetailResponse> findContractDetailsByUnitId(Long unitId);
    
    // 상태별 계약 상세 정보 조회
    List<ContractDetailResponse> findContractDetailsByStatus(String status);

    // 월세 자동이체용 - 활성 계약 조회 (매월 결제일 확인용)
    List<Contract> findActiveContractsForRentPayment();

    // 특정 결제일에 해당하는 계약 조회
    List<Contract> findContractsByPaymentDate(@Param("paymentDay") int paymentDay);

    // 계약의 월세 정보 조회
    Contract findContractWithRentInfo(Long contractId);
}
