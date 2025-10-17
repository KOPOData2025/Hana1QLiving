import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// 하나은행 API 클라이언트
const HANA_BANK_API_URL = process.env.EXPO_PUBLIC_HANA_BANK_API_URL || 'http://34.47.119.102:8090';
const API_TIMEOUT = 30000;

// 하나은행 API 클라이언트 생성
const bankApiClient = axios.create({
  baseURL: HANA_BANK_API_URL,
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
bankApiClient.interceptors.request.use(
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
bankApiClient.interceptors.response.use(
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
const createRetryableBankAPI = (apiCall: () => Promise<any>) => {
  return async (retryCount = 0): Promise<any> => {
    try {
      const response = await apiCall();
      return response;
    } catch (error) {
      if (retryCount < 3 && isRetryableError(error)) {
        await delay(1000 * (retryCount + 1));
        return createRetryableBankAPI(apiCall)(retryCount + 1);
      }
      throw error;
    }
  };
};

// 하나은행 API 호출 함수들
export const bankApi = {
  // 내 계좌 목록 조회
  getMyAccounts: createRetryableBankAPI(() => bankApiClient.get('/customer/accounts')),

  // 계좌 상세 조회
  getAccountDetail: (accountNumber: string) =>
    createRetryableBankAPI(() => bankApiClient.get(`/customer/accounts/${accountNumber}`)),

  // 내 대출 목록 조회
  getMyLoans: createRetryableBankAPI(() => bankApiClient.get('/customer/loans')),

  // 대출 상품 목록 조회
  getLoanProducts: createRetryableBankAPI(() => bankApiClient.get('/customer/loans/products')),

  // 대출 신청
  applyLoan: (loanData: any) =>
    createRetryableBankAPI(() => bankApiClient.post('/customer/loans/apply', loanData)),

  // 대출 상환
  repayLoan: (repaymentData: any) =>
    createRetryableBankAPI(() => bankApiClient.post('/customer/loans/repay', repaymentData)),

  // 계좌 생성
  createAccount: (accountData: any) =>
    createRetryableBankAPI(() => bankApiClient.post('/customer/accounts', accountData)),

  // 계좌 비밀번호 검증
  validateAccountPassword: (accountNumber: string, password: string) =>
    createRetryableBankAPI(() =>
      bankApiClient.post(`/customer/accounts/${accountNumber}/validate?password=${encodeURIComponent(password)}`)
    ),
};

export default bankApi;