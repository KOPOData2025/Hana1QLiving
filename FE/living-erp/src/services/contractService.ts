// 계약 관리 API 서비스
import axios from 'axios';
import { API_CONFIG, createApiUrl, extractApiData, createErrorMessage } from '../config/api';
import type { 
  Contract, 
  CreateContractRequest,
  CreateContractResponse 
} from '../types/contract';

/**
 * 새 계약 생성
 */
export const createContract = async (
  contractData: CreateContractRequest,
  token?: string
): Promise<Contract> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post<CreateContractResponse>(
      createApiUrl('/api/contracts'),
      contractData,
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 계약 목록 조회
 */
export const getContracts = async (token?: string): Promise<Contract[]> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.get<{ success: boolean; data: Contract[]; message: string }>(
      createApiUrl('/api/contracts'),
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 특정 계약 조회
 */
export const getContractById = async (
  id: number, 
  token?: string
): Promise<Contract> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.get<{ success: boolean; data: Contract; message: string }>(
      createApiUrl('/api/contracts', id),
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};
