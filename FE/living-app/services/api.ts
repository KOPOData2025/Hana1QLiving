import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { urlHelpers } from '../src/config/environment';

// API 클라이언트 설정
const apiClient = axios.create({
  baseURL: urlHelpers.getCurrentApiUrl(),
  timeout: 60000, // 60초 - 시뮬레이션 등 시간이 오래 걸리는 요청 대응
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
apiClient.interceptors.request.use(
  async (config) => {
    // AsyncStorage에서 토큰 가져오기 (investmentApi와 동일한 키 사용)
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
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 기본 API 함수들
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    apiClient.post('/api/auth/login', credentials),
  
  register: (userData: { email: string; password: string; name: string }) =>
    apiClient.post('/api/auth/register', userData),
  
  verifyEmail: (token: string) =>
    apiClient.post('/api/auth/verify-email', { token }),
};

export const userAPI = {
  getProfile: () => apiClient.get('/api/user/profile'),
  
  updateProfile: (profileData: any) =>
    apiClient.put('/api/user/profile', profileData),
};

export const buildingAPI = {
  getBuildings: () => apiClient.get('/api/buildings'),

  getBuildingDetail: (id: string) =>
    apiClient.get(`/api/buildings/${id}`),

  searchBuildings: (query: string) =>
    apiClient.get(`/api/buildings/search?q=${query}`),

  getReitsByBuilding: (buildingId: number) =>
    apiClient.get(`/api/buildings/${buildingId}/reits`),
};

export const financialAPI = {
  getFinancialDashboard: (buildingId: number) =>
    apiClient.get(`/api/financial/dashboard?buildingId=${buildingId}`),

  getFinancialSummary: (buildingId: number) =>
    apiClient.get(`/api/financial/summary?buildingId=${buildingId}`),

  getMonthlyTrend: (buildingId: number) =>
    apiClient.get(`/api/financial/monthly-trend?buildingId=${buildingId}`),
};

export const unitAPI = {
  getUnitsByBuilding: (buildingId: number) =>
    apiClient.get(`/api/units/building/${buildingId}`),
};

export const accountAPI = {
  getMyAccounts: () => apiClient.get('/api/accounts/my'),

  getAccountTransactions: (accountNumber: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const queryString = params.toString();
    return apiClient.get(`/api/payments/bank-transactions/${accountNumber}${queryString ? '?' + queryString : ''}`);
  },

  getRecentTransactions: (accountNumber: string, limit?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    const queryString = params.toString();
    return apiClient.get(`/api/payments/bank-transactions/${accountNumber}/recent${queryString ? '?' + queryString : ''}`);
  },

  getTransactionsByCategory: (accountNumber: string, category: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    params.append('category', category);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const queryString = params.toString();
    return apiClient.get(`/api/payments/bank-transactions/${accountNumber}/by-category?${queryString}`);
  },
};

// 대출 상황 조회
export const loanAPI = {
  getMyLoanStatus: async (): Promise<LoanStatusResponse> => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL_DEV!}/api/loan/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  },
};

// 대출 실행 관련 API
export const loanExecutionAPI = {
  // 대출 실행 정보 조회
  getExecutionInfo: (loanId: string, userId: string) =>
    apiClient.get(`/api/loan-execution/${loanId}`, {
      headers: { userId }
    }),
  
  // 대출 실행 정보 설정
  setExecutionInfo: (loanId: string, userId: string, data: any) =>
    apiClient.post(`/api/loan-execution/${loanId}/set-info`, data, {
      headers: { userId }
    }),
  
  // 대출 실행
  executeLoan: (loanId: string, userId: string) =>
    apiClient.post(`/api/loan-execution/${loanId}/execute`, {}, {
      headers: { userId }
    }),
  
  // 사용자의 실행 가능한 대출 목록
  getUserExecutableLoans: (userId: string) =>
    apiClient.get(`/api/loan-execution/user/${userId}`, {
      headers: { userId }
    }),
};

export default apiClient;
