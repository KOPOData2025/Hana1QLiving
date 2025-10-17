import axios from 'axios';
import type { AxiosResponse } from 'axios';

// API 기본 URL - 환경변수 또는 기본값 사용
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8091/api';

// API 응답 타입 정의
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// 테스트 결과 타입 정의
export interface TestResult {
  test_id: number;
  question: string;
  generated_sql: string;
  success: boolean;
  error?: string;
  tables?: string[];
  difficulty?: string;
  category?: string;
}

export interface TestSummary {
  total_tests: number;
  success_tests: number;
  failed_tests: number;
  success_rate: number;
  basic_total?: number;
  basic_success?: number;
  basic_rate?: number;
  complex_total?: number;
  complex_success?: number;
  complex_rate?: number;
  overall_total?: number;
  overall_success?: number;
  overall_rate?: number;
}

export interface TestResponse {
  summary: TestSummary;
  detailed_results: TestResult[];
  test_type?: string;
  categories?: Record<string, string>;
  status: string;
  timestamp: string;
}

export interface TestCategories {
  basic: {
    name: string;
    description: string;
  };
  complex: {
    name: string;
    description: string;
    categories: Record<string, string>;
  };
}

export interface TestSystemStatus {
  status: string;
  vector_db_status: string;
  test_files_status: {
    schema_tester: boolean;
    api_tester: boolean;
    monitor: boolean;
  };
  timestamp: string;
}


class SQLTestService {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/sql-test`;
  }

  /**
   * 기본 SQL 테스트 실행
   */
  async runBasicTest(): Promise<TestResponse> {
    try {
      const response: AxiosResponse<ApiResponse<TestResponse>> = await axios.post(
        `${this.baseURL}/run-basic`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('기본 SQL 테스트 실행 실패:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 복잡한 SQL 테스트 실행
   */
  async runComplexTest(): Promise<TestResponse> {
    try {
      const response: AxiosResponse<ApiResponse<TestResponse>> = await axios.post(
        `${this.baseURL}/run-complex`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('복잡한 SQL 테스트 실행 실패:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 전체 SQL 테스트 실행 (기본 + 복잡한)
   */
  async runAllTests(): Promise<TestResponse> {
    try {
      const response: AxiosResponse<ApiResponse<TestResponse>> = await axios.post(
        `${this.baseURL}/run-all`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('전체 SQL 테스트 실행 실패:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 포괄적 테스트 실행 (스키마 + 실행 검증)
   */
  async runComprehensiveTest(): Promise<TestResponse> {
    try {
      const response: AxiosResponse<ApiResponse<TestResponse>> = await axios.post(
        `${this.baseURL}/run-comprehensive`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('포괄적 SQL 테스트 실행 실패:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 테스트 카테고리 조회
   */
  async getTestCategories(): Promise<TestCategories> {
    try {
      const response: AxiosResponse<ApiResponse<TestCategories>> = await axios.get(
        `${this.baseURL}/categories`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('테스트 카테고리 조회 실패:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 테스트 시스템 상태 조회
   */
  async getTestSystemStatus(): Promise<TestSystemStatus> {
    try {
      const response: AxiosResponse<ApiResponse<TestSystemStatus>> = await axios.get(
        `${this.baseURL}/status`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('테스트 시스템 상태 조회 실패:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 테스트 진행 상황 조회
   */
  async getTestProgress(testId: string): Promise<any> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await axios.get(
        `${this.baseURL}/progress/${testId}`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('테스트 진행 상황 조회 실패:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 에러 처리 헬퍼 메서드
   */
  private handleError(error: any): Error {
    if (error.response) {
      // 서버에서 응답이 왔지만 에러 상태코드
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText || '서버 오류가 발생했습니다';

      switch (status) {
        case 400:
          return new Error(`잘못된 요청입니다: ${message}`);
        case 401:
          return new Error('인증이 필요합니다');
        case 403:
          return new Error('권한이 없습니다');
        case 404:
          return new Error('요청한 리소스를 찾을 수 없습니다');
        case 500:
          return new Error(`서버 내부 오류: ${message}`);
        case 503:
          return new Error('서비스를 사용할 수 없습니다. 잠시 후 다시 시도해주세요');
        default:
          return new Error(`HTTP ${status}: ${message}`);
      }
    } else if (error.request) {
      // 요청은 보냈지만 응답을 받지 못함
      return new Error('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요');
    } else {
      // 요청 설정 중에 오류 발생
      return new Error(error.message || '알 수 없는 오류가 발생했습니다');
    }
  }

}

// 싱글톤 인스턴스 생성 및 내보내기
export const sqlTestService = new SQLTestService();
export default sqlTestService;