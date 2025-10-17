package com.living.hana.service;

import com.living.hana.dto.ApiResponse;
import com.living.hana.dto.HanabankTransferRequest;
import com.living.hana.dto.HanabankTransferResponse;
import com.living.hana.dto.LoanExecutionRequest;
import com.living.hana.dto.LoanExecutionResponse;
import com.living.hana.entity.Loan;
import com.living.hana.entity.LoanExecution;
import com.living.hana.mapper.LoanMapper;
import com.living.hana.mapper.LoanExecutionMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.NotNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoanExecutionService {
    
    private final LoanMapper loanMapper;
    private final LoanExecutionMapper loanExecutionMapper;
    private final RestTemplate restTemplate;
    
    @Value("${hanabank.api.base-url:http://localhost:8080}")
    private String hanabankApiUrl;
    
    @Value("${hanabank.api.loan-execution-account:110-000-000001}")
    private String hanabankLoanAccount;

    @Transactional
    public ApiResponse<String> setExecutionInfo(Long loanId, Long userId, LoanExecutionRequest request) {
        try {
            Loan loan = loanMapper.findById(loanId);
            if (loan == null) {
                return ApiResponse.error("대출을 찾을 수 없습니다.");
            }
            
            if (!loan.getUserId().equals(userId)) {
                return ApiResponse.error("권한이 없습니다.");
            }
            
            if (!"APPROVED".equals(loan.getStatus())) {
                return ApiResponse.error("승인된 대출만 실행 정보를 설정할 수 있습니다.");
            }
            
            // 희망일이 오늘보다 이전인지 확인
            LocalDate desiredDate = LocalDate.parse(request.getDesiredExecutionDate());
            LocalDate today = LocalDate.now();
            
            if (desiredDate.isBefore(today)) {
                return ApiResponse.error("희망 실행일은 오늘 이후여야 합니다.");
            }
            
            String executionStatus = desiredDate.equals(today) ? "READY" : "PENDING";
            
            int result = loanMapper.updateExecutionInfo(
                Long.parseLong(loanId.toString()),
                request.getDesiredExecutionDate(),
                request.getLandlordAccountNumber(),
                request.getLandlordBankCode(),
                request.getLandlordAccountHolder(),
                request.getContractFilePath(),
                executionStatus
            );
            
            if (result > 0) {
                return ApiResponse.success("대출 실행 정보가 설정되었습니다.");
            } else {
                return ApiResponse.error("대출 실행 정보 설정에 실패했습니다.");
            }
            
        } catch (Exception e) {
            log.error("대출 실행 정보 설정 중 오류 발생: ", e);
            return ApiResponse.error("대출 실행 정보 설정 중 오류가 발생했습니다.");
        }
    }
    
    public ApiResponse<LoanExecutionResponse> getExecutionInfo(Long loanId, Long userId) {
        try {
            Loan loan = loanMapper.findById(loanId);
            if (loan == null) {
                return ApiResponse.error("대출을 찾을 수 없습니다.");
            }
            
            if (!loan.getUserId().equals(userId)) {
                return ApiResponse.error("권한이 없습니다.");
            }
            
            // 실행 가능 여부 체크
            boolean canExecute = checkCanExecute(loan);

            LoanExecutionResponse response = getLoanExecutionResponse(loan, canExecute);

            return ApiResponse.success(response);
            
        } catch (Exception e) {
            log.error("대출 실행 정보 조회 중 오류 발생: ", e);
            return ApiResponse.error("대출 실행 정보 조회 중 오류가 발생했습니다.");
        }
    }

    @NotNull
    private static LoanExecutionResponse getLoanExecutionResponse(Loan loan, boolean canExecute) {
        LoanExecutionResponse response = new LoanExecutionResponse(
            loan.getId(),
            loan.getExecutionStatus(),
                canExecute
        );
        response.setDesiredExecutionDate(loan.getDesiredExecutionDate());
        response.setActualExecutionDate(loan.getActualExecutionDate());
        response.setLoanAmount(loan.getLoanAmount());
        response.setLandlordAccountNumber(loan.getLandlordAccountNumber());
        response.setLandlordBankCode(loan.getLandlordBankCode());
        response.setLandlordAccountHolder(loan.getLandlordAccountHolder());
        response.setTransactionId(loan.getTransactionId());
        response.setExecutionResultMessage(loan.getExecutionResultMessage());
        response.setContractFilePath(loan.getContractFilePath());
        return response;
    }

    @Transactional
    public ApiResponse<String> executeLoan(Long loanId, Long userId) {
        try {
            Loan loan = loanMapper.findById(loanId);
            if (loan == null) {
                return ApiResponse.error("대출을 찾을 수 없습니다.");
            }
            
            if (!loan.getUserId().equals(userId)) {
                return ApiResponse.error("권한이 없습니다.");
            }
            
            if (!checkCanExecute(loan)) {
                return ApiResponse.error("현재 대출을 실행할 수 없습니다.");
            }
            
            // 실행 로그 생성
            LoanExecution execution = new LoanExecution();
            execution.setLoanId(loanId);
            execution.setExecutionDate(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
            execution.setAmount(loan.getLoanAmount());
            execution.setFromAccount(hanabankLoanAccount);
            execution.setToAccount(loan.getLandlordAccountNumber());
            execution.setStatus("PROCESSING");
            execution.setCreatedAt(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
            execution.setUpdatedAt(execution.getCreatedAt());
            
            loanExecutionMapper.insert(execution);
            
            // 하나은행 API 호출하여 송금 실행
            HanabankTransferResponse transferResponse = executeTransfer(loan);
            
            String executionStatus;
            String resultMessage;
            
            if ("SUCCESS".equals(transferResponse.getStatus())) {
                executionStatus = "EXECUTED";
                resultMessage = "대출이 성공적으로 실행되었습니다.";
                
                // 실행 결과 업데이트
                loanMapper.updateExecutionResult(
                    Long.parseLong(loanId.toString()),
                    LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                    transferResponse.getTransactionId(),
                    executionStatus,
                    resultMessage
                );
                
                // 실행 로그 업데이트
                execution.setTransactionId(transferResponse.getTransactionId());
                execution.setStatus("SUCCESS");
                execution.setUpdatedAt(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
                loanExecutionMapper.update(execution);

            } else {
                executionStatus = "FAILED";
                resultMessage = "대출 실행에 실패했습니다: " + transferResponse.getErrorMessage();
                
                loanMapper.updateExecutionResult(
                    Long.parseLong(loanId.toString()),
                    LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                    null,
                    executionStatus,
                    resultMessage
                );
                
                // 실행 로그 업데이트
                execution.setStatus("FAILED");
                execution.setErrorMessage(transferResponse.getErrorMessage());
                execution.setUpdatedAt(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
                loanExecutionMapper.update(execution);
            }

            return ApiResponse.success(resultMessage);
            
        } catch (Exception e) {
            log.error("대출 실행 중 오류 발생: ", e);
            return ApiResponse.error("대출 실행 중 오류가 발생했습니다.");
        }
    }
    
    public ApiResponse<List<LoanExecutionResponse>> getUserExecutableLoans(Long userId) {
        try {
            List<Loan> userLoans = loanMapper.findByUserId(userId);
            List<LoanExecutionResponse> responses = userLoans.stream()
                .filter(loan -> "APPROVED".equals(loan.getStatus()))
                .filter(loan -> loan.getDesiredExecutionDate() != null)
                .map(loan -> {
                    boolean canExecute = checkCanExecute(loan);
                    LoanExecutionResponse response = new LoanExecutionResponse(
                        loan.getId(),
                        loan.getExecutionStatus(),
                        canExecute
                    );
                    response.setDesiredExecutionDate(loan.getDesiredExecutionDate());
                    response.setActualExecutionDate(loan.getActualExecutionDate());
                    response.setLoanAmount(loan.getLoanAmount());
                    response.setLandlordAccountNumber(loan.getLandlordAccountNumber());
                    response.setLandlordBankCode(loan.getLandlordBankCode());
                    response.setLandlordAccountHolder(loan.getLandlordAccountHolder());
                    response.setTransactionId(loan.getTransactionId());
                    response.setExecutionResultMessage(loan.getExecutionResultMessage());
                    response.setContractFilePath(loan.getContractFilePath());
                    return response;
                })
                .collect(Collectors.toList());
                
            return ApiResponse.success(responses);
            
        } catch (Exception e) {
            log.error("사용자 실행 가능 대출 조회 중 오류 발생: ", e);
            return ApiResponse.error("대출 조회 중 오류가 발생했습니다.");
        }
    }
    
    private boolean checkCanExecute(Loan loan) {
        if (loan.getDesiredExecutionDate() == null || loan.getExecutionStatus() == null) {
            return false;
        }
        
        if ("EXECUTED".equals(loan.getExecutionStatus())) {
            return false;
        }
        
        LocalDate desiredDate = LocalDate.parse(loan.getDesiredExecutionDate());
        LocalDate today = LocalDate.now();
        
        return !desiredDate.isAfter(today) && 
               loan.getLandlordAccountNumber() != null && 
               loan.getContractFilePath() != null;
    }
    
    private HanabankTransferResponse executeTransfer(Loan loan) {
        try {
            HanabankTransferRequest transferRequest = new HanabankTransferRequest(
                hanabankLoanAccount,
                loan.getLandlordAccountNumber(),
                loan.getLandlordBankCode(),
                loan.getLandlordAccountHolder(),
                loan.getLoanAmount(),
                "대출실행",
                "하나원큐리빙 대출실행 - " + loan.getLoanNumber(),
                loan.getLoanNumber()
            );
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<HanabankTransferRequest> entity = new HttpEntity<>(transferRequest, headers);
            
            ResponseEntity<HanabankTransferResponse> response = restTemplate.exchange(
                hanabankApiUrl + "/api/transfer/execute",
                HttpMethod.POST,
                entity,
                HanabankTransferResponse.class
            );
            
            return response.getBody();
            
        } catch (Exception e) {
            log.error("하나은행 송금 API 호출 중 오류 발생: ", e);
            HanabankTransferResponse errorResponse = new HanabankTransferResponse();
            errorResponse.setStatus("FAILED");
            errorResponse.setErrorMessage("송금 처리 중 시스템 오류가 발생했습니다.");
            return errorResponse;
        }
    }
}