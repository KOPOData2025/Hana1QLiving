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
  },
});

export interface SendSmsRequest {
  phoneNumber: string;
}

export interface VerifySmsRequest {
  phoneNumber: string;
  code: string;
}

export interface SmsResponse {
  success: boolean;
  message: string;
}

/**
 * SMS 인증 API
 */
export const smsAPI = {
  /**
   * 인증번호 발송
   * @param phoneNumber 휴대폰 번호 (하이픈 포함 가능)
   * @returns 발송 결과
   */
  sendVerificationCode: async (phoneNumber: string): Promise<SmsResponse> => {
    try {
      const response = await apiClient.post<SmsResponse>('/api/loans/sms/send', {
        phoneNumber: phoneNumber.replace(/-/g, ''), // 하이픈 제거
      });

      return response.data;

    } catch (error: any) {

      if (error.response?.data) {
        return error.response.data;
      }

      return {
        success: false,
        message: '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
      };
    }
  },

  /**
   * 인증번호 검증
   * @param phoneNumber 휴대폰 번호 (하이픈 포함 가능)
   * @param code 인증번호 (6자리)
   * @returns 검증 결과
   */
  verifyCode: async (phoneNumber: string, code: string): Promise<SmsResponse> => {
    try {
      const response = await apiClient.post<SmsResponse>('/api/loans/sms/verify', {
        phoneNumber: phoneNumber.replace(/-/g, ''), // 하이픈 제거
        code,
      });

      return response.data;

    } catch (error: any) {

      if (error.response?.data) {
        return error.response.data;
      }

      return {
        success: false,
        message: '인증번호 검증에 실패했습니다. 다시 시도해주세요.',
      };
    }
  },
};

export default smsAPI;
