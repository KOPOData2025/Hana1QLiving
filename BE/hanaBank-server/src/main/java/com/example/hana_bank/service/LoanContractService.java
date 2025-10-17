package com.example.hana_bank.service;

import com.example.hana_bank.dto.LoanContractDto;
import com.example.hana_bank.dto.SimpleLoanContractDto;
import com.example.hana_bank.dto.AppointmentSlotDto;
import com.example.hana_bank.entity.LoanContract;
import com.example.hana_bank.mapper.LoanContractMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.ArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoanContractService {
    
    private final LoanContractMapper loanContractMapper;
    
    /**
     * 하나원큐리빙에서 전송된 간단한 계약 정보 처리 (새로운 방식)
     */
    public String processSimpleContract(SimpleLoanContractDto contractDto) {
        try {
            String contractNumber = generateHanaBankContractNumber();
            LoanContract contract = convertSimpleToLoanContract(contractDto, contractNumber);
            loanContractMapper.insertLoanContract(contract);
            return contractNumber;
        } catch (Exception e) {
            log.error("계약 정보 처리 실패: {}", e.getMessage());
            throw new RuntimeException("계약 정보 처리에 실패했습니다.", e);
        }
    }

    public String processPendingContract(LoanContractDto contractDto) {
        try {
            String contractNumber = generateHanaBankContractNumber();
            LoanContract contract = convertToLoanContract(contractDto, contractNumber);
            loanContractMapper.insertLoanContract(contract);
            return contractNumber;
        } catch (Exception e) {
            log.error("계약 정보 처리 실패: {}", e.getMessage());
            throw new RuntimeException("계약 정보 처리에 실패했습니다.", e);
        }
    }
    
    /**
     * 예약 가능한 시간 슬롯 조회
     */
    public List<AppointmentSlotDto> getAvailableSlots(String date) {
        List<AppointmentSlotDto> slots = new ArrayList<>();
        
        // 오전 시간대
        slots.add(new AppointmentSlotDto(date, "09:00", true, "001", "강남점"));
        slots.add(new AppointmentSlotDto(date, "10:00", true, "001", "강남점"));
        slots.add(new AppointmentSlotDto(date, "11:00", false, "001", "강남점"));
        
        // 오후 시간대
        slots.add(new AppointmentSlotDto(date, "14:00", true, "001", "강남점"));
        slots.add(new AppointmentSlotDto(date, "15:00", true, "001", "강남점"));
        slots.add(new AppointmentSlotDto(date, "16:00", true, "001", "강남점"));
        slots.add(new AppointmentSlotDto(date, "17:00", false, "001", "강남점"));
        
        return slots;
    }
    
    /**
     * 모든 대출 계약 조회
     */
    public List<LoanContract> getAllContracts() {
        return loanContractMapper.findAllLoanContracts();
    }
    
    /**
     * 계약 상태 업데이트
     */
    public void updateContractStatus(Long contractId, String status) {
        loanContractMapper.updateContractStatus(contractId, status);
    }
    
    /**
     * 하나은행 계약번호 생성
     */
    private String generateHanaBankContractNumber() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        return "HNB" + timestamp;
    }
    
    /**
     * 간단한 DTO를 엔티티로 변환 (새로운 방식)
     */
    private LoanContract convertSimpleToLoanContract(SimpleLoanContractDto dto, String contractNumber) {
        LoanContract contract = new LoanContract();

        // 계약 정보
        contract.setContractNumber(contractNumber);

        // 하나원큐리빙 참조 ID 설정 (null 방지)
        contract.setApplicationReferenceId(
            dto.getApplicationId() != null ? dto.getApplicationId() : "UNKNOWN_" + System.currentTimeMillis()
        );

        // 대출 정보
        contract.setLoanAmount(dto.getLoanAmount());
        contract.setLoanPurpose(
            dto.getLoanPurpose() != null ? dto.getLoanPurpose() : "전월세대출"
        );

        // 예약 정보
        contract.setScheduledDate(
            dto.getDesiredContractDate() != null ? dto.getDesiredContractDate() :
            LocalDateTime.now().plusDays(1).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
        );

        // 상태
        contract.setStatus("SCHEDULED");

        // 시간 정보
        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        contract.setCreatedAt(now);
        contract.setUpdatedAt(now);

        return contract;
    }

    /**
     * DTO를 엔티티로 변환 (기존 방식)
     */
    private LoanContract convertToLoanContract(LoanContractDto dto, String contractNumber) {
        LoanContract contract = new LoanContract();

        // 계약 정보 (최종 정리)
        contract.setContractNumber(contractNumber);

        // 하나원큐리빙 참조 ID 설정 (NOT NULL 제약조건 준수)
        String applicationReferenceId = null;

        if (dto.getApplicationId() != null && !dto.getApplicationId().trim().isEmpty()) {
            applicationReferenceId = dto.getApplicationId();
        } else if (dto.getLoanId() != null) {
            applicationReferenceId = dto.getLoanId().toString();
        } else if (dto.getContractNumber() != null && !dto.getContractNumber().trim().isEmpty()) {
            applicationReferenceId = dto.getContractNumber();
        } else {
            applicationReferenceId = "REF_" + System.currentTimeMillis();
        }

        contract.setApplicationReferenceId(applicationReferenceId);

        // 대출 정보 (필수만)
        contract.setLoanAmount(dto.getLoanAmount());
        contract.setLoanPurpose(dto.getLoanPurpose() != null ? dto.getLoanPurpose() : "전월세대출");

        // 예약 정보 (날짜만)
        contract.setScheduledDate(dto.getDesiredContractDate());

        // 상태
        contract.setStatus("SCHEDULED");

        // 시간 정보
        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        contract.setCreatedAt(now);
        contract.setUpdatedAt(now);

        return contract;
    }
}