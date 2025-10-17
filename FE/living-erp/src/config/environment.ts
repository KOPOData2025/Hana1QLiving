// 환경 설정 - .env의 BASE_IP 하나만 수정하면 모든 URL이 자동 생성됩니다!

// 포트 정의 (.env에서 가져옴)
const PORTS = {
  MAIN_API: parseInt(import.meta.env.VITE_MAIN_API_PORT || '8091'),           // 하나원큐리빙 메인 API
  INVESTMENT_API: parseInt(import.meta.env.VITE_INVESTMENT_API_PORT || '8092'),     // 투자 API (HanaOneQLivingInvestment)
  HANABANK_API: parseInt(import.meta.env.VITE_HANABANK_API_PORT || '8090'),      // 하나은행 API
  AI_ORCHESTRATION: parseInt(import.meta.env.VITE_AI_ORCHESTRATION_PORT || '8095'),   // AI Orchestration 서버
  WEBSOCKET: parseInt(import.meta.env.VITE_WEBSOCKET_PORT || '8094')          // WebSocket
};

// URL 생성 헬퍼 함수
const createApiUrl = (ip: string, port: number) => `http://${ip}:${port}`;
const createWsUrl = (ip: string, port: number) => `ws://${ip}:${port}`;

export const ENV_CONFIG = {
  // IP 설정 (.env의 BASE_IP에서 가져옴)
  BASE_IP: import.meta.env.VITE_BASE_IP || '192.168.217.248',

  // 개발 환경 여부 판단: VITE_BASE_IP가 설정되어 있으면 개발 환경
  get IS_DEV_ENV() {
    return !!import.meta.env.VITE_BASE_IP;
  },

  // API 설정 - VITE_BASE_IP가 있으면 개발 환경으로 판단하고 해당 IP 사용
  get API_BASE_URL() {
    // VITE_BASE_IP가 설정되어 있으면 개발 환경 -> BASE_IP 사용
    if (import.meta.env.VITE_BASE_IP) {
      return createApiUrl(this.BASE_IP, PORTS.MAIN_API);
    }

    // VITE_BASE_IP가 없으면 배포 환경 -> VITE_API_URL 사용
    const apiUrl = import.meta.env.API_URL || import.meta.env.VITE_API_URL;
    if (apiUrl) {
      return apiUrl;
    }

    // 둘 다 없으면 기본값 사용 (fallback)
    return createApiUrl(this.BASE_IP, PORTS.MAIN_API);
  },

  get AI_API_BASE_URL() {
    // VITE_BASE_IP가 설정되어 있으면 개발 환경 -> BASE_IP 사용
    if (import.meta.env.VITE_BASE_IP) {
      return createApiUrl(this.BASE_IP, PORTS.AI_ORCHESTRATION);
    }

    // VITE_BASE_IP가 없으면 배포 환경 -> VITE_API_URL 사용
    const apiUrl = import.meta.env.API_URL || import.meta.env.VITE_API_URL;
    if (apiUrl) {
      return apiUrl; // 프로덕션에서는 같은 도메인 사용
    }

    // 둘 다 없으면 기본값 사용 (fallback)
    return createApiUrl(this.BASE_IP, PORTS.AI_ORCHESTRATION);
  },
  
  // 애플리케이션 설정
  APP_TITLE: import.meta.env.VITE_APP_TITLE || '하나원큐리빙 ERP',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',  
  
  // 개발 환경 설정
  DEV_MODE: import.meta.env.VITE_DEV_MODE === 'true',
  ENABLE_LOGGING: import.meta.env.VITE_ENABLE_LOGGING === 'true',
  
  // 테스트 데이터 설정
  ENABLE_TEST_DATA: import.meta.env.VITE_ENABLE_TEST_DATA === 'true',
  
  // 네트워크 설정
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000'),
  RETRY_ATTEMPTS: parseInt(import.meta.env.VITE_RETRY_ATTEMPTS || '1'),
  RETRY_DELAY: parseInt(import.meta.env.VITE_RETRY_DELAY || '100'),
  
  // 환경 정보
  NODE_ENV: import.meta.env.MODE,
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
};

// URL 생성 헬퍼 함수들
export const urlHelpers = {
  // 커스텀 포트로 API URL 생성
  getApiUrl: (port: number) => createApiUrl(ENV_CONFIG.BASE_IP, port),
  getWsUrl: (port: number) => createWsUrl(ENV_CONFIG.BASE_IP, port),
  
  // 특정 서비스 URL 생성
  getMainApiUrl: () => createApiUrl(ENV_CONFIG.BASE_IP, PORTS.MAIN_API),
  getInvestmentApiUrl: () => createApiUrl(ENV_CONFIG.BASE_IP, PORTS.INVESTMENT_API),
  getHanaBankApiUrl: () => createApiUrl(ENV_CONFIG.BASE_IP, PORTS.HANABANK_API),
  getAiOrchestrationUrl: () => createApiUrl(ENV_CONFIG.BASE_IP, PORTS.AI_ORCHESTRATION),
};

// 환경별 로깅 설정
export const logger = {
  log: (message: string, ...args: any[]) => {
    if (ENV_CONFIG.ENABLE_LOGGING) {
      console.log(`[${ENV_CONFIG.APP_TITLE}]`, message, ...args);
    }
  },
  
  error: (message: string, ...args: any[]) => {
    if (ENV_CONFIG.ENABLE_LOGGING) {
      console.error(`[${ENV_CONFIG.APP_TITLE}]`, message, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (ENV_CONFIG.ENABLE_LOGGING) {
      console.warn(`[${ENV_CONFIG.APP_TITLE}]`, message, ...args);
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (ENV_CONFIG.ENABLE_LOGGING) {
      console.info(`[${ENV_CONFIG.APP_TITLE}]`, message, ...args);
    }
  },
};
