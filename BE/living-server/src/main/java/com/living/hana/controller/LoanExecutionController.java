package com.living.hana.controller;

import com.living.hana.dto.ApiResponse;
import com.living.hana.dto.LoanExecutionRequest;
import com.living.hana.dto.LoanExecutionResponse;
import com.living.hana.service.LoanExecutionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/loan-execution")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LoanExecutionController {
    
    private final LoanExecutionService loanExecutionService;
    
    @PostMapping("/{loanId}/set-info")
    public ResponseEntity<ApiResponse<String>> setExecutionInfo(
            @PathVariable Long loanId,
            @RequestHeader("userId") Long userId,
            @RequestBody LoanExecutionRequest request) {
        
        log.info("대출 실행 정보 설정 요청 - loanId: {}, userId: {}", loanId, userId);
        ApiResponse<String> response = loanExecutionService.setExecutionInfo(loanId, userId, request);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/{loanId}")
    public ResponseEntity<ApiResponse<LoanExecutionResponse>> getExecutionInfo(
            @PathVariable Long loanId,
            @RequestHeader("userId") Long userId) {
        
        log.info("대출 실행 정보 조회 요청 - loanId: {}, userId: {}", loanId, userId);
        ApiResponse<LoanExecutionResponse> response = loanExecutionService.getExecutionInfo(loanId, userId);
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/{loanId}/execute")
    public ResponseEntity<ApiResponse<String>> executeLoan(
            @PathVariable Long loanId,
            @RequestHeader("userId") Long userId) {
        
        log.info("대출 실행 요청 - loanId: {}, userId: {}", loanId, userId);
        ApiResponse<String> response = loanExecutionService.executeLoan(loanId, userId);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<LoanExecutionResponse>>> getUserExecutableLoans(
            @PathVariable Long userId,
            @RequestHeader("userId") Long requestUserId) {
        
        if (!userId.equals(requestUserId)) {
            return ResponseEntity.ok(ApiResponse.error("권한이 없습니다."));
        }
        
        log.info("사용자 실행 가능 대출 조회 - userId: {}", userId);
        ApiResponse<List<LoanExecutionResponse>> response = 
            loanExecutionService.getUserExecutableLoans(userId);
        return ResponseEntity.ok(response);
    }
}