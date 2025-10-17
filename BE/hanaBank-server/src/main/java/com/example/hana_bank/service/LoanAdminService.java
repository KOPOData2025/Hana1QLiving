package com.example.hana_bank.service;

import com.example.hana_bank.dto.LoanApplicationListDto;
import com.example.hana_bank.dto.LoanReviewRequestDto;
import com.example.hana_bank.entity.LoanApplication;
import com.example.hana_bank.entity.LoanContract;
import com.example.hana_bank.entity.LoanPayment;
import com.example.hana_bank.entity.AccountTransaction;
import com.example.hana_bank.mapper.LoanApplicationMapper;
import com.example.hana_bank.mapper.LoanContractMapper;
import com.example.hana_bank.mapper.LoanPaymentMapper;
import com.example.hana_bank.mapper.AccountTransactionMapper;
import com.example.hana_bank.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoanAdminService {
    
    private final LoanApplicationMapper loanApplicationMapper;
    private final LoanContractMapper loanContractMapper;
    private final LoanPaymentMapper loanPaymentMapper;
    private final AccountTransactionMapper accountTransactionMapper;
    private final UserMapper userMapper;
    
    public List<LoanApplicationListDto> getLoanApplicationList() {
        try {
            List<LoanApplication> applications = loanApplicationMapper.selectLoanApplicationList();

            List<LoanApplicationListDto> result = applications.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());

            return result;

        } catch (Exception e) {
            log.error("대출 신청 목록 조회 중 오류 발생:", e);
            throw new RuntimeException("대출 신청 목록 조회 중 오류가 발생했습니다.", e);
        }
    }

    public LoanApplicationListDto getLoanApplicationDetail(Long id) {
        try {
            LoanApplication application = loanApplicationMapper.selectLoanApplicationById(id);
            if (application == null) {
                throw new RuntimeException("대출 신청 정보를 찾을 수 없습니다. ID: " + id);
            }

            LoanApplicationListDto dto = convertToDto(application);

            var documents = loanApplicationMapper.selectDocumentsByApplicationId(id);
            dto.setDocuments(documents);

            return dto;

        } catch (Exception e) {
            log.error("대출 신청 상세 조회 중 오류 발생 - ID: {}", id, e);
            throw new RuntimeException("대출 신청 상세 조회 중 오류가 발생했습니다.", e);
        }
    }
    
    private LoanApplicationListDto convertToDto(LoanApplication application) {
        // 사용자 이름 조회 (UserMapper 사용)
        String userName = "N/A";
        try {
            if (application.getUserCi() != null) {
                var user = userMapper.findByCi(application.getUserCi()).orElse(null);
                userName = user != null ? user.getName() : "사용자 정보 없음";
            }
        } catch (Exception e) {
            // 사용자 정보 조회 실패 시 기본값 사용
        }
        
        return new LoanApplicationListDto(
            application.getApplicationId(),
            application.getApplicationNumber(),
            userName,
            application.getUserCi(),
            application.getAddress(),
            application.getSelectedLoanProduct(), // 선택한 대출 상품명 추가
            application.getStatus(),
            application.getSubmittedAt(),
            application.getUpdatedAt(),
            application.getReviewerId() != null ? application.getReviewerId() : "미배정",
            application.getDecision(),
            application.getReviewComments(),
            application.getApprovedAmount(),
            application.getInterestRate(),
            application.getLoanTerm() != null ? application.getLoanTerm() : 24, // 기본값 24개월
            null // documents는 별도로 설정
        );
    }

    public void reviewLoanApplication(Long applicationId, LoanReviewRequestDto request) {
        try {
            LoanApplication application = loanApplicationMapper.selectLoanApplicationById(applicationId);
            if (application == null) {
                throw new RuntimeException("대출 신청 정보를 찾을 수 없습니다. ID: " + applicationId);
            }

            loanApplicationMapper.updateLoanApplicationStatus(
                applicationId,
                request.getStatus(),
                "관리자",
                request.getDecision(),
                request.getComments(),
                request.getApprovedAmount(),
                request.getInterestRate(),
                request.getLoanTerm()
            );

        } catch (Exception e) {
            log.error("대출 신청 검토 중 오류 발생 - ID: {}", applicationId, e);
            throw new RuntimeException("대출 신청 검토 중 오류가 발생했습니다.", e);
        }
    }

    public String createLoanContract(Map<String, Object> contractRequest) {
        try {
            String applicationId = contractRequest.get("applicationId").toString();
            String contractNumber = contractRequest.get("contractNumber").toString();
            Long loanAmount = Long.valueOf(contractRequest.get("loanAmount").toString());
            String paymentDate = contractRequest.get("paymentDate").toString();
            String landlordAccount = contractRequest.get("landlordAccount").toString();

            LoanContract contract = new LoanContract();
            contract.setApplicationReferenceId(applicationId);
            contract.setContractNumber(contractNumber);
            contract.setLoanAmount(BigDecimal.valueOf(loanAmount));
            contract.setScheduledDate(paymentDate);
            contract.setStatus("SCHEDULED");
            contract.setLoanPurpose("전월세대출");
            String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            contract.setCreatedAt(now);
            contract.setUpdatedAt(now);

            loanContractMapper.insertLoanContract(contract);

            return contractNumber;

        } catch (Exception e) {
            log.error("대출 계약 생성 중 오류: {}", e.getMessage(), e);
            throw new RuntimeException("대출 계약 생성에 실패했습니다: " + e.getMessage(), e);
        }
    }

    public String executeLoanPayment(Map<String, Object> paymentRequest) {
        try {
            String contractNumber = paymentRequest.get("contractNumber").toString();
            Long paymentAmount = Long.valueOf(paymentRequest.get("paymentAmount").toString());
            String landlordAccount = paymentRequest.get("landlordAccount").toString();
            String landlordName = paymentRequest.getOrDefault("landlordName", "임대인").toString();

            String transactionId = "HNB-TXN" + System.currentTimeMillis();

            LoanPayment payment = new LoanPayment();
            payment.setTransactionId(transactionId);
            payment.setContractNumber(contractNumber);
            payment.setPaymentAmount(BigDecimal.valueOf(paymentAmount));
            payment.setLandlordAccount(landlordAccount);
            payment.setLandlordName(landlordName);
            payment.setStatus("COMPLETED");
            payment.setExecutionType("AUTO");
            payment.setScheduledAt(LocalDateTime.now());
            payment.setExecutedAt(LocalDateTime.now());
            payment.setRemarks("하나원큐리빙 연동 자동 대출 실행");

            loanPaymentMapper.insertLoanPayment(payment);

            createAccountTransactions(transactionId, paymentAmount, landlordAccount, landlordName);

            return transactionId;

        } catch (Exception e) {
            log.error("대출 실행 중 오류: {}", e.getMessage(), e);
            throw new RuntimeException("대출 실행에 실패했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * 대출 송금시 계좌 거래내역 생성
     */
    private void createAccountTransactions(String transactionId, Long paymentAmount, String landlordAccount, String landlordName) {
        try {
            String loanAccount = "110-123-456789";
            BigDecimal amount = BigDecimal.valueOf(paymentAmount);
            LocalDateTime now = LocalDateTime.now();

            AccountTransaction withdrawalTransaction = AccountTransaction.builder()
                .accountNumber(loanAccount)
                .transactionType(AccountTransaction.TYPE_TRANSFER_OUT)
                .amount(amount)
                .balanceBefore(BigDecimal.valueOf(1000000000L))
                .balanceAfter(BigDecimal.valueOf(1000000000L - paymentAmount))
                .transactionId(transactionId + "-OUT")
                .description("대출금 송금 (전월세보증금)")
                .relatedAccount(landlordAccount)
                .relatedBankCode("088")
                .relatedBankName("신한은행")
                .category("LOAN")
                .status(AccountTransaction.STATUS_SUCCESS)
                .createdAt(now)
                .updatedAt(now)
                .build();

            AccountTransaction depositTransaction = null;
            if (isHanaAccount(landlordAccount)) {
                depositTransaction = AccountTransaction.builder()
                    .accountNumber(landlordAccount)
                    .transactionType(AccountTransaction.TYPE_TRANSFER_IN)
                    .amount(amount)
                    .balanceBefore(BigDecimal.valueOf(5000000L))
                    .balanceAfter(BigDecimal.valueOf(5000000L + paymentAmount))
                    .transactionId(transactionId + "-IN")
                    .description("대출금 입금 (전월세보증금)")
                    .relatedAccount(loanAccount)
                    .relatedBankCode("081")
                    .relatedBankName("하나은행")
                    .category("LOAN")
                    .status(AccountTransaction.STATUS_SUCCESS)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();
            }

            accountTransactionMapper.insertAccountTransaction(withdrawalTransaction);

            if (depositTransaction != null) {
                accountTransactionMapper.insertAccountTransaction(depositTransaction);
            }

        } catch (Exception e) {
            log.error("계좌 거래내역 생성 중 오류: {}", e.getMessage(), e);
        }
    }

    /**
     * 하나은행 계좌번호인지 확인
     */
    private boolean isHanaAccount(String accountNumber) {
        // 하나은행 계좌번호 패턴 확인 (간단한 예시)
        return accountNumber != null && (
            accountNumber.startsWith("110-") ||
            accountNumber.startsWith("128-") ||
            accountNumber.startsWith("170-")
        );
    }

    public LoanContract getLoanContract(String contractNumber) {
        try {
            LoanContract contract = loanContractMapper.findByContractNumber(contractNumber);
            if (contract == null) {
                throw new RuntimeException("계약 정보를 찾을 수 없습니다. 계약번호: " + contractNumber);
            }

            return contract;

        } catch (Exception e) {
            log.error("계약 조회 중 오류: {}", e.getMessage(), e);
            throw new RuntimeException("계약 조회에 실패했습니다: " + e.getMessage(), e);
        }
    }

    public LoanContract getContractByApplicationId(String applicationId) {
        try {
            LoanContract contract = loanContractMapper.findByOneQReference(applicationId);
            return contract;

        } catch (Exception e) {
            log.error("계약 확인 중 오류: {}", e.getMessage(), e);
            throw new RuntimeException("계약 확인에 실패했습니다: " + e.getMessage(), e);
        }
    }

    public List<LoanPayment> getAllLoanPayments() {
        try {
            List<LoanPayment> payments = loanPaymentMapper.findAllLoanPayments();
            return payments;

        } catch (Exception e) {
            log.error("대출 송금 내역 조회 중 오류: {}", e.getMessage(), e);
            throw new RuntimeException("대출 송금 내역 조회에 실패했습니다: " + e.getMessage(), e);
        }
    }
}
