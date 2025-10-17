// 리츠 상품 관련 타입 정의

export interface ReitProduct {
  productCode: string;      // 주식종목 번호
  productName: string;      // 상품명
  stockExchange: string;    // KOSPI, KOSDAQ 등
  listingDate: string;      // 상장일
  totalShares?: number;     // 총 발행주식수
  managementFee?: number;   // 운용보수 (%)
  createdAt: string;        // 생성일
  updatedAt: string;        // 수정일
}

export interface ReitProductRequest {
  productCode: string;
  productName: string;
  stockExchange: string;
  listingDate: string;
  managementFee?: number;
}

export interface ReitBuildingMapping {
  mappingId: number;
  productCode: string;
  buildingId: number;
  buildingName?: string;
  buildingAddress?: string;
  inclusionDate: string;
  exclusionDate?: string;
  createdAt: string;
}

export interface ReitBuildingMappingRequest {
  productCode: string;
  buildingId: number;
  inclusionDate?: string;
  exclusionDate?: string;
}

export interface ReitDividend {
  dividendId: number;
  productCode: string;
  dividendYear: number;
  dividendQuarter?: number;
  dividendPeriod: string;   // "2024년 1분기", "2024년 연배당"
  dividendRate: number;     // 배당률 (%)
  dividendAmount: number;   // 주당 배당금
  recordDate?: string;      // 배당 기준일
  paymentDate?: string;     // 배당 지급일
  announcementDate?: string; // 배당 발표일
  createdAt: string;
}

export interface ReitDividendRequest {
  productCode: string;
  dividendYear: number;
  dividendQuarter?: number;
  dividendRate: number;
  dividendAmount: number;
  recordDate?: string;
  paymentDate?: string;
  announcementDate?: string;
}

// Building 타입 (기존에서 재사용)
export interface Building {
  buildingId: number;
  name: string;
  address: string;
  addressDetail?: string;
  zipCode?: string;
  buildingType: string;
  totalFloors: number;
  totalUnits: number;
  status: string;
}


// 주식거래소 옵션
export const STOCK_EXCHANGES = [
  { value: 'KOSPI', label: 'KOSPI' },
  { value: 'KOSDAQ', label: 'KOSDAQ' },
  { value: 'KONEX', label: 'KONEX' }
] as const;

// 분기 옵션
export const QUARTERS = [
  { value: 1, label: '1분기' },
  { value: 2, label: '2분기' },
  { value: 3, label: '3분기' },
  { value: 4, label: '4분기' }
] as const;

// 명시적 export (TypeScript 모듈 해석 문제 해결)
export type {
  ReitProduct,
  ReitProductRequest,
  ReitBuildingMapping,
  ReitBuildingMappingRequest,
  ReitDividend,
  ReitDividendRequest,
  Building
};