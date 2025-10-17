import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { ENV_CONFIG, urlHelpers } from "../src/config/environment";

const API_BASE_URL = urlHelpers.getCurrentApiUrl();
const API_TIMEOUT = ENV_CONFIG.IS_PRODUCTION
  ? ENV_CONFIG.API_TIMEOUT_PROD
  : ENV_CONFIG.API_TIMEOUT_DEV;
const RETRY_ATTEMPTS = ENV_CONFIG.NETWORK_RETRY_ATTEMPTS;
const RETRY_DELAY = ENV_CONFIG.NETWORK_RETRY_DELAY;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "HanaLivingApp/1.0.0",
  },
});

// API 설정 로깅 제거됨

// 재시도 로직을 위한 헬퍼 함수
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 재시도 가능한 오청 오류 확인
const isRetryableError = (error: any) => {
  // 에러 상세 정보 로깅 제거됨

  return (
    error.code === "ECONNABORTED" ||
    error.code === "ENOTFOUND" ||
    error.code === "ECONNREFUSED" ||
    error.message?.includes("timeout") ||
    error.message?.includes("Network Error") ||
    !error.response
  );
};

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("token");
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

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      //
      try {
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("user");
      } catch (storageError) {}
    }
    return Promise.reject(error);
  }
);

const createRetryableAPI = (apiFunction: Function) => {
  return async (...args: any[]) => {
    let lastError: any;

    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        const axiosResponse = await apiFunction(...args);
        const result = axiosResponse.data;

        // 서버 응답 구조 파싱: {success, data, message, timestamp}
        if (result && result.success === true) {
          return result; // 전체 응답 반환 (success, data, message 포함)
        } else if (result && result.data && result.success === true) {
          return result.data; // 실제 데이터만 반환
        } else if (Array.isArray(result)) {
          return result; // 직접 배열로 오는 경우 (기존 호환성)
        } else if (result && result.data && Array.isArray(result.data)) {
          return result.data; // data 속성이 배열인 경우
        } else {
          return result || [];
        }
      } catch (error: any) {
        lastError = error;

        if (attempt < RETRY_ATTEMPTS && isRetryableError(error)) {
          await delay(RETRY_DELAY * attempt);
          continue;
        }

        break;
      }
    }

    throw lastError;
  };
};

export const buildingAPI = {
  getAll: createRetryableAPI(() => apiClient.get("/api/buildings")),
  getById: createRetryableAPI((id: number) =>
    apiClient.get(`/api/buildings/${id}`)
  ),
  getByStatus: createRetryableAPI((status: string) =>
    apiClient.get(`/api/buildings/status/${status}`)
  ),
  search: createRetryableAPI((query: string) =>
    apiClient.get(`/api/buildings/search?q=${encodeURIComponent(query)}`)
  ),
};

export const unitAPI = {
  getAll: createRetryableAPI(() => apiClient.get("/api/units")),
  getById: createRetryableAPI((id: number) =>
    apiClient.get(`/api/units/${id}`)
  ),
  getByBuildingId: createRetryableAPI((buildingId: number) =>
    apiClient.get(`/api/units/building/${buildingId}`)
  ),
  getByStatus: createRetryableAPI((status: string) =>
    apiClient.get(`/api/units/status/${status}`)
  ),
  getAvailable: createRetryableAPI(() =>
    apiClient.get("/api/units/status/AVAILABLE")
  ),
};

export const contractAPI = {
  getAll: createRetryableAPI(() => apiClient.get("/api/contracts")),
  getById: createRetryableAPI((id: number) =>
    apiClient.get(`/api/contracts/${id}`)
  ),
  getByUserId: createRetryableAPI((userId: number) =>
    apiClient.get(`/api/contracts/user/${userId}`)
  ),
  getByStatus: createRetryableAPI((status: string) =>
    apiClient.get(`/api/contracts/status/${status}`)
  ),
  getStats: createRetryableAPI(() => apiClient.get("/api/contracts/stats")),
  create: createRetryableAPI((contract: any) =>
    apiClient.post("/api/contracts", contract)
  ),
  update: createRetryableAPI((id: number, contract: any) =>
    apiClient.put(`/api/contracts/${id}`, contract)
  ),
  renew: createRetryableAPI((id: number) =>
    apiClient.post(`/api/contracts/${id}/renew`)
  ),
  terminate: createRetryableAPI((id: number) =>
    apiClient.post(`/api/contracts/${id}/terminate`)
  ),
  approve: createRetryableAPI((id: number) =>
    apiClient.post(`/api/contracts/${id}/approve`)
  ),
  reject: createRetryableAPI((id: number, reason: string) =>
    apiClient.post(`/api/contracts/${id}/reject`, { reason })
  ),
};

