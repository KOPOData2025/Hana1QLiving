import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosInstance } from "axios";
import { ENV_CONFIG } from "../src/config/environment";

// 투자 API 클라이언트 설정
class InvestmentApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = ENV_CONFIG.INVESTMENT_API_URL;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 60000, // 60초 - 시뮬레이션 등 시간이 오래 걸리는 요청 대응
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // 요청 인터셉터 - 토큰 자동 추가
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const token = await AsyncStorage.getItem("token");
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {}
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 응답 인터셉터 - 에러 처리
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // 토큰 만료 또는 인증 실패 시 처리
          AsyncStorage.removeItem("token");
          // 로그인 화면으로 리디렉션 등의 처리가 필요할 수 있음
        }
        return Promise.reject(error);
      }
    );
  }

  // 투자 상품 관련 API
  async getInvestmentProducts(params?: {
    type?: string;
    riskLevel?: number;
    keyword?: string;
  }) {
    try {
      const response = await this.client.get("/api/investment/products", {
        params,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getInvestmentProduct(productId: string) {
    try {
      const response = await this.client.get(
        `/api/investment/products/${productId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getRecommendedProducts(userRiskLevel?: number) {
    try {
      const params = userRiskLevel ? { userRiskLevel } : {};
      const response = await this.client.get(
        "/api/investment/products/recommended",
        { params }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPersonalizedProducts() {
    try {
      const response = await this.client.get(
        "/api/investment/products/personalized"
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 포트폴리오 관련 API
  async getPortfolio() {
    try {
      const response = await this.client.get("/api/investment/portfolio");
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPortfolioSummary() {
    try {
      const response = await this.client.get(
        "/api/investment/portfolio/summary"
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPortfolioAnalysis() {
    try {
      const response = await this.client.get(
        "/api/investment/portfolio/analysis"
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 주문 관련 API
  async estimateOrder(orderRequest: {
    productId: string;
    orderType: "BUY" | "SELL";
    quantity: number;
    unitPrice: number;
  }) {
    try {
      const response = await this.client.post(
        "/api/investment/orders/estimate",
        orderRequest
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createOrder(orderRequest: {
    productId: string;
    orderType: "BUY" | "SELL";
    quantity: number;
    unitPrice: number;
  }) {
    try {
      const response = await this.client.post(
        "/api/investment/orders",
        orderRequest
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createBuyOrder(orderRequest: {
    userId?: number;
    productId: string;
    quantity: number;
    unitPrice: number;
    accountNumber: string;
    password: string;
    channel: string;
  }) {
    try {
      const response = await this.client.post(
        "/api/investment/orders/buy",
        orderRequest
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createSellOrder(orderRequest: {
    userId?: number;
    productId: string;
    quantity: number;
    unitPrice: number;
    accountNumber: string;
    password: string;
    channel: string;
  }) {
    try {
      const response = await this.client.post(
        "/api/investment/orders/sell",
        orderRequest
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 기존 메서드명도 호환성을 위해 유지
  async processBuyOrder(orderRequest: {
    userId?: number;
    productId: string;
    quantity: number;
    unitPrice: number;
    accountNumber: string;
    password: string;
    channel: string;
  }) {
    return this.createBuyOrder(orderRequest);
  }

  async processSellOrder(orderRequest: {
    userId?: number;
    productId: string;
    quantity: number;
    unitPrice: number;
    accountNumber: string;
    password: string;
    channel: string;
  }) {
    return this.createSellOrder(orderRequest);
  }

  // 거래내역 관련 API
  async getTransactions() {
    try {
      const response = await this.client.get("/api/investment/transactions");
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 주문내역 관련 API
  async getOrders() {
    try {
      const response = await this.client.get("/api/investment/orders");
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async cancelOrder(orderId: string) {
    try {
      const response = await this.client.delete(
        `/api/investment/orders/${orderId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getRecentTransactions(limit: number = 10) {
    try {
      const response = await this.client.get(
        "/api/investment/transactions/recent",
        {
          params: { limit },
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTransactionStatistics() {
    try {
      const response = await this.client.get("/api/investment/statistics");
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 매매 손익 조회 API
  async getTradingProfitLoss() {
    try {
      const response = await this.client.get(
        "/api/investment/trading-profit-loss"
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 배당 수익 관련 API
  async getDividends() {
    try {
      const response = await this.client.get("/api/investment/dividends");
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getDividendSummary() {
    try {
      const response = await this.client.get(
        "/api/investment/dividends/summary"
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 시장 데이터 관련 API
  async getMarketData() {
    try {
      const response = await this.client.get("/api/investment/market-data");
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 투자 서비스 상태 확인
  async checkInvestmentServiceHealth() {
    try {
      const response = await this.client.get("/api/investment/health");
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 외부 데이터 동기화
  async syncExternalData() {
    try {
      const response = await this.client.post("/api/investment/sync-data");
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 한국투자증권 API - REITs 목록 조회
  async getKisReitsProducts(marketCode: string = "ALL") {
    try {
      const response = await this.client.get(
        "/uapi/domestic-stock/v1/quotations/reits-list",
        {
          params: { market_code: marketCode },
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 한국투자증권 API - 주식 현재가 조회
  async getKisStockPrice(stockCode: string, marketDivCode: string = "J") {
    try {
      const response = await this.client.get(
        "/uapi/domestic-stock/v1/quotations/inquire-asking-price-exp-ccn",
        {
          params: {
            stock_code: stockCode,
            market_div_code: marketDivCode,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 기존 투자상품과 KIS REITs 데이터를 병합하여 조회
  async getInvestmentProductsWithReits() {
    try {
      // 먼저 기본 투자 상품을 조회
      const productsResponse = await this.getInvestmentProducts();

      if (productsResponse.success && productsResponse.data) {
        return productsResponse;
      } else {
        // 기본 상품 조회 실패 시 에러 반환
        throw new Error("투자상품 조회 실패");
      }
    } catch (error) {
      // 실패 시 최소한의 데이터라도 반환
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      };
    }
  }

  // 에러 처리 헬퍼
  private handleError(error: any): any {
    if (error.response) {
      // 서버에서 응답이 왔지만 에러 상태
      const status = error.response.status;
      const message =
        error.response.data?.message ||
        error.response.data?.error ||
        "서버 오류가 발생했습니다";

      // 원본 에러에 사용자 친화적인 메시지를 추가하되, response 정보는 보존
      const enhancedError: any = new Error();
      enhancedError.response = error.response;
      enhancedError.request = error.request;
      enhancedError.config = error.config;

      switch (status) {
        case 401:
          enhancedError.message = "인증이 필요합니다. 다시 로그인해 주세요.";
          break;
        case 403:
          enhancedError.message = "접근 권한이 없습니다.";
          break;
        case 404:
          enhancedError.message = "요청한 데이터를 찾을 수 없습니다.";
          break;
        case 500:
          enhancedError.message = "서버 내부 오류가 발생했습니다.";
          break;
        default:
          enhancedError.message = message;
      }

      return enhancedError;
    } else if (error.request) {
      // 요청은 전송되었지만 응답을 받지 못함
      const networkError: any = new Error("네트워크 연결을 확인해 주세요.");
      networkError.request = error.request;
      return networkError;
    } else {
      // 요청 설정 중 에러 발생
      return new Error("요청 처리 중 오류가 발생했습니다.");
    }
  }

  // 한국투자증권 API 스타일 토큰 발급
  async getKisToken(appKey: string, appSecret: string) {
    try {
      const response = await this.client.post("/uapi/auth/token", {
        appKey,
        appSecret,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 상품 배당 정보 조회 (상품 ID 기반 - 한국투자증권 API)
  async getDividendInfo(productId: string) {
    try {
      const response = await this.client.get(
        `/api/investment/products/${productId}/dividend`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 하나원큐리빙 DB 배당 정보 조회 (상품 코드 기반)
  async getHanaLivingDividends(productCode: string) {
    try {
      const response = await this.client.get(
        `/api/products/${productCode}/dividends`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 배당 관리 API - 상품별 배당 정보 조회
  async getProductDividends(productCode: string) {
    try {
      const response = await this.client.get(
        `/api/dividend-management/products/${productCode}/dividends`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 더 이상 사용하지 않는 메서드 - 호환성을 위해 getDividendInfo로 리다이렉트
  async getLatestDividendInfo(productId: string) {
    return this.getDividendInfo(productId);
  }

  // 실시간 주식 가격 조회
  async getRealtimeStockPrice(stockCode: string) {
    try {
      const response = await this.client.get(
        `/api/investment/realtime/stock/${stockCode}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 리츠 상품에 포함된 건물 목록 조회
  async getReitBuildings(productCode: string) {
    try {
      const response = await this.client.get(
        `/api/reit/products/${productCode}/buildings`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 리츠 투자 시뮬레이션
  async runSimulation(request: SimulationRequest) {
    try {
      const response = await this.client.post(
        "/api/reit/simulation/rank",
        request
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 베이스 URL 업데이트 (개발/운영 환경 전환용)
  updateBaseURL(newBaseURL: string) {
    this.baseURL = newBaseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 60000, // 60초 - 시뮬레이션 등 시간이 오래 걸리는 요청 대응
      headers: {
        "Content-Type": "application/json",
      },
    });
    this.setupInterceptors();
  }
}

// 투자 API 클라이언트 인스턴스 생성 및 내보내기
export const investmentApi = new InvestmentApiClient();

// 타입 정의
export interface InvestmentProduct {
  productId: string;
  productName: string;
  productCode: string;
  productType: string;
  currentPrice: number;
  nav: number;
  totalReturn: number;
  dividendYield: number;
  riskLevel: number;
  minInvestment: number;
  category: string;
  description: string;
  managementFee: number;
  trustFee: number;
  inceptionDate: string;
  totalAssets: number;
  marketCap?: number;
  benchmark: string;
  manager: string;
  isRecommended: boolean;
  status: string;
  lastUpdated: string;
}

export interface OrderRequest {
  userId?: number;
  productId: string;
  orderType: "BUY" | "SELL";
  quantity: number;
  unitPrice: number;
  accountNumber: string;
  password: string;
  channel: string;
}

export interface OrderResponse {
  success: boolean;
  message: string;
  transactionId?: number;
  orderId?: string;
  status?: string;
  orderType?: string;
  productId?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  fees?: number;
  tax?: number;
  netAmount?: number;
  error?: string;
  errorCode?: string;
}

export interface Portfolio {
  id: number;
  userId: number;
  productId: string;
  productName: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  currentValue: number;
  totalCost: number;
  unrealizedProfitLoss: number;
  profitLossRate: number;
  lastUpdated: string;
}

export interface InvestmentTransaction {
  transactionId: string;
  userId: number;
  productId: string;
  productName: string;
  transactionType: "BUY" | "SELL" | "DIVIDEND";
  quantity?: number;
  unitPrice?: number;
  totalAmount: number;
  fees?: number;
  tax?: number;
  netAmount: number;
  status: "COMPLETED" | "PENDING" | "CANCELLED";
  transactionDate: string;
  orderId?: string;
  brokerOrderId?: string;
  channel: string;
  createdAt: string;
}

export interface InvestmentOrder {
  orderId: string;
  userId: number;
  productId: string;
  productName: string;
  orderType: "BUY" | "SELL";
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  fees?: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  orderDate: string;
  completedDate?: string;
  accountNumber: string;
  channel: string;
  createdAt: string;
}

// 기존 Transaction 타입은 호환성을 위해 유지
export interface Transaction {
  id: number;
  userId: number;
  productId: string;
  productName: string;
  transactionType: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  fees: number;
  tax: number;
  netAmount: number;
  status: string;
  transactionDate: string;
  orderId?: string;
  brokerOrderId?: string;
  channel: string;
  createdAt: string;
}

// 한국투자증권 API 타입 정의
export interface KisResponse<T> {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output: T;
}

export interface KisTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface KisStockPriceResponse {
  stck_prpr: string; // 주식 현재가
  prdy_ctrt: string; // 전일대비율
  acml_vol: string; // 누적거래량
  prdy_vrss_sign: string; // 전일대비부호
  prdy_vrss: string; // 전일대비
  askp1: string; // 매도호가1
  askp2: string; // 매도호가2
  askp3: string; // 매도호가3
  askp4: string; // 매도호가4
  askp5: string; // 매도호가5
  bidp1: string; // 매수호가1
  bidp2: string; // 매수호가2
  bidp3: string; // 매수호가3
  bidp4: string; // 매수호가4
  bidp5: string; // 매수호가5
  askp_rsqn1: string; // 매도호가수량1
  askp_rsqn2: string; // 매도호가수량2
  askp_rsqn3: string; // 매도호가수량3
  askp_rsqn4: string; // 매도호가수량4
  askp_rsqn5: string; // 매도호가수량5
  bidp_rsqn1: string; // 매수호가수량1
  bidp_rsqn2: string; // 매수호가수량2
  bidp_rsqn3: string; // 매수호가수량3
  bidp_rsqn4: string; // 매수호가수량4
  bidp_rsqn5: string; // 매수호가수량5
}

export interface KisReitsItem {
  stck_shrn_iscd: string; // 종목코드
  hts_kor_isnm: string; // 종목명
  stck_prpr: string; // 현재가
  prdy_ctrt: string; // 전일대비율
  acml_vol: string; // 누적거래량
  prdy_vrss_sign: string; // 전일대비부호
  prdy_vrss: string; // 전일대비
  mktc_code: string; // 시장구분코드
  nav: string; // NAV (순자산가치)
  dividend_yield: string; // 배당수익률
  total_assets: string; // 총자산
}

// 종목 상세 정보 타입
export interface StockDetailInfo {
  marketCap?: number; // 시가총액
  per?: number; // PER
  pbr?: number; // PBR
  roe?: number; // ROE
  high52Week?: number; // 52주 최고가
  low52Week?: number; // 52주 최저가
  dividendYield?: number; // 배당수익률
  volume?: number; // 거래량
  sharesOutstanding?: number; // 발행주식수
  sector?: string; // 업종
  currentPrice?: number; // 현재가
}

// 배당 정보 타입
export interface DividendInfo {
  stockCode: string; // 종목코드
  stockName: string; // 종목명
  dividendType: string; // 배당구분 (현금배당, 주식배당 등)
  recordDate?: string; // 배당기준일
  exDividendDate?: string; // 배당락일
  paymentDate?: string; // 배당지급일
  dividendPerShare?: number; // 주당배당금
  dividendYield?: number; // 배당수익률
  currency?: string; // 통화
  remarks?: string; // 비고
}

// 하나원큐리빙 DB 배당 정보 타입
export interface HanaLivingDividend {
  DIVIDEND_ID: number;
  PRODUCT_CODE: string;
  DIVIDEND_YEAR: number;
  DIVIDEND_QUARTER: number;
  ORIGINAL_RATE?: number; // 기존 DIVIDEND_RATE (옵셔널)
  DIVIDEND_RATE?: number; // 호환성을 위한 기존 필드
  DIVIDEND_AMOUNT: number;
  BASE_PRICE?: number; // 배당 기준가 (옵셔널)
  RECORD_DATE: string;
  PAYMENT_DATE: string;
  ANNOUNCEMENT_DATE: string;
  RECORD_DATE_STR: string;
  PAYMENT_DATE_STR: string;
  ANNOUNCEMENT_DATE_STR: string;
  QUARTER_LABEL: string;
  CALCULATED_YIELD_PERCENT?: number; // 계산된 수익률 (%) (옵셔널)
}

// 리츠 투자 시뮬레이션 타입
export interface SimulationRequest {
  startDate: string;
  endDate: string;
  initialInvestment: number;
  recurringInvestment: {
    amount: number;
    frequency: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
  };
  dividendReinvestment: "ALL" | "NONE";
}

export interface ReitRanking {
  rank: number;
  productCode: string;
  productName: string;
  productType: string;
  totalInvestment: number;
  finalValue: number;
  profit: number;
  returnRate: number;
  annualizedReturn: number;
  summary: {
    initialPurchase: {
      amount: number;
      shares: number;
      avgPrice: number;
    };
    recurringPurchase: {
      amount: number;
      shares: number;
      count: number;
    };
    dividendReinvestment: {
      amount: number;
      shares: number;
      count: number;
    };
    totalShares: number;
    currentPrice: number;
    dividends: {
      totalAmount: number;
      count: number;
      avgYield: number;
    };
    maxDrawdown: number;
    maxReturn: number;
  };
}

export interface SimulationResult {
  inputSummary: {
    startDate: string;
    endDate: string;
    investmentPeriod: string;
    initialInvestment: number;
    recurringInvestment: number;
    totalInvestment: number;
    totalReitsAnalyzed: number;
  };
  statistics: {
    averageReturnRate: number;
    maxReturnRate: number;
    minReturnRate: number;
    medianReturnRate: number;
  };
  rankings: ReitRanking[];
}
