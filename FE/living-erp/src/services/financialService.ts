// 재무 관리 API 서비스
import axios from 'axios';
import { API_CONFIG, createApiUrl, extractApiData, createErrorMessage } from '../config/api';

// 재무 대시보드 인터페이스
export interface FinancialDashboard {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  totalRevenueCount: number;
  totalExpenseCount: number;
  monthlyData: MonthlySummary[];
  revenueByCategory: CategorySummary[];
  expenseByCategory: CategorySummary[];
  buildingData?: BuildingSummary[];
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
}

export interface MonthlySummary {
  month: string;
  revenue: number;
  expense: number;
  profit: number;
  revenueCount: number;
  expenseCount: number;
}

export interface CategorySummary {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface BuildingSummary {
  buildingId: number;
  buildingName: string;
  revenue: number;
  expense: number;
  profit: number;
  revenueCount: number;
  expenseCount: number;
}

// 수익/지출 아이템
export interface Revenue {
  id: number;
  userId: number;
  contractId: number;
  unitId: number;
  buildingId: number;
  paymentType: string;
  paymentCategory: string;
  title: string;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
  paidDate: string;
  paymentMethod: string;
  unitNumber: string;
  buildingName: string;
}

export interface Expense {
  id: number;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  buildingId?: number;
  createdBy: number;
  createdAt: string;
  buildingName?: string;
  createdByName?: string;
}

/**
 * 통합 재무 대시보드 데이터 조회
 */
export const getFinancialDashboard = async (
  buildingId?: number,
  startDate?: string,
  endDate?: string,
  token?: string
): Promise<FinancialDashboard> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const params: any = {};
    if (buildingId) params.buildingId = buildingId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await axios.get<{ success: boolean; data: FinancialDashboard; message: string }>(
      createApiUrl('/api/financial/dashboard', undefined, params),
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 간단한 재무 요약 정보 조회
 */
export const getFinancialSummary = async (
  buildingId?: number,
  startDate?: string,
  endDate?: string,
  token?: string
): Promise<FinancialSummary> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const params: any = {};
    if (buildingId) params.buildingId = buildingId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await axios.get<{ success: boolean; data: FinancialSummary; message: string }>(
      createApiUrl('/api/financial/summary', undefined, params),
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 수익률 분석
 */
export const getProfitabilityAnalysis = async (
  buildingId?: number,
  startDate?: string,
  endDate?: string,
  token?: string
): Promise<any> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const params: any = {};
    if (buildingId) params.buildingId = buildingId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await axios.get<{ success: boolean; data: any; message: string }>(
      createApiUrl('/api/financial/profitability', undefined, params),
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 건물별 재무 현황 비교
 */
export const getBuildingsComparison = async (
  startDate?: string,
  endDate?: string,
  token?: string
): Promise<BuildingSummary[]> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await axios.get<{ success: boolean; data: BuildingSummary[]; message: string }>(
      createApiUrl('/api/financial/buildings/comparison', undefined, params),
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 월별 손익 추이 분석
 */
export const getMonthlyTrend = async (
  buildingId?: number,
  startDate?: string,
  endDate?: string,
  token?: string
): Promise<MonthlySummary[]> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const params: any = {};
    if (buildingId) params.buildingId = buildingId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await axios.get<{ success: boolean; data: MonthlySummary[]; message: string }>(
      createApiUrl('/api/financial/monthly-trend', undefined, params),
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 수익 목록 조회
 */
export const getRevenues = async (
  buildingId?: number,
  category?: string,
  startDate?: string,
  endDate?: string,
  token?: string
): Promise<Revenue[]> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const params: any = {};
    if (buildingId) params.buildingId = buildingId;
    if (category) params.category = category;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await axios.get<{ success: boolean; data: Revenue[]; message: string }>(
      createApiUrl('/api/revenues', undefined, params),
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    return [];
  }
};

/**
 * 지출 목록 조회
 */
export const getExpenses = async (
  buildingId?: number,
  category?: string,
  startDate?: string,
  endDate?: string,
  token?: string
): Promise<Expense[]> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const params: any = {};
    if (buildingId) params.buildingId = buildingId;
    if (category) params.category = category;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await axios.get<{ success: boolean; data: Expense[]; message: string }>(
      createApiUrl('/api/expenses', undefined, params),
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    return [];
  }
};

/**
 * 지출 등록
 */
export const createExpense = async (
  expenseData: {
    category: string;
    description: string;
    amount: number;
    expenseDate: string;
    buildingId?: number;
    createdBy: number;
  },
  token?: string
): Promise<Expense> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post<{ success: boolean; data: Expense; message: string }>(
      createApiUrl('/api/expenses'),
      expenseData,
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 지출 수정
 */
export const updateExpense = async (
  id: number,
  expenseData: {
    category?: string;
    description?: string;
    amount?: number;
    expenseDate?: string;
    buildingId?: number;
  },
  token?: string
): Promise<Expense> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.put<{ success: boolean; data: Expense; message: string }>(
      createApiUrl('/api/expenses', id),
      expenseData,
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 지출 삭제
 */
export const deleteExpense = async (
  id: number,
  token?: string
): Promise<void> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    await axios.delete(
      createApiUrl('/api/expenses', id),
      { headers }
    );

  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};