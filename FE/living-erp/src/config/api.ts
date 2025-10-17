// 백엔드 API 설정
import { ENV_CONFIG } from './environment';

export const API_CONFIG = {
  // 백엔드 서버 기본 URL
  BASE_URL: ENV_CONFIG.API_BASE_URL,
  AI_BASE_URL: ENV_CONFIG.API_BASE_URL, // 하나원큐리빙 BE를 경유하도록 변경

  // API 엔드포인트
  ENDPOINTS: {
    BUILDINGS: '/api/buildings',
    UNITS: '/api/units',
    USERS: '/api/users',
    CONTRACTS: '/api/contracts',
    PAYMENTS: '/api/payments',
    LOANS: '/api/loans',
    RESERVATIONS: '/api/reservations', // 방문 예약 엔드포인트 추가
    AI_QUERY: '/api/ai/query', // 하나원큐리빙 BE의 AI 프록시 엔드포인트
    AI_VECTOR_SYNC: '/api/ai/vector-sync', // 벡터DB 수동 동기화 엔드포인트
  },
  
  // API 응답 구조
  RESPONSE_STRUCTURE: {
    SUCCESS: 'success',
    DATA: 'data',
    MESSAGE: 'message',
    TIMESTAMP: 'timestamp',
  },
  
  // HTTP 상태 코드
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },
};

// AI 쿼리 관련 타입 정의
export interface AIQueryRequest {
  userInput: string;
  mode?: 'AUTO' | 'BASIC' | 'DATA';
  contextHints?: string[];
  topK?: number;
  uiCapabilities?: {
    supportsCitations: boolean;
  };
  debug?: boolean;
}

export interface AIQueryResponse {
  id: string;
  route: 'BASIC' | 'DATA';
  text: string;
  citations: Array<{
    title: string;
    url: string | null;
    sourceType: 'FAQ' | 'TERM' | 'CONF' | 'BQ' | 'OTHER';
  }>;
  followUps: string[] | null;
  safety: {
    allowed: boolean;
    reason: string;
  };
  metrics: {
    latencyMs: number;
    tokens: {
      in: number;
      out: number;
    };
  };
  sql_execution?: {
    sql: string;
    execution_result: {
      success: boolean;
      data: any[];
      row_count: number;
      execution_time_ms: number;
      message: string;
    };
    analysis: {
      query_type: string;
      tables: string[];
      grouping: string[];
      aggregations: string[];
    };
  };
}

// API URL 생성 헬퍼 함수
export const createApiUrl = (endpoint: string, id?: string | number): string => {
  const baseUrl = API_CONFIG.BASE_URL;
  if (id !== undefined) {
    return `${baseUrl}${endpoint}/${id}`;
  }
  return `${baseUrl}${endpoint}`;
};

// API 응답 데이터 추출 헬퍼 함수
export const extractApiData = (response: any): any => {
  if (response.data && response.data.success && response.data.data !== undefined) {
    return response.data.data;
  }
  if (Array.isArray(response.data)) {
    return response.data;
  }
  if (response.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  // 응답 데이터가 없거나 잘못된 형태일 경우 빈 배열 반환
  return response.data || [];
};

// 에러 메시지 생성 헬퍼 함수
export const createErrorMessage = (error: any): string => {
  if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
    return '백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.';
  }
  
  if (error.response?.status === 404) {
    return 'API 엔드포인트를 찾을 수 없습니다.';
  }
  
  if (error.response?.status === 500) {
    return '서버 내부 오류가 발생했습니다.';
  }
  
  return `요청 처리 중 오류가 발생했습니다. (${error.response?.status || '알 수 없음'})`;
};

// AI 쿼리 API 호출 함수
export const callAIQuery = async (
  request: AIQueryRequest,
  token: string
): Promise<AIQueryResponse> => {
  const response = await fetch(`${API_CONFIG.AI_BASE_URL}${API_CONFIG.ENDPOINTS.AI_QUERY}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
};

// 벡터DB 수동 동기화 API 호출 함수
export const callVectorSync = async (token: string): Promise<{ success: boolean; message: string; requestId?: string }> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AI_VECTOR_SYNC}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
};

// AI 쿼리 모드 옵션
export const AI_QUERY_MODES = [
  { value: 'AUTO', label: '자동 모드' },
  { value: 'BASIC', label: '기본 모드' },
  { value: 'DATA', label: '데이터 모드' },
] as const;

// AI 쿼리 소스 타입별 색상 매핑
export const AI_SOURCE_TYPE_COLORS = {
  FAQ: '#10b981',
  TERM: '#3b82f6',
  CONF: '#8b5cf6',
  BQ: '#f59e0b',
  OTHER: '#64748b',
} as const;

// AI 쿼리 소스 타입별 라벨
export const AI_SOURCE_TYPE_LABELS = {
  FAQ: '자주 묻는 질문',
  TERM: '용어집',
  CONF: '설정',
  BQ: '빅쿼리',
  OTHER: '기타',
} as const;

// SQL 쿼리 타입별 색상 매핑
export const SQL_QUERY_TYPE_COLORS = {
  SELECT: '#10b981',
  INSERT: '#3b82f6',
  UPDATE: '#f59e0b',
  DELETE: '#ef4444',
  CREATE: '#8b5cf6',
  DROP: '#dc2626',
  ALTER: '#7c3aed',
} as const;
