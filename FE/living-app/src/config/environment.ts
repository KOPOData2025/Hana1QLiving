// 포트 정의
const PORTS = {
  MAIN_API: 8091, // 하나원큐리빙 메인 API
  INVESTMENT_API: 8091, // 투자 API
  HANABANK_API: 8090, // 하나은행 API
  WEBSOCKET: 8091, // WebSocket
};

// URL 생성 헬퍼 함수
const createApiUrl = (ip: string, port: number) => `http://${ip}:${port}`;
const createWsUrl = (ip: string, port: number) => `ws://${ip}:${port}`;

// 환경변수 기반 설정
export const ENV_CONFIG = {
  // IP 설정 (.env의 BASE_IP에서 가져옴)
  BASE_IP: process.env.EXPO_PUBLIC_BASE_IP || "34.63.8.58",

  // API URLs (BASE_IP 기반으로 자동 생성)
  get API_BASE_URL_DEV() {
    return createApiUrl(this.BASE_IP, PORTS.MAIN_API);
  },

  get API_BASE_URL_PROD() {
    return (
      process.env.EXPO_PUBLIC_API_BASE_URL_PROD ||
      "https://your-production-api.com"
    );
  },

  get INVESTMENT_API_URL() {
    return createApiUrl(this.BASE_IP, PORTS.INVESTMENT_API);
  },

  get WS_BASE_URL() {
    return createWsUrl(this.BASE_IP, PORTS.WEBSOCKET);
  },

  get HANABANK_API_URL() {
    return createApiUrl(this.BASE_IP, PORTS.HANABANK_API);
  },

  // API 설정
  API_TIMEOUT_DEV: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT_DEV || "10000"),
  API_TIMEOUT_PROD: parseInt(
    process.env.EXPO_PUBLIC_API_TIMEOUT_PROD || "15000"
  ),

  // 앱 설정
  APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || "하나원큐리빙",
  APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
  APP_BUILD_NUMBER: parseInt(process.env.EXPO_PUBLIC_APP_BUILD_NUMBER || "1"),

  // 네트워크 설정
  NETWORK_RETRY_ATTEMPTS: parseInt(
    process.env.EXPO_PUBLIC_NETWORK_RETRY_ATTEMPTS || "1"
  ),
  NETWORK_RETRY_DELAY: parseInt(
    process.env.EXPO_PUBLIC_NETWORK_RETRY_DELAY || "100"
  ),
  NETWORK_CONNECTION_TIMEOUT: parseInt(
    process.env.EXPO_PUBLIC_NETWORK_CONNECTION_TIMEOUT || "10000"
  ),

  // 개발 환경 설정
  NODE_ENV: process.env.NODE_ENV || "development",
  DEBUG_MODE: process.env.EXPO_PUBLIC_DEBUG_MODE === "true",

  // 환경별 헬퍼
  IS_DEVELOPMENT: process.env.NODE_ENV === "development",
  IS_PRODUCTION: process.env.NODE_ENV === "production",
};

// URL 생성 헬퍼 함수들
export const urlHelpers = {
  // 커스텀 포트로 API URL 생성
  getApiUrl: (port: number) => createApiUrl(ENV_CONFIG.BASE_IP, port),
  getWsUrl: (port: number) => createWsUrl(ENV_CONFIG.BASE_IP, port),

  // 현재 환경에 맞는 API URL 반환
  getCurrentApiUrl: () => {
    return ENV_CONFIG.IS_PRODUCTION
      ? ENV_CONFIG.API_BASE_URL_PROD
      : ENV_CONFIG.API_BASE_URL_DEV;
  },

  // 현재 환경에 맞는 타임아웃 반환
  getCurrentTimeout: () => {
    return ENV_CONFIG.IS_PRODUCTION
      ? ENV_CONFIG.API_TIMEOUT_PROD
      : ENV_CONFIG.API_TIMEOUT_DEV;
  },
};
