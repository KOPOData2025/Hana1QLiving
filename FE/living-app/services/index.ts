// 하나원큐리빙 API (기존)
export { default as mobileApi } from './mobileApi';

// 하나은행 API (새로 추가)
export { bankApi } from './bankApi';

// 하나증권 API (새로 추가)
export { securitiesApi } from './securitiesApi';

// 통합 API 객체 (편의용)
export const api = {
  living: mobileApi,
  bank: bankApi,
  securities: securitiesApi,
};