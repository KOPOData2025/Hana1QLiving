import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { ENV_CONFIG, urlHelpers } from '../src/config/environment';

// API 설정
const API_BASE_URL = urlHelpers.getCurrentApiUrl();
const API_TIMEOUT = ENV_CONFIG.IS_PRODUCTION ? ENV_CONFIG.API_TIMEOUT_PROD : ENV_CONFIG.API_TIMEOUT_DEV;

// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'HanaLivingApp/1.0.0',
  },
});

// 요청 인터셉터 - 토큰 추가
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {}
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 또는 인증 실패
      AsyncStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

// Contract API 인터페이스
export interface Contract {
  id: number;
  userId: number;
  residentName: string;
  buildingName: string;
  unitNumber: string;
  monthlyRent: number;
  monthlyManagementFee: number;
  paymentDay?: number;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

class ContractAPI {
  /**
   * 사용자별 계약 목록 조회
   */
  async getByUserId(userId: number): Promise<ApiResponse<Contract[]>> {
    try {
      const url = `/api/contracts/user/${userId}`;

      const response = await apiClient.get(url);
      
      return {
        success: true,
        data: response.data,
        message: '계약 목록 조회 성공'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '계약 목록 조회에 실패했습니다.',
        data: []
      };
    }
  }

  /**
   * 계약 상세 조회
   */
  async getById(contractId: number): Promise<ApiResponse<Contract>> {
    try {
      const response = await apiClient.get(`/api/contracts/${contractId}`);
      
      return {
        success: true,
        data: response.data,
        message: '계약 조회 성공'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '계약 조회에 실패했습니다.'
      };
    }
  }

  /**
   * 전체 계약 목록 조회 (관리자용)
   */
  async getAll(): Promise<ApiResponse<Contract[]>> {
    try {
      const response = await apiClient.get('/api/contracts');
      
      return {
        success: true,
        data: response.data,
        message: '전체 계약 목록 조회 성공'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '계약 목록 조회에 실패했습니다.',
        data: []
      };
    }
  }

  /**
   * 계약 생성
   */
  async create(contractData: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Contract>> {
    try {
      const response = await apiClient.post('/api/contracts', contractData);
      
      return {
        success: true,
        data: response.data,
        message: '계약 생성 성공'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '계약 생성에 실패했습니다.'
      };
    }
  }

  /**
   * 계약 수정
   */
  async update(contractId: number, contractData: Partial<Contract>): Promise<ApiResponse<Contract>> {
    try {
      const response = await apiClient.put(`/api/contracts/${contractId}`, contractData);
      
      return {
        success: true,
        data: response.data,
        message: '계약 수정 성공'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '계약 수정에 실패했습니다.'
      };
    }
  }

  /**
   * 계약 삭제
   */
  async delete(contractId: number): Promise<ApiResponse<void>> {
    try {
      await apiClient.delete(`/api/contracts/${contractId}`);
      
      return {
        success: true,
        message: '계약 삭제 성공'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '계약 삭제에 실패했습니다.'
      };
    }
  }

  /**
   * 계약 상태 변경
   */
  async updateStatus(contractId: number, status: string): Promise<ApiResponse<Contract>> {
    try {
      const response = await apiClient.patch(`/api/contracts/${contractId}/status`, { status });
      
      return {
        success: true,
        data: response.data,
        message: '계약 상태 변경 성공'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '계약 상태 변경에 실패했습니다.'
      };
    }
  }
}

// 싱글톤 인스턴스 생성
export const contractAPI = new ContractAPI();
export default contractAPI;