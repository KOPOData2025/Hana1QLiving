// 건물 및 호실 관리 API 서비스
import axios from 'axios';
import { API_CONFIG, createApiUrl, extractApiData, createErrorMessage } from '../config/api';
import type { 
  Building, 
  Unit, 
  GetBuildingsResponse, 
  GetUnitsResponse 
} from '../types/building';

/**
 * 모든 건물 목록 조회
 */
export const getBuildings = async (token?: string): Promise<Building[]> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.get<GetBuildingsResponse>(
      createApiUrl(API_CONFIG.ENDPOINTS.BUILDINGS),
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 특정 건물 조회
 */
export const getBuildingById = async (
  id: number, 
  token?: string
): Promise<Building> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.get<{ success: boolean; data: Building; message: string }>(
      createApiUrl(API_CONFIG.ENDPOINTS.BUILDINGS, id),
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 모든 호실 목록 조회
 */
export const getUnits = async (token?: string): Promise<Unit[]> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.get<GetUnitsResponse>(
      createApiUrl(API_CONFIG.ENDPOINTS.UNITS),
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 특정 호실 조회
 */
export const getUnitById = async (
  id: number, 
  token?: string
): Promise<Unit> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.get<{ success: boolean; data: Unit; message: string }>(
      createApiUrl(API_CONFIG.ENDPOINTS.UNITS, id),
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 특정 건물의 호실 목록 조회
 */
export const getUnitsByBuildingId = async (
  buildingId: number, 
  token?: string
): Promise<Unit[]> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.get<GetUnitsResponse>(
      `${createApiUrl(API_CONFIG.ENDPOINTS.UNITS)}?buildingId=${buildingId}`,
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 특정 건물의 사용 가능한 호실 목록 조회 (비어있는 호실만)
 */
export const getAvailableUnitsByBuildingId = async (
  buildingId: number, 
  token?: string
): Promise<Unit[]> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let finalUnits: Unit[] = [];

    // 먼저 status=AVAILABLE 파라미터로 시도
    try {
      const response = await axios.get<GetUnitsResponse>(
        `${createApiUrl(API_CONFIG.ENDPOINTS.UNITS)}?buildingId=${buildingId}&status=AVAILABLE`,
        { headers }
      );
      
      finalUnits = extractApiData(response);
      
    } catch (statusError) {
      // status 파라미터를 지원하지 않으면 전체 호실 조회 후 필터링
      const response = await axios.get<GetUnitsResponse>(
        `${createApiUrl(API_CONFIG.ENDPOINTS.UNITS)}?buildingId=${buildingId}`,
        { headers }
      );
      
      const allUnits = extractApiData(response);
      
      // AVAILABLE 상태이면서 해당 건물의 호실만 필터링
      finalUnits = allUnits.filter(unit => {
        const isAvailable = unit.status === 'AVAILABLE' || unit.status === 'available';
        const isCorrectBuilding = unit.buildingId === buildingId;
        return isAvailable && isCorrectBuilding;
      });
    }
    
    return finalUnits;
    
  } catch (error: any) {
    console.error(`건물 ID ${buildingId}의 사용 가능한 호실 목록 조회 실패:`, error);
    throw new Error(createErrorMessage(error));
  }
};