export const paymentAPI = {
  getAll: createRetryableAPI(() => apiClient.get("/api/payments")),
  getById: createRetryableAPI((id: number) =>
    apiClient.get(`/api/payments/${id}`)
  ),
  getByUserId: createRetryableAPI((userId: number) =>
    apiClient.get(`/api/payments/user/${userId}`)
  ),
  getByStatus: createRetryableAPI((status: string) =>
    apiClient.get(`/api/payments/status/${status}`)
  ),
  create: createRetryableAPI((payment: any) =>
    apiClient.post("/api/payments", payment)
  ),
  processPayment: createRetryableAPI((id: number) =>
    apiClient.post(`/api/payments/${id}/process`)
  ),
  getSummary: createRetryableAPI((userId: number) =>
    apiClient.get(`/api/payments/summary/${userId}`)
  ),
};

export const loanAPI = {
  getAll: createRetryableAPI(() => apiClient.get("/api/loans")),
  getById: createRetryableAPI((id: number) =>
    apiClient.get(`/api/loans/${id}`)
  ),
  getByUserId: createRetryableAPI((userId: number) =>
    apiClient.get(`/api/loans/user/${userId}`)
  ),
  getByStatus: createRetryableAPI((status: string) =>
    apiClient.get(`/api/loans/status/${status}`)
  ),
  create: createRetryableAPI((loan: any) => apiClient.post("/api/loans", loan)),
  update: createRetryableAPI((id: number, loan: any) =>
    apiClient.put(`/api/loans/${id}`, loan)
  ),
  getSummary: createRetryableAPI((userId: number) =>
    apiClient.get(`/api/loans/summary/${userId}`)
  ),
  inquiry: createRetryableAPI((inquiryData: any) =>
    apiClient.post("/api/loans/inquiry", inquiryData)
  ),
};

export const reservationAPI = {
  create: createRetryableAPI((reservation: any) =>
    apiClient.post("/api/reservations", reservation)
  ),
  getById: createRetryableAPI((id: number) =>
    apiClient.get(`/api/reservations/${id}`)
  ),
  getByUserId: createRetryableAPI((userId: number) =>
    apiClient.get(`/api/reservations/user/${userId}`)
  ),
  updateStatus: createRetryableAPI(
    (id: number, status: string, note?: string) =>
      apiClient.put(`/api/reservations/${id}/status`, { status, note })
  ),
  cancel: createRetryableAPI((id: number, reason?: string) =>
    apiClient.post(`/api/reservations/${id}/cancel`, { reason })
  ),
};

export const authAPI = {
  register: createRetryableAPI((userData: any) =>
    apiClient.post("/api/auth/register", userData)
  ),
  login: createRetryableAPI((credentials: any) =>
    apiClient.post("/api/auth/login", credentials)
  ),
  logout: createRetryableAPI(() => apiClient.post("/api/auth/logout")),
  refreshToken: createRetryableAPI(() => apiClient.post("/api/auth/refresh")),
  forgotPassword: createRetryableAPI((email: string) =>
    apiClient.post("/api/auth/forgot-password", { email })
  ),
  resetPassword: createRetryableAPI((token: string, newPassword: string) =>
    apiClient.post("/api/auth/reset-password", { token, newPassword })
  ),
  verifyEmail: createRetryableAPI((token: string) =>
    apiClient.post("/api/auth/verify-email", { token })
  ),
  resendVerification: createRetryableAPI((email: string) =>
    apiClient.post("/api/auth/resend-verification", { email })
  ),
};

