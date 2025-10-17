// 건물 관련 타입 정의
export interface Building {
  id: number;
  name: string;
  address: string;
  addressDetail?: string;
  zipCode?: string;
  buildingType: string;
  totalFloors: number;
  totalUnits: number;
  status: string;
  images: string[];
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: number;
  buildingId: number;
  unitNumber: string;
  floor: number;
  type: string;
  size: number;
  monthlyRent: number;
  deposit: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  createdAt: string;
  updatedAt: string;
  building?: Building; // 선택적 건물 정보
}

// API 응답 타입
export interface GetBuildingsResponse {
  success: boolean;
  data: Building[];
  message: string;
}

export interface GetUnitsResponse {
  success: boolean;
  data: Unit[];
  message: string;
}
