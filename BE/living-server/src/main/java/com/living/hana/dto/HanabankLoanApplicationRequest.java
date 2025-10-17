package com.living.hana.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HanabankLoanApplicationRequest {
    private String userCi;
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
