package com.living.hana.service;

import com.living.hana.annotation.Logging;
import com.living.hana.dto.ContractDetailResponse;
import com.living.hana.entity.Contract;
import com.living.hana.entity.Unit;
import com.living.hana.entity.User;
import com.living.hana.entity.Reservation;
import com.living.hana.mapper.ContractMapper;
import com.living.hana.mapper.UnitMapper;
import com.living.hana.mapper.UserMapper;
import com.living.hana.mapper.ReservationMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContractService {

    private final ContractMapper contractMapper;
    private final UnitMapper unitMapper;
    private final UserMapper userMapper;
    private final ReservationMapper reservationMapper;

    public List<Contract> findAll() {
        return contractMapper.findAll();
    }

    public Contract findById(Long id) {
        return contractMapper.findById(id);
    }

    public List<Contract> findByUserId(Long userId) {
        return contractMapper.findByUserId(userId);
    }

    public List<Contract> findByUnitId(Long unitId) {
        return contractMapper.findByUnitId(unitId);
    }

    public List<Contract> findByStatus(String status) {
        return contractMapper.findByStatus(status);
    }

    @Logging(operation = "계약 생성", category = "CONTRACT", maskSensitive = true)
    public Contract createContract(Contract contract) {
        log.info("[CONTRACT] 계약 생성 시작: userId={}, unitId={}", contract.getUserId(), contract.getUnitId());

        contract.setStatus("ACTIVE");
        
        // 계약번호 자동 생성 (CTR-YYYY-MM-DD-XXX 형식)
        if (contract.getContractNumber() == null || contract.getContractNumber().trim().isEmpty()) {
            String contractNumber = generateContractNumber();
            contract.setContractNumber(contractNumber);
        }
        
        // 입주일 기준으로 납부일 자동 설정
        if (contract.getPaymentDay() == null && contract.getMoveInDate() != null) {
            Integer paymentDay = calculatePaymentDay(contract.getMoveInDate());
            contract.setPaymentDay(paymentDay);
        }
        
        contractMapper.insert(contract);
        
        // 단위 상태를 OCCUPIED로 변경
        Unit unit = unitMapper.findById(contract.getUnitId());
        if (unit != null) {
            unit.setStatus("OCCUPIED");
            unitMapper.update(unit);
        }
        
        Unit unitForAddress = unitMapper.findById(contract.getUnitId());
        if (unitForAddress != null) {
            String currentAddress = "호실 " + unitForAddress.getUnitNumber();
            
            User user = userMapper.findById(contract.getUserId());
            if (user != null) {
                user.setCurrentAddress(currentAddress);
                userMapper.update(user);
            }
        }
        
        // 해당 호실의 예약 상태를 CONFIRMED로 변경
        List<Reservation> reservations = reservationMapper.findByUnitId(contract.getUnitId());
        for (Reservation reservation : reservations) {
            if ("PENDING".equals(reservation.getStatus())) {
                reservationMapper.updateStatus(reservation.getId(), "CONFIRMED");
            }
        }

        log.info("[CONTRACT] 계약 생성 완료: contractId={}, contractNumber={}", contract.getId(), contract.getContractNumber());
        return contract;
    }

    /**
     * 계약번호 자동 생성
     * 형식: CTR-YYYY-MM-DD-XXX (XXX는 일련번호)
     */
    private String generateContractNumber() {
        String currentDate = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        
        // 오늘 날짜의 계약 수를 조회하여 일련번호 생성
        List<Contract> todayContracts = contractMapper.findByStatus("ACTIVE");
        int sequence = 1;
        
        for (Contract contract : todayContracts) {
            if (contract.getCreatedAt() != null && contract.getCreatedAt().startsWith(currentDate)) {
                sequence++;
            }
        }
        
        return String.format("CTR-%s-%03d", currentDate, sequence);
    }
    
    /**
     * 입주일 기준으로 납부일 계산
     * 입주일의 일자를 납부일로 설정 (월말일 처리 포함)
     */
    private Integer calculatePaymentDay(String moveInDate) {
        try {
            LocalDate moveInLocalDate = LocalDate.parse(moveInDate);
            int dayOfMonth = moveInLocalDate.getDayOfMonth();
            
            // 29, 30, 31일인 경우 월말일로 설정
            if (dayOfMonth >= 29) {
                return 31; // 31일로 설정하면 매월 말일로 처리
            }
            
            return dayOfMonth;
        } catch (Exception e) {
            log.error("Error calculating payment day from moveInDate: {}", moveInDate, e);
            return 1; // 기본값: 매월 1일
        }
    }

    @Logging(operation = "계약 수정", category = "CONTRACT", maskSensitive = true)
    public Contract updateContract(Contract contract) {
        contractMapper.update(contract);
        return contract;
    }

    public void deleteContract(Long id) {
        contractMapper.deleteById(id);
    }

    // 계약 상세 정보 조회
    public ContractDetailResponse findContractDetailById(Long id) {
        return contractMapper.findContractDetailById(id);
    }

    // 사용자별 계약 상세 정보 조회
    public List<ContractDetailResponse> findContractDetailsByUserId(Long userId) {
        return contractMapper.findContractDetailsByUserId(userId);
    }

    // 호실별 계약 상세 정보 조회
    public List<ContractDetailResponse> findContractDetailsByUnitId(Long unitId) {
        return contractMapper.findContractDetailsByUnitId(unitId);
    }

    // 상태별 계약 상세 정보 조회
    public List<ContractDetailResponse> findContractDetailsByStatus(String status) {
        return contractMapper.findContractDetailsByStatus(status);
    }

    // 월세 자동이체용 - 활성 계약 조회
    public List<Contract> getActiveContractsForRentPayment() {
        List<Contract> contracts = contractMapper.findActiveContractsForRentPayment();
        log.info("월세 자동이체 대상 계약 수: {}", contracts.size());
        return contracts;
    }

    // 특정 결제일에 해당하는 계약 조회
    public List<Contract> getContractsByPaymentDate(int paymentDay) {
        List<Contract> contracts = contractMapper.findContractsByPaymentDate(paymentDay);
        log.info("결제일 {}에 해당하는 계약 수: {}", paymentDay, contracts.size());
        return contracts;
    }

    // 계약의 월세 정보 조회
    public Contract getContractWithRentInfo(Long contractId) {
        Contract contract = contractMapper.findContractWithRentInfo(contractId);
        if (contract != null) {
            log.info("계약 월세 정보 조회 완료: contractId={}, monthlyRent={}, paymentDay={}",
                    contractId, contract.getMonthlyRent(), contract.getPaymentDay());
        } else {
            log.warn("계약을 찾을 수 없거나 활성 상태가 아님: contractId={}", contractId);
        }
        return contract;
    }
}
