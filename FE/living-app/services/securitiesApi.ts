import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// 하나증권 API 클라이언트
const HANA_SECURITIES_API_URL = process.env.EXPO_PUBLIC_HANA_SECURITIES_API_URL || 'http://192.168.217.248:8093';
const HANA_SECURITIES_WS_URL = process.env.EXPO_PUBLIC_HANA_SECURITIES_WS_URL || 'ws://192.168.217.248:8093/ws/investment';
const API_TIMEOUT = 30000;

// 하나증권 API 클라이언트 생성
const securitiesApiClient = axios.create({
  baseURL: HANA_SECURITIES_API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'HanaLivingApp/1.0.0',
  },
});

// 재시도 로직을 위한 헬퍼 함수
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 재시도 가능한 요청 오류 확인
const isRetryableError = (error: any) => {
  return (
    error.code === 'ECONNABORTED' ||
    error.code === 'ENOTFOUND' ||
    error.code === 'ECONNREFUSED' ||
    error.message?.includes('timeout') ||
    error.message?.includes('Network Error') ||
    !error.response
  );
};

// 요청 인터셉터 - 토큰 추가
securitiesApiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {}
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터
securitiesApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료시 로그아웃 처리
      AsyncStorage.multiRemove(['token', 'user']);
    }
    return Promise.reject(error);
  }
);

// 재시도 가능한 API 호출 헬퍼
const createRetryableSecuritiesAPI = (apiCall: () => Promise<any>) => {
  return async (retryCount = 0): Promise<any> => {
    try {
      const response = await apiCall();
      return response;
    } catch (error) {
      if (retryCount < 3 && isRetryableError(error)) {
        await delay(1000 * (retryCount + 1));
        return createRetryableSecuritiesAPI(apiCall)(retryCount + 1);
      }
      throw error;
    }
  };
};

// 하나증권 API 호출 함수들
export const securitiesApi = {
  // 투자 상품 목록 조회
  getInvestmentProducts: createRetryableSecuritiesAPI(() => securitiesApiClient.get('/api/investment/products')),

  // 내 투자 포트폴리오 조회
  getMyPortfolio: createRetryableSecuritiesAPI(() => securitiesApiClient.get('/api/investment/portfolio')),

  // 주식 주문
  placeOrder: (orderData: any) =>
    createRetryableSecuritiesAPI(() => securitiesApiClient.post('/api/investment/orders', orderData)),

  // 주문 내역 조회
  getOrderHistory: createRetryableSecuritiesAPI(() => securitiesApiClient.get('/api/investment/orders')),

  // 시장 데이터 조회
  getMarketData: (symbol: string) =>
    createRetryableSecuritiesAPI(() => securitiesApiClient.get(`/api/investment/market/${symbol}`)),

  // 리츠 상품 조회
  getReitsProducts: createRetryableSecuritiesAPI(() => securitiesApiClient.get('/api/investment/reits')),

  // WebSocket URL 제공
  getWebSocketUrl: () => HANA_SECURITIES_WS_URL,
};

export default securitiesApi;