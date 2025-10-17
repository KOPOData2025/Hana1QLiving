package com.living.hana.service;

import com.living.hana.entity.AutoBillingContract;
import com.living.hana.entity.MonthlyBilling;
import com.living.hana.entity.Contract;
import com.living.hana.entity.User;
import com.living.hana.entity.LinkedBankAccount;
import com.living.hana.dto.BillingDetailsResponse;
import com.living.hana.mapper.AutoBillingContractMapper;
import com.living.hana.mapper.MonthlyBillingMapper;
import com.living.hana.mapper.ContractMapper;
import com.living.hana.mapper.UserMapper;
import com.living.hana.mapper.LinkedBankAccountMapper;
import com.living.hana.client.HanaBankClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AutoBillingService {

    private final AutoBillingContractMapper autoBillingContractMapper;
    private final MonthlyBillingMapper monthlyBillingMapper;
    private final ContractMapper contractMapper;
    private final UserMapper userMapper;
    private final LinkedBankAccountMapper linkedBankAccountMapper;
    private final HanaBankClient hanaBankClient;

    /**
     * 자동납부 설정
     */
    public boolean setupAutoBilling(Long userId, Long contractId, String fromAccount, Integer billingDay) {
        try {
            log.info("자동납부 설정 시작: 사용자ID={}, 계약ID={}", userId, contractId);
            
            // 1. 기존 자동납부 계약 확인
            if (autoBillingContractMapper.existsByUserId(userId)) {
                throw new RuntimeException("이미 자동납부가 설정되어 있습니다.");
            }
            
            // 2. 사용자 조회
            User user = userMapper.findById(userId);
            if (user == null) {
                throw new RuntimeException("사용자를 찾을 수 없습니다.");
            }
            
            // 3. 계약 조회
            Contract contract = contractMapper.findById(contractId);
            if (contract == null) {
                throw new RuntimeException("계약을 찾을 수 없습니다.");
            }
            
            if (!contract.getUserId().equals(userId)) {
                throw new RuntimeException("계약에 대한 권한이 없습니다.");
            }
            
            // 4. 연결된 은행계좌 조회
            LinkedBankAccount linkedAccount = linkedBankAccountMapper.findAccountByUserIdAndAccountNumber(userId, fromAccount);
            if (linkedAccount == null) {
                throw new RuntimeException("연결된 은행계좌를 찾을 수 없습니다.");
            }
            
            // 5. 하나은행에 CMS 계약 등록
            // 실제로는 하나은행 CMS API를 호출하여 자동납부 계약을 등록
            Long hanaContractId = System.currentTimeMillis();
            
            // 6. 자동납부 계약 저장
            AutoBillingContract autoBillingContract = AutoBillingContract.builder()
                    .userId(userId)
                    .contractId(contractId)
                    .fromAccount(fromAccount)
                    .accountName(linkedAccount.getAccountName())
                    .billingDay(billingDay)
                    .status("ACTIVE")
                    .hanaContractId(hanaContractId)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            
            autoBillingContractMapper.insertAutoBillingContract(autoBillingContract);
            
            log.info("자동납부 설정 완료: 사용자ID={}, 하나은행계약ID={}", userId, hanaContractId);
            
            return true;
            
        } catch (Exception e) {
            log.error("자동납부 설정 실패: 사용자ID={}, 계약ID={}, 오류={}", userId, contractId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 자동납부 해지
     */
    public boolean cancelAutoBilling(Long userId) {
        try {
            log.info("자동납부 해지 시작: 사용자ID={}", userId);
            
            AutoBillingContract contract = autoBillingContractMapper.findByUserId(userId);
            if (contract == null) {
                throw new RuntimeException("설정된 자동납부를 찾을 수 없습니다.");
            }
            
            // 하나은행 CMS 계약 해지 (Mock)
            // 실제로는 하나은행 CMS API를 호출하여 자동납부 계약을 해지
            
            // 계약 상태를 취소로 변경
            contract.setStatus("CANCELLED");
            contract.setUpdatedAt(LocalDateTime.now());
            autoBillingContractMapper.updateAutoBillingContract(contract);
            
            log.info("자동납부 해지 완료: 사용자ID={}", userId);
            
            return true;
            
        } catch (Exception e) {
            log.error("자동납부 해지 실패: 사용자ID={}, 오류={}", userId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 자동납부 일시정지
     */
    public boolean suspendAutoBilling(Long userId) {
        try {
            log.info("자동납부 일시정지 시작: 사용자ID={}", userId);
            
            AutoBillingContract contract = autoBillingContractMapper.findByUserId(userId);
            if (contract == null) {
                throw new RuntimeException("설정된 자동납부를 찾을 수 없습니다.");
            }
            
            contract.setStatus("SUSPENDED");
            contract.setUpdatedAt(LocalDateTime.now());
            autoBillingContractMapper.updateAutoBillingContract(contract);
            
            log.info("자동납부 일시정지 완료: 사용자ID={}", userId);
            
            return true;
            
        } catch (Exception e) {
            log.error("자동납부 일시정지 실패: 사용자ID={}, 오류={}", userId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 자동납부 재개
     */
    public boolean resumeAutoBilling(Long userId) {
        try {
            log.info("자동납부 재개 시작: 사용자ID={}", userId);
            
            AutoBillingContract contract = autoBillingContractMapper.findByUserId(userId);
            if (contract == null) {
                throw new RuntimeException("설정된 자동납부를 찾을 수 없습니다.");
            }
            
            contract.setStatus("ACTIVE");
            contract.setUpdatedAt(LocalDateTime.now());
            autoBillingContractMapper.updateAutoBillingContract(contract);
            
            log.info("자동납부 재개 완료: 사용자ID={}", userId);
            
            return true;
            
        } catch (Exception e) {
            log.error("자동납부 재개 실패: 사용자ID={}, 오류={}", userId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 자동납부 계약 정보 조회
     */
    @Transactional(readOnly = true)
    public AutoBillingContract getAutoBillingContract(Long userId) {
        try {
            return autoBillingContractMapper.findByUserId(userId);
        } catch (Exception e) {
            log.error("자동납부 계약 조회 실패: 사용자ID={}, 오류={}", userId, e.getMessage(), e);
            return null;
        }
    }

    /**
     * 자동납부 설정 여부 확인
     */
    @Transactional(readOnly = true)
    public boolean hasAutoBilling(Long userId) {
        try {
            return autoBillingContractMapper.existsByUserId(userId);
        } catch (Exception e) {
            log.error("자동납부 설정 여부 확인 실패: 사용자ID={}, 오류={}", userId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 사용자별 청구서 목록 조회
     */
    @Transactional(readOnly = true)
    public List<BillingDetailsResponse> getUserBillings(Long userId) {
        try {
            List<MonthlyBilling> billings = monthlyBillingMapper.findByUserId(userId);
            return billings.stream()
                    .map(this::convertToBillingDetailsResponse)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("사용자 청구서 조회 실패: 사용자ID={}, 오류={}", userId, e.getMessage(), e);
            return List.of();
        }
    }

    /**
     * 전체 청구서 목록 조회 (관리자용)
     */
    @Transactional(readOnly = true)
    public List<BillingDetailsResponse> getAllBillings() {
        try {
            List<MonthlyBilling> billings = monthlyBillingMapper.findAll();
            return billings.stream()
                    .map(this::convertToBillingDetailsResponse)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("전체 청구서 조회 실패: 오류={}", e.getMessage(), e);
            return List.of();
        }
    }

    /**
     * 청구서 상세 조회
     */
    @Transactional(readOnly = true)
    public BillingDetailsResponse getBillingDetails(Long billingId) {
        try {
            MonthlyBilling billing = monthlyBillingMapper.findById(billingId);
            if (billing == null) {
                return null;
            }
            return convertToBillingDetailsResponse(billing);
        } catch (Exception e) {
            log.error("청구서 상세 조회 실패: ID={}, 오류={}", billingId, e.getMessage(), e);
            return null;
        }
    }


    private BillingDetailsResponse convertToBillingDetailsResponse(MonthlyBilling billing) {
        return BillingDetailsResponse.builder()
                .id(billing.getId())
                .billingMonth(billing.getBillingMonth())
                .buildingName(billing.getBuildingName())
                .unitNumber(billing.getUnitNumber())
                .managementFee(billing.getManagementFee())
                .waterFee(billing.getWaterFee())
                .electricityFee(billing.getElectricityFee())
                .gasFee(billing.getGasFee())
                .cleaningFee(billing.getCleaningFee())
                .securityFee(billing.getSecurityFee())
                .parkingFee(billing.getParkingFee())
                .otherFee(billing.getOtherFee())
                .totalAmount(billing.getTotalAmount())
                .dueDate(billing.getDueDate())
                .status(billing.getStatus())
                .paidAt(billing.getPaidAt())
                .transactionId(billing.getTransactionId())
                .failureReason(billing.getFailureReason())
                .createdAt(billing.getCreatedAt())
                .build();
    }
}