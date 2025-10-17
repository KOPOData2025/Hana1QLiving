package com.example.hana_bank.mapper;

import com.example.hana_bank.entity.LoanApplication;
import com.example.hana_bank.entity.LoanApplicationDocument;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface LoanApplicationMapper {
    
    // 대출 신청 저장
    int insertLoanApplication(LoanApplication application);
    
    // 대출 신청 서류 저장
    int insertLoanApplicationDocument(LoanApplicationDocument document);
    
    // 대출 신청 목록 조회
    List<LoanApplication> selectLoanApplicationList();
    
    // 대출 신청 상세 조회
    LoanApplication selectLoanApplicationById(@Param("applicationId") Long applicationId);
    
    // 대출 신청 서류 목록 조회
    List<LoanApplicationDocument> selectDocumentsByApplicationId(@Param("applicationId") Long applicationId);
    
    // 대출 신청 상태 업데이트 (검토 정보 포함)
    int updateLoanApplicationStatus(@Param("applicationId") Long applicationId, 
                                   @Param("status") String status,
                                   @Param("reviewerId") String reviewerId,
                                   @Param("decision") String decision,
                                   @Param("comments") String comments,
                                   @Param("approvedAmount") Long approvedAmount,
                                   @Param("interestRate") Double interestRate,
                                   @Param("loanTerm") Integer loanTerm);
}
