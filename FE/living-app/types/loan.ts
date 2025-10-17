export interface LoanApplication {
  id: string;
  loanType: '전월세보증금' | '주택담보' | '신용대출';
  loanAmount: number;
  maxAmount: number;
  status: '서류제출' | '서류심사' | '승인대기' | '승인완료' | '계약완료' | '대출실행' | '반려';
  progress: number;
  currentStep: number;
  totalSteps: number;
  submittedAt: string;
  expectedCompletionDate: string;
  documents: {
    leaseContract: boolean;
    residentCopy: boolean;
    incomeProof: boolean;
    bankbook: boolean;
  };
  address: string;
  addressCorrect: boolean;
  newAddress?: string;
}

export interface LoanStatusResponse {
  success: boolean;
  message: string;
  applications: LoanApplication[];
}
