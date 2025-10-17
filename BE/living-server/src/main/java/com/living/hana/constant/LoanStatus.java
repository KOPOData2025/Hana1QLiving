package com.living.hana.constant;

public class LoanStatus {
    
    // 대출 상태
    public static final String DOCUMENT_SUBMITTED = "서류제출";
    public static final String DOCUMENT_REVIEW = "서류심사";
    public static final String APPROVAL_WAITING = "승인대기";
    public static final String APPROVAL_COMPLETED = "승인완료";
    public static final String CONTRACT_COMPLETED = "계약완료";
    public static final String LOAN_EXECUTED = "대출실행";
    public static final String REJECTED = "반려";
    
    // 대출 유형
    public static final String TYPE_DEPOSIT_LOAN = "전월세보증금";
    public static final String TYPE_HOUSE_MORTGAGE = "주택담보";
    public static final String TYPE_CREDIT_LOAN = "신용대출";
    
    // 진행 단계
    public static final int STEP_LIMIT_INQUIRY = 1;      // 한도/금리 조회
    public static final int STEP_DOCUMENT_SUBMISSION = 2; // 필요서류 제출
    public static final int STEP_DOCUMENT_REVIEW = 3;     // 서류심사
    public static final int STEP_CONTRACT_WRITING = 4;    // 대출 계약서 작성 및 희망일 예약
    public static final int STEP_LOAN_EXECUTION = 5;      // 대출 실행
    
    // 총 단계 수
    public static final int TOTAL_STEPS = 5;
}
