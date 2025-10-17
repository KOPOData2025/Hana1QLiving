// 자동이체 관리 API 서비스
import axios from "axios";
import { createApiUrl, createErrorMessage } from "../config/api";

export interface AutoPaymentContract {
  id: number;
  userId: number;
  userName: string;
  contractId: number;
  buildingName: string;
  unitNumber: string;
  fromAccount: string;
  toAccount: string;
  toBankName: string;
  amount: number;
  transferDay: number;
  beneficiaryName: string;
  memo: string;
  nextTransferDate: string;
  status: "ACTIVE" | "SUSPENDED" | "CANCELLED";
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  lastExecutionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutoPaymentHistory {
  id: number;
  contractId: number;
  amount: number;
  transferDate: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  errorMessage?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalContracts: number;
  activeContracts: number;
  suspendedContracts: number;
  cancelledContracts: number;
  monthlyTransferAmount: number;
  successRate: number;
  totalTransferAmount: number;
  todayExecutions: number;
}

export interface MonthlyStats {
  month: string;
  totalAmount: number;
  successCount: number;
  failedCount: number;
}

export interface ExecutionResult {
  contractId: number;
  userId: number;
  userName: string;
  building: string;
  unit: string;
  amount: number;
  transactionId?: string;
  reason?: string;
  status: "SUCCESS" | "FAILURE";
}

export interface ExecutionSummary {
  totalCount: number;
  successCount: number;
  failureCount: number;
  successResults: ExecutionResult[];
  failureResults: ExecutionResult[];
  executedAt: string;
}

/**
 * 자동이체 대시보드 통계 조회
 */
export const getAutoPaymentStats = async (
  token?: string
): Promise<DashboardStats> => {
  try {
    const headers: any = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // 기존 /payment-list API를 활용해서 통계 계산
    const listResponse = await axios.get<{
      success: boolean;
      data: any[];
      message: string;
    }>(createApiUrl("/api/auto-payment/payment-list"), { headers });

    if (listResponse.data.success && listResponse.data.data) {
      const autoPayments = listResponse.data.data;

      // 통계 계산
      const totalContracts = autoPayments.length;
      const activeContracts = autoPayments.filter(
        (ap) => ap.status === "ACTIVE"
      ).length;
      const suspendedContracts = autoPayments.filter(
        (ap) => ap.status === "SUSPENDED"
      ).length;
      const cancelledContracts = autoPayments.filter(
        (ap) => ap.status === "CANCELLED"
      ).length;

      const monthlyTransferAmount = autoPayments
        .filter((ap) => ap.status === "ACTIVE")
        .reduce((sum, ap) => sum + (ap.monthlyRent || 0), 0);

      const totalTransferAmount = monthlyTransferAmount * 12;

      const stats: DashboardStats = {
        totalContracts,
        activeContracts,
        suspendedContracts,
        cancelledContracts,
        monthlyTransferAmount,
        successRate:
          activeContracts > 0 ? (activeContracts / totalContracts) * 100 : 0,
        totalTransferAmount,
        todayExecutions: 0, // 실행 기록이 없어서 임시로 0
      };

      return stats;
    }

    throw new Error("데이터 조회 실패");
  } catch (error: any) {
    throw error;
  }
};

/**
 * 자동이체 계약 목록 조회
 */
export const getAutoPaymentContracts = async (
  status?: string,
  token?: string
): Promise<AutoPaymentContract[]> => {
  try {
    const headers: any = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // 기존 /payment-list API 활용
    const response = await axios.get<{
      success: boolean;
      data: any[];
      message: string;
    }>(createApiUrl("/api/auto-payment/payment-list"), { headers });

    if (response.data.success && response.data.data) {
      let contracts = response.data.data.map((item: any) => ({
        id: item.id,
        userId: item.userId,
        userName: item.userName || "사용자",
        contractId: item.contractId,
        buildingName: item.buildingName || "하나원큐리빙",
        unitNumber: item.unitNumber || "호실",
        fromAccount: item.accountNumber || "계좌정보",
        toAccount: "110-987-654321",
        toBankName: "하나은행",
        amount: item.monthlyRent || 0,
        transferDay: item.paymentDay || 25,
        beneficiaryName: "하나원큐리빙(주)",
        memo: "월세 자동이체",
        nextTransferDate: item.nextTransferDate || new Date().toISOString(),
        status: item.status || "ACTIVE",
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        lastExecutionDate: null,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
      }));

      // status 필터링
      if (status) {
        contracts = contracts.filter(
          (contract: any) => contract.status === status
        );
      }

      return contracts;
    }

    throw new Error("데이터 조회 실패");
  } catch (error: any) {
    throw error;
  }
};

/**
 * 자동이체 실행 이력 조회
 */
export const getAutoPaymentHistory = async (
  contractId?: number,
  token?: string
): Promise<AutoPaymentHistory[]> => {
  try {
    const headers: any = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // 기존 /history API 활용
    const response = await axios.get<{
      success: boolean;
      data: any[];
      message: string;
    }>(createApiUrl("/api/auto-payment/history"), { headers });

    if (response.data.success && response.data.data) {
      let history = response.data.data.map((item: any) => ({
        id: item.id || Math.random(),
        contractId: item.contractId || 0,
        amount: item.amount || 0,
        transferDate:
          item.paidDate || item.executedAt || new Date().toISOString(),
        status:
          item.status === "PAID"
            ? "SUCCESS"
            : item.status === "FAILED"
            ? "FAILED"
            : "PENDING",
        errorMessage: item.failureReason,
        createdAt: item.createdAt || new Date().toISOString(),
      }));

      // contractId 필터링
      if (contractId) {
        history = history.filter((h: any) => h.contractId === contractId);
      }

      return history;
    }

    throw new Error("데이터 조회 실패");
  } catch (error: any) {
    throw error;
  }
};

/**
 * 월별 자동이체 통계 조회
 */
export const getMonthlyStats = async (
  year?: number,
  token?: string
): Promise<MonthlyStats[]> => {
  try {
    const headers: any = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // 기존 /history API를 활용해서 월별 통계 계산
    const historyResponse = await axios.get<{
      success: boolean;
      data: any[];
      message: string;
    }>(createApiUrl("/api/auto-payment/history"), { headers });

    if (historyResponse.data.success && historyResponse.data.data) {
      const history = historyResponse.data.data;
      const currentYear = year || new Date().getFullYear();

      // 월별로 그룹화
      const monthlyData: {
        [key: string]: {
          totalAmount: number;
          successCount: number;
          failedCount: number;
        };
      } = {};

      history.forEach((item: any) => {
        const date = new Date(
          item.paidDate || item.executedAt || item.createdAt
        );
        if (date.getFullYear() === currentYear) {
          const month = `${date.getMonth() + 1}월`;

          if (!monthlyData[month]) {
            monthlyData[month] = {
              totalAmount: 0,
              successCount: 0,
              failedCount: 0,
            };
          }

          const amount = item.amount || 0;
          monthlyData[month].totalAmount += amount;

          if (item.status === "PAID") {
            monthlyData[month].successCount++;
          } else if (item.status === "FAILED") {
            monthlyData[month].failedCount++;
          }
        }
      });

      // 1월부터 12월까지 순서대로 정렬
      const monthOrder = [
        "1월",
        "2월",
        "3월",
        "4월",
        "5월",
        "6월",
        "7월",
        "8월",
        "9월",
        "10월",
        "11월",
        "12월",
      ];
      const result = monthOrder
        .map((month) => ({
          month,
          totalAmount: monthlyData[month]?.totalAmount || 0,
          successCount: monthlyData[month]?.successCount || 0,
          failedCount: monthlyData[month]?.failedCount || 0,
        }))
        .filter(
          (item) =>
            item.totalAmount > 0 ||
            item.successCount > 0 ||
            item.failedCount > 0
        );

      return result;
    }

    throw new Error("데이터 조회 실패");
  } catch (error: any) {
    throw error;
  }
};

/**
 * 자동이체 계약 일시정지
 */
export const suspendAutoPaymentContract = async (
  contractId: number,
  token?: string
): Promise<void> => {
  try {
    const headers: any = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    await axios.put(
      createApiUrl(
        "/api/auto-payment/contracts",
        contractId,
        undefined,
        "suspend"
      ),
      {},
      { headers }
    );

  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 자동이체 계약 재개
 */
export const resumeAutoPaymentContract = async (
  contractId: number,
  token?: string
): Promise<void> => {
  try {
    const headers: any = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    await axios.put(
      createApiUrl(
        "/api/auto-payment/contracts",
        contractId,
        undefined,
        "resume"
      ),
      {},
      { headers }
    );

  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 자동이체 계약 해지
 */
export const cancelAutoPaymentContract = async (
  contractId: number,
  reason?: string,
  token?: string
): Promise<void> => {
  try {
    const headers: any = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    await axios.delete(
      createApiUrl("/api/auto-payment/contracts", contractId),
      {
        headers,
        data: reason ? { reason } : undefined,
      }
    );

  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 오늘 월세 자동송금 즉시 실행
 */
export const executeRentAutoPayments = async (
  token?: string
): Promise<ExecutionSummary> => {
  try {
    const headers: any = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post<{
      success: boolean;
      data: ExecutionSummary;
      message: string;
    }>(createApiUrl("/api/admin/rent-auto-payment/execute"), {}, { headers });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || "월세 자동송금 실행 실패");
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};
