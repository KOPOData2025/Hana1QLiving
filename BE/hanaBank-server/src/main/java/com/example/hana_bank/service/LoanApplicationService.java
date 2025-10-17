package com.example.hana_bank.service;

import com.example.hana_bank.dto.LoanApplicationRequestDto;
import com.example.hana_bank.dto.LoanApplicationResponseDto;
import com.example.hana_bank.entity.LoanApplication;
import com.example.hana_bank.entity.LoanApplicationDocument;
import com.example.hana_bank.mapper.LoanApplicationMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class LoanApplicationService {
    
    @Autowired
    private GcpStorageService gcpStorageService;
    
    @Autowired
    private LoanApplicationMapper loanApplicationMapper;
    
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final List<String> ALLOWED_EXTENSIONS = List.of("pdf", "jpg", "jpeg", "png");
    
    @Transactional
    public LoanApplicationResponseDto processLoanApplication(LoanApplicationRequestDto requestDto) {
        // 1. 기본 정보 검증
        List<LoanApplicationResponseDto.ValidationDetail> validationErrors = validateRequest(requestDto);
        
        if (!validationErrors.isEmpty()) {
            return LoanApplicationResponseDto.error("VALIDATION_ERROR", "필수 항목이 누락되었습니다.", validationErrors);
        }
        
        // 2. 파일 검증
        List<LoanApplicationResponseDto.ValidationDetail> fileErrors = validateFiles(requestDto);
        
        if (!fileErrors.isEmpty()) {
            return LoanApplicationResponseDto.error("FILE_VALIDATION_ERROR", "파일 검증에 실패했습니다.", fileErrors);
        }
        
        // 3. 파일을 GCP에 업로드하고 DB에 저장
        try {
            LoanApplication application = saveLoanApplication(requestDto);

            uploadFilesToGcpAndSaveDocuments(requestDto, application.getApplicationId());
            return createSuccessResponse(application);
        } catch (Exception e) {
            return LoanApplicationResponseDto.error("PROCESSING_ERROR", "대출 신청 처리 중 오류가 발생했습니다: " + e.getMessage(), null);
        }
    }
    
    private List<LoanApplicationResponseDto.ValidationDetail> validateRequest(LoanApplicationRequestDto requestDto) {
        List<LoanApplicationResponseDto.ValidationDetail> errors = new ArrayList<>();
        
        if (requestDto.getAddress() == null || requestDto.getAddress().trim().isEmpty()) {
            errors.add(new LoanApplicationResponseDto.ValidationDetail("address", "주소를 입력해주세요."));
        }
        
        if (requestDto.getLeaseContract() == null || requestDto.getLeaseContract().length == 0) {
            errors.add(new LoanApplicationResponseDto.ValidationDetail("leaseContract", "임대차계약서를 업로드해주세요."));
        }
        
        if (requestDto.getResidentCopy() == null || requestDto.getResidentCopy().length == 0) {
            errors.add(new LoanApplicationResponseDto.ValidationDetail("residentCopy", "주민등록등본을 업로드해주세요."));
        }
        
        if (requestDto.getIncomeProof() == null || requestDto.getIncomeProof().length == 0) {
            errors.add(new LoanApplicationResponseDto.ValidationDetail("incomeProof", "소득증빙서류를 업로드해주세요."));
        }
        
        if (requestDto.getBankbook() == null || requestDto.getBankbook().length == 0) {
            errors.add(new LoanApplicationResponseDto.ValidationDetail("bankbook", "통장사본을 업로드해주세요."));
        }
        
        return errors;
    }
    
    private List<LoanApplicationResponseDto.ValidationDetail> validateFiles(LoanApplicationRequestDto requestDto) {
        List<LoanApplicationResponseDto.ValidationDetail> errors = new ArrayList<>();
        
        // 파일 크기 검증
        if (requestDto.getLeaseContract() != null && requestDto.getLeaseContract().length > MAX_FILE_SIZE) {
            errors.add(new LoanApplicationResponseDto.ValidationDetail("leaseContract", "임대차계약서의 파일 크기가 10MB를 초과합니다."));
        }
        
        if (requestDto.getResidentCopy() != null && requestDto.getResidentCopy().length > MAX_FILE_SIZE) {
            errors.add(new LoanApplicationResponseDto.ValidationDetail("residentCopy", "주민등록등본의 파일 크기가 10MB를 초과합니다."));
        }
        
        if (requestDto.getIncomeProof() != null && requestDto.getIncomeProof().length > MAX_FILE_SIZE) {
            errors.add(new LoanApplicationResponseDto.ValidationDetail("incomeProof", "소득증빙서류의 파일 크기가 10MB를 초과합니다."));
        }
        
        if (requestDto.getBankbook() != null && requestDto.getBankbook().length > MAX_FILE_SIZE) {
            errors.add(new LoanApplicationResponseDto.ValidationDetail("bankbook", "통장사본의 파일 크기가 10MB를 초과합니다."));
        }
        
        // 파일 확장자 검증
        validateFileExtension(requestDto.getLeaseContractFilename(), "leaseContract", errors);
        validateFileExtension(requestDto.getResidentCopyFilename(), "residentCopy", errors);
        validateFileExtension(requestDto.getIncomeProofFilename(), "incomeProof", errors);
        validateFileExtension(requestDto.getBankbookFilename(), "bankbook", errors);
        
        return errors;
    }
    
    private void validateFileExtension(String filename, String fieldName, List<LoanApplicationResponseDto.ValidationDetail> errors) {
        if (filename != null) {
            String extension = getFileExtension(filename);
            if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
                errors.add(new LoanApplicationResponseDto.ValidationDetail(fieldName, 
                    getDocumentName(fieldName) + "는 PDF, JPG, PNG 형식만 지원합니다."));
            }
        }
    }
    
    private String getDocumentName(String docType) {
        return switch (docType) {
            case "leaseContract" -> "임대차계약서";
            case "residentCopy" -> "주민등록등본";
            case "incomeProof" -> "소득증빙서류";
            case "bankbook" -> "통장사본";
            default -> "서류";
        };
    }
    
    private String getFileExtension(String filename) {
        int lastDotIndex = filename.lastIndexOf('.');
        return lastDotIndex > 0 ? filename.substring(lastDotIndex + 1) : "";
    }
    
    private LoanApplication saveLoanApplication(LoanApplicationRequestDto requestDto) {
        // 대출 신청 정보 생성
        LoanApplication application = new LoanApplication();
        application.setApplicationNumber("LOAN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        application.setUserCi(requestDto.getUserCi()); // 요청에서 받은 userCi 사용
        application.setAddress(requestDto.getAddress());
        application.setSelectedLoanProduct(requestDto.getSelectedLoanProduct()); // 선택한 대출 상품명 저장
        application.setStatus("SUBMITTED");
        application.setSubmittedAt(LocalDateTime.now());
        application.setUpdatedAt(LocalDateTime.now());
        
        // DB에 저장 (applicationId가 자동으로 설정됨)
        loanApplicationMapper.insertLoanApplication(application);
        
        // applicationId가 설정되었는지 확인
        if (application.getApplicationId() == null) {
            throw new RuntimeException("대출 신청 ID 생성에 실패했습니다.");
        }
        
        return application;
    }
    
    private void uploadFilesToGcpAndSaveDocuments(LoanApplicationRequestDto requestDto, Long applicationId) throws Exception {
        // 임대차계약서 업로드 및 DB 저장
        if (requestDto.getLeaseContract() != null) {
            String folder = "hanabank/loan-applications/leaseContract";
            String fileUrl = gcpStorageService.uploadByteArray(
                requestDto.getLeaseContract(), 
                requestDto.getLeaseContractFilename(), 
                folder
            );
            saveDocument(applicationId, "leaseContract", fileUrl, requestDto.getLeaseContractFilename());
        }
        
        // 주민등록등본 업로드 및 DB 저장
        if (requestDto.getResidentCopy() != null) {
            String folder = "hanabank/loan-applications/residentCopy";
            String fileUrl = gcpStorageService.uploadByteArray(
                requestDto.getResidentCopy(), 
                requestDto.getResidentCopyFilename(), 
                folder
            );
            saveDocument(applicationId, "residentCopy", fileUrl, requestDto.getResidentCopyFilename());
        }
        
        // 소득증빙서류 업로드 및 DB 저장
        if (requestDto.getIncomeProof() != null) {
            String folder = "hanabank/loan-applications/incomeProof";
            String fileUrl = gcpStorageService.uploadByteArray(
                requestDto.getIncomeProof(), 
                requestDto.getIncomeProofFilename(), 
                folder
            );
            saveDocument(applicationId, "incomeProof", fileUrl, requestDto.getIncomeProofFilename());
        }
        
        // 통장사본 업로드 및 DB 저장
        if (requestDto.getBankbook() != null) {
            String folder = "hanabank/loan-applications/bankbook";
            String fileUrl = gcpStorageService.uploadByteArray(
                requestDto.getBankbook(), 
                requestDto.getBankbookFilename(), 
                folder
            );
            saveDocument(applicationId, "bankbook", fileUrl, requestDto.getBankbookFilename());
        }
    }
    
    private void saveDocument(Long applicationId, String documentType, String fileUrl, String fileName) {
        LoanApplicationDocument document = new LoanApplicationDocument();
        document.setApplicationId(applicationId);
        document.setDocumentType(documentType);
        document.setFileUrl(fileUrl);
        document.setFileName(fileName);
        document.setUploadedAt(LocalDateTime.now());
        
        loanApplicationMapper.insertLoanApplicationDocument(document);
    }
    
    private LoanApplicationResponseDto createSuccessResponse(LoanApplication application) {
        LoanApplicationResponseDto.ApplicationData data = new LoanApplicationResponseDto.ApplicationData(
            application.getApplicationNumber(),
            application.getStatus(),
            application.getSubmittedAt(),
            "3-5 영업일",
            List.of("서류 검토 진행 중", "심사 결과는 SMS로 안내 예정")
        );
        
        return LoanApplicationResponseDto.success(data);
    }
}

