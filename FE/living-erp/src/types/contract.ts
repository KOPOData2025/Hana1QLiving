// 계약 관련 타입 정의
export interface Contract {
  id: number;
  userId: number;
  unitId: number;
  startDate: string;
  endDate: string;
  deposit: number;
  monthlyRent: number;
  maintenanceFee: number;
  currentAddress?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  createdAt: string;
  updatedAt: string;
}

// 계약 생성 요청 타입
export interface CreateContractRequest {
  userId: number;
  unitId: number;
  startDate: string; // YYYY-MM-DD 형식
  endDate: string;   // YYYY-MM-DD 형식
  deposit: number;
  monthlyRent: number;
  maintenanceFee: number;
  currentAddress?: string;
  paymentDay: number; // 월세/관리비 통합 납부일 (1-31)
  moveInDate: string; // 입주일 (YYYY-MM-DD 형식)
}

// 계약 생성 응답 타입
export interface CreateContractResponse {
  success: boolean;
  data: Contract;
  message: string;
}

// 계약 폼 데이터 타입
export interface ContractFormData {
  startDate: string;
  endDate: string;
  deposit: string;
  monthlyRent: string;
  maintenanceFee: string;
  currentAddress: string;
  paymentDay: string;
  moveInDate: string;
}