export const mobileApi = {
  get: createRetryableAPI((url: string) => apiClient.get(url)),
  post: createRetryableAPI((url: string, data?: any) =>
    apiClient.post(url, data)
  ),
  put: createRetryableAPI((url: string, data?: any) =>
    apiClient.put(url, data)
  ),
  delete: createRetryableAPI((url: string) => apiClient.delete(url)),

  getLoanTransferDefaults: createRetryableAPI(() =>
    apiClient.get("/loan/transfer/defaults")
  ),

  getLoanPaymentHistory: createRetryableAPI(() =>
    apiClient.get("/api/loan/payments/history")
  ),

  // 대출 상황 조회 (복수 엔드포인트 시도)
  getLoanStatus: createRetryableAPI(async () => {
    // 여러 가능한 엔드포인트 시도
    const endpoints = [
      "/api/loans/status",
      "/api/loan/status",
      "/api/loans",
      "/api/loan-applications",
    ];

    let lastError;
    for (const endpoint of endpoints) {
      try {
        const result = await apiClient.get(endpoint);
        return result;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }),

  // 대출 승인 정보 조회
  getLoanApproval: createRetryableAPI((applicationId: string) =>
    apiClient.get(`/api/loans/approval/${applicationId}`)
  ),

  // 대출 계약서 생성
  createLoanContract: createRetryableAPI((contractData: any) =>
    apiClient.post("/api/loans/contract", contractData)
  ),

  // 모든 계좌 조회 (은행계좌 + 증권계좌)
  getMyAccounts: createRetryableAPI((userId?: number) => {
    const url =
      userId && userId !== undefined && userId !== null
        ? `/api/my-accounts?userId=${userId}`
        : "/api/my-accounts";
    return apiClient.get(url, { timeout: 30000 }); // 30초 타임아웃
  }),

  // 자동이체 관련 API
  // 자동이체 설정
  setupAutoPayment: createRetryableAPI((setupData: any) =>
    apiClient.post("/api/auto-payment/setup", setupData)
  ),

  // 자동이체 해지
  cancelAutoPayment: createRetryableAPI((contractId?: number) => {
    const params = contractId ? `?contractId=${contractId}` : "";
    return apiClient.delete(`/api/auto-payment/cancel${params}`);
  }),

  // 자동이체 일시정지
  suspendAutoPayment: createRetryableAPI(() =>
    apiClient.put("/api/auto-payment/suspend")
  ),

  // 자동이체 재개
  resumeAutoPayment: createRetryableAPI(() =>
    apiClient.put("/api/auto-payment/resume")
  ),

  // 자동이체 정보 조회
  getAutoPaymentInfo: createRetryableAPI(() =>
    apiClient.get("/api/auto-payment/info")
  ),

  // 자동이체 설정 상태 확인
  getAutoPaymentStatus: createRetryableAPI(() =>
    apiClient.get("/api/auto-payment/status")
  ),

  // 자동이체 실행 이력 조회
  getAutoPaymentHistory: createRetryableAPI(() =>
    apiClient.get("/api/auto-payment/history")
  ),

  // 자동이체 금액 수정
  updateAutoPaymentAmount: createRetryableAPI(
    (updateData: { newAmount: number }) =>
      apiClient.put("/api/auto-payment/amount", updateData)
  ),

  // 자동이체 서비스 상태 확인 (헬스체크)
  checkAutoPaymentHealth: createRetryableAPI(() =>
    apiClient.get("/api/auto-payment/health")
  ),

  // 자동이체 목록 조회 (관리 화면용)
  getAutoPaymentList: createRetryableAPI(() =>
    apiClient.get("/api/auto-payment/payment-list")
  ),

  // 계좌 거래내역 조회 (카테고리별)
  getAccountTransactions: createRetryableAPI(
    (accountNumber: string, category?: string, limit: number = 10) => {
      const params = new URLSearchParams();
      if (category) params.append("category", category);
      params.append("limit", limit.toString());
      const queryString = params.toString();
      return apiClient.get(
        `/api/bank-accounts/${accountNumber}/transactions${
          queryString ? "?" + queryString : ""
        }`
      );
    }
  ),

  // 계좌 모든 거래내역 조회 (최근)
  getRecentAccountTransactions: createRetryableAPI(
    (accountNumber: string, limit: number = 10) => {
      return apiClient.get(
        `/api/bank-accounts/${accountNumber}/transactions/recent?limit=${limit}`
      );
    }
  ),
};

export default apiClient;
