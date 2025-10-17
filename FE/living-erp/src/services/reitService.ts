import axios from 'axios';
import { API_CONFIG, createApiUrl, extractApiData, createErrorMessage } from '../config/api';
import type {
  ReitProduct,
  ReitProductRequest,
  ReitBuildingMapping,
  ReitBuildingMappingRequest,
  ReitDividend,
  ReitDividendRequest
} from '../types/reit';

// 리츠 상품 관리 API
export const reitProductApi = {
  // 전체 상품 조회
  async getAllProducts(): Promise<ReitProduct[]> {
    const url = createApiUrl('/api/reit/products');
    const response = await axios.get(url);
    return extractApiData(response);
  },

  // 상품 코드로 조회
  async getProductByCode(productCode: string): Promise<ReitProduct> {
    const url = createApiUrl(`/api/reit/products/${productCode}`);
    const response = await axios.get(url);
    return extractApiData(response);
  },

  // 거래소별 조회
  async getProductsByExchange(stockExchange: string): Promise<ReitProduct[]> {
    const url = createApiUrl(`/api/reit/products/exchange/${stockExchange}`);
    const response = await axios.get(url);
    return extractApiData(response);
  },

  // 상품명 검색
  async searchProducts(keyword: string): Promise<ReitProduct[]> {
    const url = createApiUrl(`/api/reit/products/search?keyword=${encodeURIComponent(keyword)}`);
    const response = await axios.get(url);
    return extractApiData(response);
  },

  // 상품 생성
  async createProduct(request: ReitProductRequest): Promise<ReitProduct> {
    const url = createApiUrl('/api/reit/products');
    const response = await axios.post(url, request);
    return extractApiData(response);
  },

  // 상품 수정
  async updateProduct(productCode: string, request: ReitProductRequest): Promise<ReitProduct> {
    const url = createApiUrl(`/api/reit/products/${productCode}`);
    const response = await axios.put(url, request);
    return extractApiData(response);
  },

  // 상품 삭제
  async deleteProduct(productCode: string): Promise<void> {
    const url = createApiUrl(`/api/reit/products/${productCode}`);
    await axios.delete(url);
  }
};

// 건물 매핑 관리 API
export const reitBuildingApi = {
  // 상품의 포함 건물 조회
  async getBuildingsByProduct(productCode: string): Promise<ReitBuildingMapping[]> {
    const url = createApiUrl(`/api/reit/products/${productCode}/buildings`);
    const response = await axios.get(url);
    return extractApiData(response);
  },

  // 상품의 현재 포함 건물 조회
  async getActiveBuildingsByProduct(productCode: string): Promise<ReitBuildingMapping[]> {
    const url = createApiUrl(`/api/reit/products/${productCode}/buildings/active`);
    const response = await axios.get(url);
    return extractApiData(response);
  },

  // 건물을 상품에 추가
  async addBuildingToProduct(productCode: string, request: ReitBuildingMappingRequest): Promise<ReitBuildingMapping> {
    const url = createApiUrl(`/api/reit/products/${productCode}/buildings`);
    const response = await axios.post(url, request);
    return extractApiData(response);
  },

  // 건물을 상품에서 제외
  async removeBuildingFromProduct(mappingId: number): Promise<void> {
    const url = createApiUrl(`/api/reit/mappings/${mappingId}/exclude`);
    await axios.put(url);
  },

  // 건물 매핑 완전 삭제
  async deleteBuildingMapping(mappingId: number): Promise<void> {
    const url = createApiUrl(`/api/reit/mappings/${mappingId}`);
    await axios.delete(url);
  }
};

// 배당 관리 API
export const reitDividendApi = {
  // 상품의 배당 내역 조회
  async getDividendsByProduct(productCode: string): Promise<ReitDividend[]> {
    const url = createApiUrl(`/api/reit/products/${productCode}/dividends`);
    const response = await axios.get(url);
    return extractApiData(response);
  },

  // 연도별 배당 내역 조회
  async getDividendsByProductAndYear(productCode: string, year: number): Promise<ReitDividend[]> {
    const url = createApiUrl(`/api/reit/products/${productCode}/dividends/year/${year}`);
    const response = await axios.get(url);
    return extractApiData(response);
  },

  // 최근 배당 내역 조회
  async getRecentDividends(productCode: string, limit: number = 5): Promise<ReitDividend[]> {
    const url = createApiUrl(`/api/reit/products/${productCode}/dividends/recent?limit=${limit}`);
    const response = await axios.get(url);
    return extractApiData(response);
  },

  // 배당 정보 등록
  async createDividend(productCode: string, request: ReitDividendRequest): Promise<ReitDividend> {
    const url = createApiUrl(`/api/reit/products/${productCode}/dividends`);
    const response = await axios.post(url, request);
    return extractApiData(response);
  },

  // 배당 정보 수정
  async updateDividend(dividendId: number, request: ReitDividendRequest): Promise<ReitDividend> {
    const url = createApiUrl(`/api/reit/dividends/${dividendId}`);
    const response = await axios.put(url, request);
    return extractApiData(response);
  },

  // 배당 정보 삭제
  async deleteDividend(dividendId: number): Promise<void> {
    const url = createApiUrl(`/api/reit/dividends/${dividendId}`);
    await axios.delete(url);
  }
};

// 통합 리츠 서비스
export const reitService = {
  products: reitProductApi,
  buildings: reitBuildingApi,
  dividends: reitDividendApi
};