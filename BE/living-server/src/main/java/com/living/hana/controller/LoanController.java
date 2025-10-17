package com.living.hana.controller;

import com.living.hana.dto.LoanInquiryRequest;
import com.living.hana.dto.LoanInquiryResponse;
import com.living.hana.dto.LoanApplicationResponse;
import com.living.hana.dto.LoanStatusResponse;
import com.living.hana.dto.LoanContractRequest;
import com.living.hana.dto.LoanContractResponse;
import com.living.hana.dto.LoanAmountSettingRequest;
import com.living.hana.dto.LoanAmountSettingResponse;
import com.living.hana.dto.LoanPaymentRequest;
import com.living.hana.dto.LoanPaymentResponse;
import com.living.hana.config.LoanProperties;
import com.living.hana.entity.Loan;
import com.living.hana.service.LoanService;
import com.living.hana.service.SmsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

@Slf4j
@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LoanController {

    private final LoanService loanService;
    private final LoanProperties loanProperties;
    private final RestTemplate restTemplate;
    private final SmsService smsService;
    
    @Value("${hanabank.api.base-url}")
    private String hanabankApiUrl;

    @PostMapping("/api/loans/inquiry")
    public ResponseEntity<LoanInquiryResponse> inquireLoan(@RequestBody LoanInquiryRequest request) {
        LoanInquiryResponse response = loanService.inquireLoan(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/loan/application")
    public ResponseEntity<LoanApplicationResponse> applyLoan(@RequestParam String address,
                                                           @RequestParam String selectedLoanProduct,
                                                           @RequestParam("documents[leaseContract]") MultipartFile leaseContract,
                                                           @RequestParam("documents[residentCopy]") MultipartFile residentCopy,
                                                           @RequestParam("documents[incomeProof]") MultipartFile incomeProof,
                                                           @RequestParam("documents[bankbook]") MultipartFile bankbook) {
        LoanApplicationResponse response = loanService.applyLoan(address, selectedLoanProduct, leaseContract, residentCopy, incomeProof, bankbook);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/loan/status")
    public ResponseEntity<LoanStatusResponse> getLoanStatus() {
        LoanStatusResponse response = loanService.getLoanStatus();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/loans")
    public ResponseEntity<List<Loan>> getAllLoans() {
        List<Loan> loans = loanService.findAll();
        return ResponseEntity.ok(loans);
    }

    @GetMapping("/api/loans/{id}")
    public ResponseEntity<Loan> getLoanById(@PathVariable Long id) {
        Loan loan = loanService.findById(id);
        if (loan != null) {
            return ResponseEntity.ok(loan);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/api/loans/user/{userId}")
    public ResponseEntity<List<Loan>> getLoansByUserId(@PathVariable Long userId) {
        List<Loan> loans = loanService.findByUserId(userId);
        return ResponseEntity.ok(loans);
    }

    @GetMapping("/api/loans/contract/{contractId}")
    public ResponseEntity<List<Loan>> getLoansByContractId(@PathVariable Long contractId) {
        List<Loan> loans = loanService.findByContractId(contractId);
        return ResponseEntity.ok(loans);
    }

    @GetMapping("/api/loans/status/{status}")
    public ResponseEntity<List<Loan>> getLoansByStatus(@PathVariable String status) {
        List<Loan> loans = loanService.findByStatus(status);
        return ResponseEntity.ok(loans);
    }

    @PostMapping("/api/loan/contract")
    public ResponseEntity<LoanContractResponse> createLoanContract(@RequestBody LoanContractRequest request) {
        LoanContractResponse response = loanService.createLoanContract(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/loan/payment/execute")
    public ResponseEntity<LoanPaymentResponse> executeLoanPayment(@RequestBody LoanPaymentRequest request) {
        LoanPaymentResponse response = loanService.executeLoanPayment(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/loans/approval/{applicationId}")
    public ResponseEntity<?> getLoanApproval(@PathVariable String applicationId) {
        try {
            // 하나은행 대출 상황 API를 통해 실시간 데이터 조회
            LoanStatusResponse loanStatusResponse = loanService.getLoanStatus();
            
            if (!loanStatusResponse.isSuccess() || loanStatusResponse.getApplications() == null) {
                log.error("하나은행 대출 상황 조회 실패: {}", loanStatusResponse.getMessage());
                return ResponseEntity.badRequest().body("대출 상황 조회에 실패했습니다.");
            }
            
            // 해당 applicationId의 승인된 대출 찾기 (다양한 상태값 지원)
            LoanStatusResponse.LoanApplication approvedApplication = loanStatusResponse.getApplications()
                .stream()
                .filter(app -> applicationId.equals(app.getId()) && 
                    ("승인완료".equals(app.getStatus()) || "APPROVED".equals(app.getStatus()) || 
                     "DECISION".equals(app.getStatus()) || "심사완료".equals(app.getStatus())))
                .findFirst()
                .orElse(null);
            
            if (approvedApplication == null) {
                log.error("승인된 대출 정보를 찾을 수 없습니다. applicationId: {}", applicationId);
                return ResponseEntity.badRequest().body("승인된 대출 정보를 찾을 수 없습니다.");
            }
            
            log.info("승인된 대출 발견: ID={}, Status={}, Amount={}", 
                approvedApplication.getId(), approvedApplication.getStatus(), approvedApplication.getMaxAmount());
            
            // 하나은행 관리자가 승인한 실제 데이터 조회
            Map<String, Object> approvalDetails = loanService.getApprovalDetails(applicationId);
            
            // 승인 정보 응답 생성 (실제 관리자 승인 데이터 사용)
            Map<String, Object> approvalData = new HashMap<>();
            approvalData.put("approvedLimit", approvalDetails.get("approvedAmount")); // 실제 승인 금액
            approvalData.put("approvedRate", approvalDetails.get("interestRate")); // 실제 승인 금리
            approvalData.put("approvedTerm", approvalDetails.get("loanTerm")); // 실제 승인 기간
            approvalData.put("applicationId", applicationId);
            approvalData.put("status", approvedApplication.getStatus());
            
            log.info("최종 승인 정보 응답: {}", approvalData);
            return ResponseEntity.ok(approvalData);
            
        } catch (Exception e) {
            log.error("=== 승인 정보 조회 중 오류 발생 ===");
            log.error("applicationId: {}", applicationId);
            log.error("에러 메시지: {}", e.getMessage());
            log.error("스택트레이스:", e);
            return ResponseEntity.status(500).body("승인 정보 조회 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    @PostMapping("/api/loans/contract")
    public ResponseEntity<?> createLoanContract(@RequestBody Map<String, Object> contractData) {
        try {
            log.info("=== 계약서 생성 요청 받음 ===");
            log.info("Contract Data: {}", contractData);

            // 입력 데이터 유효성 검사
            if (contractData == null || contractData.isEmpty()) {
                throw new IllegalArgumentException("계약서 데이터가 비어있습니다.");
            }

            // 프론트엔드에서 보내는 필드명에 맞춰 매핑 (null 체크 포함)
            String applicationId = null;
            if (contractData.get("loanApplicationId") != null) {
                applicationId = contractData.get("loanApplicationId").toString().trim();
            } else if (contractData.get("applicationId") != null) {
                applicationId = contractData.get("applicationId").toString().trim();
            }

            if (applicationId == null || applicationId.isEmpty()) {
                throw new IllegalArgumentException("loanApplicationId 또는 applicationId 필드가 필요합니다.");
            }

            Long requestedAmount = null;
            try {
                if (contractData.get("loanAmount") != null) {
                    requestedAmount = Long.valueOf(contractData.get("loanAmount").toString());
                } else if (contractData.get("requestedAmount") != null) {
                    requestedAmount = Long.valueOf(contractData.get("requestedAmount").toString());
                }

                if (requestedAmount == null || requestedAmount <= 0) {
                    throw new IllegalArgumentException("유효한 대출 금액이 필요합니다.");
                }
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("대출 금액 형식이 올바르지 않습니다.");
            }

            String paymentDate = null;
            if (contractData.get("desiredContractDate") != null) {
                paymentDate = contractData.get("desiredContractDate").toString().trim();
            } else if (contractData.get("paymentDate") != null) {
                paymentDate = contractData.get("paymentDate").toString().trim();
            }

            if (paymentDate == null || paymentDate.isEmpty()) {
                throw new IllegalArgumentException("희망 계약 날짜가 필요합니다.");
            }

            String landlordAccount = null;
            if (contractData.get("landlordAccount") != null) {
                landlordAccount = contractData.get("landlordAccount").toString().trim();
            }

            // 임대인 계좌 처리 - 빈 값이면 기본값 사용
            if (landlordAccount == null || landlordAccount.isEmpty()) {
                if (loanProperties != null && loanProperties.getLandlordAccount() != null) {
                    landlordAccount = loanProperties.getLandlordAccount();
                    log.info("임대인 계좌가 비어있어서 기본값을 사용합니다: {}", landlordAccount);
                } else {
                    throw new IllegalArgumentException("임대인 계좌 정보가 필요합니다.");
                }
            }

            log.info("매핑된 데이터 - applicationId: {}, requestedAmount: {}, paymentDate: {}, landlordAccount: {}",
                applicationId, requestedAmount, paymentDate, landlordAccount);
            
            // 계약서 생성
            String contractNumber = loanService.createLoanContract(applicationId, requestedAmount, paymentDate, landlordAccount);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("contractNumber", contractNumber);
            response.put("message", "대출 계약이 성공적으로 생성되었습니다.");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "계약 생성 중 오류가 발생했습니다: " + e.getMessage());
            errorResponse.put("errorType", e.getClass().getSimpleName());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @GetMapping("/loan/transfer/defaults")
    public ResponseEntity<Map<String, Object>> getLoanTransferDefaults() {
        try {
            Map<String, Object> defaults = new HashMap<>();
            defaults.put("landlordAccount", loanProperties.getLandlordAccount());
            defaults.put("landlordName", "하나원큐리빙 오피스텔"); // 기본 임대인 이름
            defaults.put("transferMemo", "전월세보증금");
            log.info("대출금 송금 기본값 제공: {}", defaults);
            return ResponseEntity.ok(defaults);
        } catch (Exception e) {
            log.error("대출금 송금 기본값 조회 실패: {}", e.getMessage(), e);
            log.error("Exception type: {}", e.getClass().getSimpleName());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/api/loan/payments/history")
    public ResponseEntity<Map<String, Object>> getLoanPaymentHistory() {
        try {
            // 하나은행 API 호출
            String hanabankUrl = hanabankApiUrl + "/api/admin-loan/payments/history";
            
            try {
                ResponseEntity<Map> response = restTemplate.getForEntity(hanabankUrl, Map.class);
                
                if (response.getBody() != null && Boolean.TRUE.equals(response.getBody().get("success"))) {
                    Object dataObject = response.getBody().get("data");
                    List<Map<String, Object>> payments;
                    
                    if (dataObject instanceof List) {
                        payments = (List<Map<String, Object>>) dataObject;
                    } else {
                        payments = new ArrayList<>();
                    }
                    
                    
                    Map<String, Object> result = new HashMap<>();
                    result.put("success", true);
                    result.put("data", payments);
                    result.put("message", "대출 송금 내역 조회 성공");
                    
                    return ResponseEntity.ok(result);
                } else {
                    // 하나은행 API 응답이 실패인 경우 빈 배열 반환
                    log.warn("하나은행 API 응답 실패, 빈 배열 반환");
                    Map<String, Object> result = new HashMap<>();
                    result.put("success", true);
                    result.put("data", new ArrayList<>());
                    result.put("message", "대출 송금 내역이 없습니다");
                    
                    return ResponseEntity.ok(result);
                }
            } catch (Exception apiException) {
                // 하나은행 API 호출 실패 시 빈 배열 반환
                log.warn("하나은행 API 호출 실패, 빈 배열 반환: {}", apiException.getMessage());
                Map<String, Object> result = new HashMap<>();
                result.put("success", true);
                result.put("data", new ArrayList<>());
                result.put("message", "하나은행 서버에 연결할 수 없습니다");
                
                return ResponseEntity.ok(result);
            }
            
        } catch (Exception e) {
            log.error("대출 송금 내역 조회 실패: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "대출 송금 내역 조회에 실패했습니다: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/api/loans/execute")
    public ResponseEntity<?> executeLoanPayment(@RequestBody Map<String, Object> paymentData) {
        try {
            
            String contractNumber = paymentData.get("contractNumber").toString();
            Long paymentAmount = Long.valueOf(paymentData.get("paymentAmount").toString());
            String landlordAccount = paymentData.get("landlordAccount").toString();
            String landlordName = paymentData.getOrDefault("landlordName", "임대인").toString();
            
            log.info("매핑된 데이터 - contractNumber: {}, paymentAmount: {}, landlordAccount: {}, landlordName: {}", 
                contractNumber, paymentAmount, landlordAccount, landlordName);
            
            // 하나은행에 대출 실행 요청
            Map<String, Object> hanabankPaymentRequest = new HashMap<>();
            hanabankPaymentRequest.put("contractNumber", contractNumber);
            hanabankPaymentRequest.put("paymentAmount", paymentAmount);
            hanabankPaymentRequest.put("landlordAccount", landlordAccount);
            hanabankPaymentRequest.put("landlordName", landlordName);
            
            String transactionId = loanService.executeLoanPaymentToHanaBank(hanabankPaymentRequest);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("transactionId", transactionId);
            response.put("message", "대출 실행이 성공적으로 완료되었습니다.");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "대출 실행 중 오류가 발생했습니다: " + e.getMessage());
            errorResponse.put("errorType", e.getClass().getSimpleName());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @GetMapping("/loans/contracts/{contractNumber}")
    public ResponseEntity<?> getLoanContract(@PathVariable String contractNumber) {
        try {
            Map<String, Object> contractInfo = loanService.getLoanContract(contractNumber);
            return ResponseEntity.ok(contractInfo);
        } catch (Exception e) {
            log.error("계약 정보 조회 중 오류: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "계약 정보 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    // applicationId로 조회하는 엔드포인트는 제거됨 - 계약번호로만 조회

    /**
     * SMS 인증번호 발송
     *
     * @param request { phoneNumber: "01012345678" }
     * @return 발송 결과
     */
    @PostMapping("/api/loans/sms/send")
    public ResponseEntity<Map<String, Object>> sendSmsVerificationCode(@RequestBody Map<String, String> request) {
        try {
            String phoneNumber = request.get("phoneNumber");

            if (phoneNumber == null || phoneNumber.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "휴대폰 번호가 필요합니다.");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            log.info("SMS 인증번호 발송 요청: phoneNumber={}", phoneNumber);

            boolean success = smsService.sendVerificationCode(phoneNumber);

            Map<String, Object> response = new HashMap<>();
            response.put("success", success);
            response.put("message", success ? "인증번호가 발송되었습니다." : "인증번호 발송에 실패했습니다.");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("SMS 인증번호 발송 중 오류: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "인증번호 발송 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * SMS 인증번호 검증
     *
     * @param request { phoneNumber: "01012345678", code: "123456" }
     * @return 검증 결과
     */
    @PostMapping("/api/loans/sms/verify")
    public ResponseEntity<Map<String, Object>> verifySmsCode(@RequestBody Map<String, String> request) {
        try {
            String phoneNumber = request.get("phoneNumber");
            String code = request.get("code");

            if (phoneNumber == null || phoneNumber.isEmpty() || code == null || code.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "휴대폰 번호와 인증번호가 필요합니다.");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            log.info("SMS 인증번호 검증 요청: phoneNumber={}, code={}", phoneNumber, code);

            boolean isValid = smsService.verifyCode(phoneNumber, code);

            Map<String, Object> response = new HashMap<>();
            response.put("success", isValid);
            response.put("message", isValid ? "인증에 성공했습니다." : "인증번호가 일치하지 않거나 만료되었습니다.");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("SMS 인증번호 검증 중 오류: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "인증번호 검증 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}
