// 새로운 environment 시스템에서 가져옴
import { ENV_CONFIG } from '../src/config/environment';
const API_BASE_URL_DEV = ENV_CONFIG.API_BASE_URL_DEV;
const API_BASE_URL_PROD = ENV_CONFIG.API_BASE_URL_PROD;
const API_TIMEOUT_DEV = process.env.EXPO_PUBLIC_API_TIMEOUT_DEV!;
const API_TIMEOUT_PROD = process.env.EXPO_PUBLIC_API_TIMEOUT_PROD!;
const APP_BUILD_NUMBER = process.env.EXPO_PUBLIC_APP_BUILD_NUMBER!;
const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME!;
const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION!;
const EXPO_PUBLIC_DEBUG_MODE = process.env.EXPO_PUBLIC_DEBUG_MODE!;
const NETWORK_CONNECTION_TIMEOUT = process.env.EXPO_PUBLIC_NETWORK_CONNECTION_TIMEOUT!;
const NETWORK_RETRY_ATTEMPTS = process.env.EXPO_PUBLIC_NETWORK_RETRY_ATTEMPTS!;
const NETWORK_RETRY_DELAY = process.env.EXPO_PUBLIC_NETWORK_RETRY_DELAY!;
const NODE_ENV = process.env.NODE_ENV!;

// API 설정
export const API_CONFIG = {
  // 개발 환경 설정
  DEVELOPMENT: {
    BASE_URL: API_BASE_URL_DEV,
    TIMEOUT: parseInt(API_TIMEOUT_DEV),
  },
  
  // 프로덕션 환경 설정
  PRODUCTION: {
    BASE_URL: API_BASE_URL_PROD,
    TIMEOUT: parseInt(API_TIMEOUT_PROD),
  },
  
  // 현재 환경에 따른 설정 반환
  get current() {
    return __DEV__ ? this.DEVELOPMENT : this.PRODUCTION;
  },
  
  // API 엔드포인트
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      LOGOUT: '/api/auth/logout',
      REFRESH: '/api/auth/refresh',
    },
    USER: {
      PROFILE: '/api/user/profile',
      UPDATE: '/api/user/update',
    },
  },
};

// 네트워크 설정
export const NETWORK_CONFIG = {
  RETRY_ATTEMPTS: parseInt(NETWORK_RETRY_ATTEMPTS),
  RETRY_DELAY: parseInt(NETWORK_RETRY_DELAY),
  CONNECTION_TIMEOUT: parseInt(NETWORK_CONNECTION_TIMEOUT),
};

// 앱 설정
export const APP_CONFIG = {
  NAME: APP_NAME,
  VERSION: APP_VERSION,
  BUILD_NUMBER: APP_BUILD_NUMBER,
  NODE_ENV: NODE_ENV,
  DEBUG_MODE: EXPO_PUBLIC_DEBUG_MODE === 'true',
};

// 환경 정보 로깅 제거됨
