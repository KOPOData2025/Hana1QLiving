// 방문 예약 관련 타입 정의
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Reservation {
  id: number;
  buildingId: number;
  unitId: number;
  name: string;
  email: string;
  phone: string;
  age: string;
  occupation: string;
  currentResidence: string;
  moveInDate: string;
  residencePeriod: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

// 예약 상태 변경 요청 타입
export interface UpdateReservationStatusRequest {
  status: ReservationStatus;
}

// 예약 상태 변경 응답 타입
export interface UpdateReservationStatusResponse {
  success: boolean;
  data: Reservation;
  message: string;
}

// 예약 목록 조회 응답 타입
export interface GetReservationsResponse {
  success: boolean;
  data: Reservation[];
  message: string;
}

// 예약 상태별 스타일 정의
export const RESERVATION_STATUS_CONFIG = {
  PENDING: {
    label: '대기중',
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    icon: '⏳'
  },
  CONFIRMED: {
    label: '확정',
    color: '#009595',
    backgroundColor: 'rgba(0, 149, 149, 0.1)',
    icon: '✅'
  },
  CANCELLED: {
    label: '취소',
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    icon: '❌'
  },
  COMPLETED: {
    label: '완료',
    color: '#009595',
    backgroundColor: 'rgba(0, 149, 149, 0.1)',
    icon: '🏁'
  }
} as const;

// 예약 상태 필터 옵션
export const RESERVATION_STATUS_FILTERS = [
  { value: 'ALL', label: '전체', count: 0 },
  { value: 'PENDING', label: '대기중', count: 0 },
  { value: 'CONFIRMED', label: '확정', count: 0 },
  { value: 'CANCELLED', label: '취소', count: 0 },
  { value: 'COMPLETED', label: '완료', count: 0 },
] as const;

export type ReservationStatusFilter = 'ALL' | ReservationStatus;

// 모듈 시스템 새로고침을 위한 빈 줄
