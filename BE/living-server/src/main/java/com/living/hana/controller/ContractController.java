package com.living.hana.controller;

import com.living.hana.dto.ApiResponse;
import com.living.hana.dto.ContractDetailResponse;
import com.living.hana.entity.Contract;
import com.living.hana.entity.User;
import com.living.hana.service.ContractService;
import com.living.hana.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/contracts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ContractController {

    private final ContractService contractService;
    private final UserService userService;

    /**
     * 모든 계약 목록 조회
     * GET /api/contracts
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Contract>>> getAllContracts() {
        List<Contract> contracts = contractService.findAll();
        return ResponseEntity.ok(ApiResponse.successWithMessage(contracts, "계약 목록을 성공적으로 조회했습니다."));
    }

    /**
     * 계약 상세 정보 조회 (ID로)
     * GET /api/contracts/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ContractDetailResponse>> getContractDetailById(@PathVariable Long id) {
        ContractDetailResponse contractDetail = contractService.findContractDetailById(id);
        if (contractDetail != null) {
            return ResponseEntity.ok(ApiResponse.successWithMessage(contractDetail, "계약 상세 정보를 성공적으로 조회했습니다."));
        }
        return ResponseEntity.ok(ApiResponse.error("계약을 찾을 수 없습니다."));
    }

    /**
     * 사용자별 계약 목록 조회
     * GET /api/contracts/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<ContractDetailResponse>>> getContractsByUserId(@PathVariable Long userId) {
        List<ContractDetailResponse> contracts = contractService.findContractDetailsByUserId(userId);
        return ResponseEntity.ok(ApiResponse.successWithMessage(contracts, "사용자 계약 목록을 성공적으로 조회했습니다."));
    }

    /**
     * 호실별 계약 목록 조회
     * GET /api/contracts/unit/{unitId}
     */
    @GetMapping("/unit/{unitId}")
    public ResponseEntity<ApiResponse<List<ContractDetailResponse>>> getContractsByUnitId(@PathVariable Long unitId) {
        List<ContractDetailResponse> contracts = contractService.findContractDetailsByUnitId(unitId);
        return ResponseEntity.ok(ApiResponse.successWithMessage(contracts, "호실 계약 목록을 성공적으로 조회했습니다."));
    }

    /**
     * 상태별 계약 목록 조회
     * GET /api/contracts/status/{status}
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<ApiResponse<List<ContractDetailResponse>>> getContractsByStatus(@PathVariable String status) {
        List<ContractDetailResponse> contracts = contractService.findContractDetailsByStatus(status);
        return ResponseEntity.ok(ApiResponse.successWithMessage(contracts, status + " 상태의 계약 목록을 성공적으로 조회했습니다."));
    }

    /**
     * 계약 생성
     * POST /api/contracts
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Contract>> createContract(
            @RequestBody Contract contract,
            @RequestParam(required = false) String currentAddress) {
        log.info("[CONTRACT] 계약 생성 요청: userId={}, unitId={}", contract.getUserId(), contract.getUnitId());

        Contract createdContract = contractService.createContract(contract);
        
        // 사용자의 currentAddress 업데이트
        if (currentAddress != null && !currentAddress.trim().isEmpty()) {
            User user = userService.findById(contract.getUserId());
            if (user != null) {
                user.setCurrentAddress(currentAddress);
                userService.updateUser(user);
            }
        }
        
        log.info("[CONTRACT] 계약 생성 완료: contractId={}", createdContract.getId());
        return ResponseEntity.ok(ApiResponse.successWithMessage(createdContract, "계약이 성공적으로 생성되었습니다."));
    }

    /**
     * 계약 수정
     * PUT /api/contracts/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Contract>> updateContract(@PathVariable Long id, @RequestBody Contract contract) {
        contract.setId(id);
        Contract updatedContract = contractService.updateContract(contract);
        return ResponseEntity.ok(ApiResponse.successWithMessage(updatedContract, "계약이 성공적으로 수정되었습니다."));
    }

    /**
     * 계약 삭제
     * DELETE /api/contracts/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteContract(@PathVariable Long id) {
        contractService.deleteContract(id);
        return ResponseEntity.ok(ApiResponse.successWithMessage(null, "계약이 성공적으로 삭제되었습니다."));
    }

    /**
     * 계약 상태 변경
     * PATCH /api/contracts/{id}/status
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Contract>> updateContractStatus(
            @PathVariable Long id, 
            @RequestParam String status) {
        Contract contract = contractService.findById(id);
        if (contract != null) {
            contract.setStatus(status);
            Contract updatedContract = contractService.updateContract(contract);
            return ResponseEntity.ok(ApiResponse.successWithMessage(updatedContract, "계약 상태가 성공적으로 변경되었습니다."));
        }
        return ResponseEntity.ok(ApiResponse.error("계약을 찾을 수 없습니다."));
    }

    /**
     * 계약 통계 조회
     * GET /api/contracts/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Object>> getContractStats() {
        try {
            List<Contract> allContracts = contractService.findAll();
            
            // 상태별 계약 수 집계
            long totalContracts = allContracts.size();
            long activeContracts = allContracts.stream().filter(c -> "ACTIVE".equals(c.getStatus())).count();
            long pendingContracts = allContracts.stream().filter(c -> "PENDING".equals(c.getStatus())).count();
            long expiredContracts = allContracts.stream().filter(c -> "EXPIRED".equals(c.getStatus())).count();
            long terminatedContracts = allContracts.stream().filter(c -> "TERMINATED".equals(c.getStatus())).count();
            
            // 통계 데이터 구성
            Object stats = new Object() {
                public final long total = totalContracts;
                public final long active = activeContracts;
                public final long pending = pendingContracts;
                public final long expired = expiredContracts;
                public final long terminated = terminatedContracts;
            };
            
            return ResponseEntity.ok(ApiResponse.successWithMessage(stats, "계약 통계를 성공적으로 조회했습니다."));
            
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("계약 통계 조회에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 월세 자동이체용 - 활성 계약 조회
     * GET /api/contracts/active-for-rent
     */
    @GetMapping("/active-for-rent")
    public ResponseEntity<ApiResponse<List<Contract>>> getActiveContractsForRent() {
        try {
            List<Contract> contracts = contractService.getActiveContractsForRentPayment();
            return ResponseEntity.ok(ApiResponse.successWithMessage(contracts, "월세 자동이체 대상 계약을 성공적으로 조회했습니다."));
        } catch (Exception e) {
            log.error("활성 계약 조회 실패: {}", e.getMessage());
            return ResponseEntity.ok(ApiResponse.error("활성 계약 조회에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 특정 결제일에 해당하는 계약 조회 (Cloud Function용)
     * GET /api/contracts/payment-date/{paymentDay}
     */
    @GetMapping("/payment-date/{paymentDay}")
    public ResponseEntity<List<Contract>> getContractsByPaymentDate(@PathVariable int paymentDay) {
        log.info("결제일별 계약 조회: paymentDay={}", paymentDay);

        try {
            if (paymentDay < 1 || paymentDay > 31) {
                log.error("유효하지 않은 결제일: {}", paymentDay);
                return ResponseEntity.badRequest().build();
            }

            List<Contract> contracts = contractService.getContractsByPaymentDate(paymentDay);
            log.info("결제일별 계약 조회 완료: paymentDay={}, 건수={}", paymentDay, contracts.size());

            return ResponseEntity.ok(contracts);
        } catch (Exception e) {
            log.error("결제일별 계약 조회 실패: paymentDay={}, error={}", paymentDay, e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }

}
