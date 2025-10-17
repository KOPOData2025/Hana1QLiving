// 방문 예약 관리 API 서비스
import axios from 'axios';
import { API_CONFIG, createApiUrl, extractApiData, createErrorMessage } from '../config/api';
import type { 
  Reservation, 
  GetReservationsResponse, 
  UpdateReservationStatusRequest,
  UpdateReservationStatusResponse,
  ReservationStatus 
} from '../types/reservation';

// API 엔드포인트 추가
const RESERVATIONS_ENDPOINT = '/api/reservations';

/**
 * 모든 예약 목록 조회
 */
export const getReservations = async (token?: string): Promise<Reservation[]> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.get<GetReservationsResponse>(
      createApiUrl(RESERVATIONS_ENDPOINT),
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 상태별 예약 목록 조회
 */
export const getReservationsByStatus = async (
  status: ReservationStatus, 
  token?: string
): Promise<Reservation[]> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.get<GetReservationsResponse>(
      `${createApiUrl(RESERVATIONS_ENDPOINT)}?status=${status}`,
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 특정 예약 조회
 */
export const getReservationById = async (
  id: number, 
  token?: string
): Promise<Reservation> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.get<{ success: boolean; data: Reservation; message: string }>(
      createApiUrl(RESERVATIONS_ENDPOINT, id),
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 예약 상태 변경
 */
export const updateReservationStatus = async (
  id: number,
  status: ReservationStatus,
  token?: string
): Promise<Reservation> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const requestData: UpdateReservationStatusRequest = { status };

    const response = await axios.put<UpdateReservationStatusResponse>(
      `${createApiUrl(RESERVATIONS_ENDPOINT, id)}/status`,
      requestData,
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 예약을 CONFIRMED 상태로 변경 (계약 성사)
 */
export const confirmReservation = async (
  id: number,
  token?: string
): Promise<Reservation> => {
  return updateReservationStatus(id, 'CONFIRMED', token);
};

/**
 * 예약을 CANCELLED 상태로 변경 (예약 취소)
 */
export const cancelReservation = async (
  id: number,
  token?: string
): Promise<Reservation> => {
  return updateReservationStatus(id, 'CANCELLED', token);
};

/**
 * 예약을 COMPLETED 상태로 변경 (예약 완료)
 */
export const completeReservation = async (
  id: number,
  token?: string
): Promise<Reservation> => {
  return updateReservationStatus(id, 'COMPLETED', token);
};

/**
 * 예약 정보 업데이트
 */
export const updateReservation = async (
  id: number,
  updateData: Partial<Reservation>,
  token?: string
): Promise<Reservation> => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.put<UpdateReservationStatusResponse>(
      createApiUrl(RESERVATIONS_ENDPOINT, id),
      updateData,
      { headers }
    );

    return extractApiData(response);
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};

/**
 * 예약 상태별 통계 조회
 */
export const getReservationStatistics = async (token?: string): Promise<{
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
}> => {
  try {
    const reservations = await getReservations(token);

    const statistics = {
      total: reservations.length,
      pending: reservations.filter(r => r.status === 'PENDING').length,
      confirmed: reservations.filter(r => r.status === 'CONFIRMED').length,
      cancelled: reservations.filter(r => r.status === 'CANCELLED').length,
      completed: reservations.filter(r => r.status === 'COMPLETED').length,
    };

    return statistics;
  } catch (error: any) {
    throw new Error(createErrorMessage(error));
  }
};
