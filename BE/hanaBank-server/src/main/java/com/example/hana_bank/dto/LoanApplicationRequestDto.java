package com.example.hana_bank.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoanApplicationRequestDto {
    @NotBlank(message = "사용자 CI는 필수입니다")
    private String userCi;
    
    @NotBlank(message = "등본상 주소는 필수입니다")
    private String address;

    private String selectedLoanProduct; // 선택한 대출 상품명
    
    private byte[] leaseContract;
    private String leaseContractFilename;
    
    private byte[] residentCopy;
    private String residentCopyFilename;
    
    private byte[] incomeProof;
    private String incomeProofFilename;
    
    private byte[] bankbook;
    private String bankbookFilename;
}
