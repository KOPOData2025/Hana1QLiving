export const CERTIFICATE_CONSTANTS = {
  STEPS: {
    INITIAL: 'initial',
    FAMILY: 'family',
    ADDRESS: 'address',
    DOCUMENT: 'document',
    FINAL: 'final'
  } as const,
  
  DROPDOWN_OPTIONS: {
    FAMILY_RELATIONS: ['아버지', '어머니', '배우자', '자녀'] as const,
    REPAYMENT_METHODS: ['원리금균등', '원금균등', '만기일시'] as const,
    ACCOUNTS: [
      '카카오뱅크 333-123456789',
      '신한은행 110-123456789',
      '국민은행 123-123456789'
    ] as const
  },
  
  DOCUMENTS: {
    TYPES: ['residentRegister', 'incomeTax', 'rentalContract', 'depositReceipt'] as const,
    NAMES: ['가족관계증명서', '건강보험자격득실확인서', '건강보험료납부확인서', '4대보험 가입내역서'] as const
  },
  
  SUBMISSION_INFO: {
    DEADLINE: '2025.08.28',
    AVAILABLE_TIME: '평일/토요일 08시 ~ 22시 (일요일/공휴일 이용불가)'
  }
} as const;

export type StepType = typeof CERTIFICATE_CONSTANTS.STEPS[keyof typeof CERTIFICATE_CONSTANTS.STEPS];
export type DocumentType = typeof CERTIFICATE_CONSTANTS.DOCUMENTS.TYPES[number];
export type FamilyRelation = typeof CERTIFICATE_CONSTANTS.DROPDOWN_OPTIONS.FAMILY_RELATIONS[number];
export type RepaymentMethod = typeof CERTIFICATE_CONSTANTS.DROPDOWN_OPTIONS.REPAYMENT_METHODS[number];
export type Account = typeof CERTIFICATE_CONSTANTS.DROPDOWN_OPTIONS.ACCOUNTS[number];
