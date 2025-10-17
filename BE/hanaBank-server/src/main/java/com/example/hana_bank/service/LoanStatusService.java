package com.example.hana_bank.service;

import com.example.hana_bank.dto.LoanStatusResponseDto;
import com.example.hana_bank.entity.LoanApplication;
import com.example.hana_bank.entity.LoanApplicationDocument;
import com.example.hana_bank.mapper.LoanApplicationMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class LoanStatusService {
    
    @Autowired
    private LoanApplicationMapper loanApplicationMapper;
    
    public LoanStatusResponseDto getLoanStatus(String userCi) {
        try {
            // 1. 사용자의 대출 신청 목록 조회
            List<LoanApplication> applications = loanApplicationMapper.selectLoanApplicationList();
            List<LoanApplication> userApplications = applications.stream()
                    .filter(app -> userCi.equals(app.getUserCi()))
                    .collect(Collectors.toList());
            
            if (userApplications.isEmpty()) {
                return LoanStatusResponseDto.success(new ArrayList<>());
            }
            
            // 2. 각 대출 신청에 대한 상세 정보 조회
            List<LoanStatusResponseDto.LoanApplication> loanStatusList = new ArrayList<>();
            
            for (LoanApplication app : userApplications) {
                // 서류 정보 조회
                List<LoanApplicationDocument> documents = loanApplicationMapper.selectDocumentsByApplicationId(app.getApplicationId());
                
                // 진행 상황 계산
                LoanProgress progress = calculateProgress(app.getStatus());
                
                // 서류 제출 상태 확인
                LoanStatusResponseDto.Documents docStatus = checkDocumentStatus(documents);
                
                // 대출 상황 정보 생성
                LoanStatusResponseDto.LoanApplication loanStatus = new LoanStatusResponseDto.LoanApplication(
                    app.getApplicationNumber(),
                    "전월세보증금", // MVP 단계에서는 고정값
                    null, // loanAmount는 승인 후에만 설정
                    5000L, // maxAmount는 MVP 단계에서 고정값
                    mapStatusToKorean(app.getStatus()),
                    progress.getProgress(),
                    progress.getCurrentStep(),
                    progress.getTotalSteps(),
                    app.getSubmittedAt(),
                    calculateExpectedCompletionDate(app.getSubmittedAt()),
                    docStatus,
                    app.getAddress(),
                    true, // addressCorrect는 MVP 단계에서 true
                    null // newAddress는 변경 시에만 설정
                );
                
                loanStatusList.add(loanStatus);
            }
            
            return LoanStatusResponseDto.success(loanStatusList);
            
        } catch (Exception e) {
            return LoanStatusResponseDto.error("INTERNAL_ERROR", "대출 상황 조회 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
    
    private LoanProgress calculateProgress(String status) {
        return switch (status) {
            case "SUBMITTED" -> new LoanProgress(2, 5, 40); // 서류제출 완료
            case "UNDER_REVIEW" -> new LoanProgress(3, 5, 60); // 서류심사 중
            case "APPROVED" -> new LoanProgress(3, 5, 60); // 승인완료 (서류심사 완료)
            case "REJECTED" -> new LoanProgress(0, 5, 0); // 반려
            default -> new LoanProgress(1, 5, 20); // 기본값
        };
    }
    
    private String mapStatusToKorean(String status) {
        return switch (status) {
            case "SUBMITTED" -> "서류제출";
            case "UNDER_REVIEW" -> "서류심사";
            case "APPROVED" -> "승인완료";
            case "REJECTED" -> "반려";
            default -> "처리중";
        };
    }
    
    private LoanStatusResponseDto.Documents checkDocumentStatus(List<LoanApplicationDocument> documents) {
        Map<String, Boolean> docMap = documents.stream()
                .collect(Collectors.toMap(
                    LoanApplicationDocument::getDocumentType,
                    doc -> true
                ));
        
        return new LoanStatusResponseDto.Documents(
            docMap.getOrDefault("leaseContract", false),
            docMap.getOrDefault("residentCopy", false),
            docMap.getOrDefault("incomeProof", false),
            docMap.getOrDefault("bankbook", false)
        );
    }
    
    private LocalDateTime calculateExpectedCompletionDate(LocalDateTime submittedAt) {
        // MVP 단계에서는 제출일로부터 30일 후로 설정
        return submittedAt.plusDays(30);
    }
    
    // 진행 상황을 나타내는 내부 클래스
    private static class LoanProgress {
        private final int currentStep;
        private final int totalSteps;
        private final int progress;
        
        public LoanProgress(int currentStep, int totalSteps, int progress) {
            this.currentStep = currentStep;
            this.totalSteps = totalSteps;
            this.progress = progress;
        }
        
        public int getCurrentStep() { return currentStep; }
        public int getTotalSteps() { return totalSteps; }
        public int getProgress() { return progress; }
    }
}
