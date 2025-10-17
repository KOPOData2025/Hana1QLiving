import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV_CONFIG } from '../src/config/environment';

export interface WebSocketMessage {
  type: 'PRICE_UPDATE' | 'PORTFOLIO_UPDATE' | 'ORDER_UPDATE' | 'MARKET_UPDATE' | 'QUOTE_UPDATE';
  data: any;
  timestamp: number;
}

export interface OrderBookEntry {
  price: number;
  volume: number;  // quantity -> volume로 통일
  level: number;
}

export interface OrderBook {
  asks: OrderBookEntry[];  // 매도 호가
  bids: OrderBookEntry[];  // 매수 호가
  spread: string;
  totalAskVolume?: number;
  totalBidVolume?: number;
}

export interface QuoteUpdate {
  productId: string;
  orderBook: OrderBook;
  expectedExecution: {
    price: number;
    volume: number;
  };
  marketTime: string;
  marketStatus: string;
  timestamp: number;
}

export interface PriceUpdate {
  productId: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  orderBook?: OrderBook;
  timestamp: number;
}

export interface PortfolioUpdate {
  userId: number;
  totalValue: number;
  totalProfitLoss: number;
  totalProfitLossRate: number;
  positions: Array<{
    productId: string;
    currentValue: number;
    profitLoss: number;
    profitLossRate: number;
  }>;
  timestamp: number;
}

export interface OrderUpdate {
  orderId: string;
  userId: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  message: string;
  timestamp: number;
}

export interface MarketUpdate {
  marketStatus: 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_MARKET';
  kospiIndex: number;
  kospiChange: number;
  kosdaqIndex: number;
  kosdaqChange: number;
  timestamp: number;
}

type MessageListener = (message: WebSocketMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, MessageListener[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private baseUrl = ENV_CONFIG.WS_BASE_URL;
  private lastHeartbeat = 0;
  private heartbeatTimeoutMs = 30000; // 30초
  private lastPriceData: Map<string, PriceUpdate> = new Map(); // 중복 방지용 이전 데이터 저장

  constructor() {
    this.initializeEventTypes();
  }

  private initializeEventTypes() {
    this.listeners.set('PRICE_UPDATE', []);
    this.listeners.set('PORTFOLIO_UPDATE', []);
    this.listeners.set('ORDER_UPDATE', []);
    this.listeners.set('MARKET_UPDATE', []);
    this.listeners.set('QUOTE_UPDATE', []);
    this.listeners.set('CONNECTION', []);
    this.listeners.set('ERROR', []);
  }

  async connect(): Promise<boolean> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return true;
    }

    this.isConnecting = true;

    try {
      const token = await AsyncStorage.getItem('token');
      
      
      if (!token) {
        this.isConnecting = false;
        throw new Error('인증 토큰이 없습니다. 먼저 로그인해주세요.');
      }
      
      
      const wsUrl = `${this.baseUrl}/ws/investment?token=${encodeURIComponent(token)}`;
      
      this.ws = new WebSocket(wsUrl);

      return new Promise((resolve, reject) => {
        if (!this.ws) {
          this.isConnecting = false;
          reject(new Error('WebSocket 연결 초기화 실패'));
          return;
        }

        const timeout = setTimeout(() => {
          this.isConnecting = false;
          reject(new Error('WebSocket 연결 시간 초과'));
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.notifyListeners('CONNECTION', { status: 'connected' });
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.notifyListeners('CONNECTION', { status: 'disconnected', code: event.code, reason: event.reason });
          
          // 401 인증 오류인 경우 재연결 시도하지 않음
          if (event.code === 1006 && event.reason?.includes('401')) {
            this.notifyListeners('ERROR', { error: 'Authentication failed. Please login again.' });
            return;
          }
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.notifyListeners('ERROR', { error: error.message || 'WebSocket 연결 오류' });
          reject(error);
        };
      });
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  disconnect() {
    if (this.ws) {
      this.stopHeartbeat();
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.reconnectAttempts = 0;
  }

  private handleMessage(event: MessageEvent) {
    try {
      // 하트비트 업데이트 (메시지를 받았다는 것은 연결이 살아있다는 의미)
      this.lastHeartbeat = Date.now();
      
      
      // PONG 메시지 처리
      if (event.data === 'PONG') {
        if (this.pongTimeout) {
          clearTimeout(this.pongTimeout);
          this.pongTimeout = null;
        }
        return;
      }
      
      // JSON 파싱 시도
      let message: WebSocketMessage;
      try {
        message = JSON.parse(event.data);
      } catch (parseError) {
        return;
      }
      
      switch (message.type) {
        case 'PRICE_UPDATE':
          const priceData = message.data as PriceUpdate;
          this.notifyListeners('PRICE_UPDATE', priceData);
          break;
        case 'QUOTE_UPDATE':
          
          if (message.data?.orderBook) {
            message.data.orderBook.asks?.forEach((ask: any, index: number) => {
            });
            
            message.data.orderBook.bids?.forEach((bid: any, index: number) => {
            });
            
          }
          
          this.notifyListeners('QUOTE_UPDATE', message.data as QuoteUpdate);
          break;
        case 'SUBSCRIBE_QUOTE_SUCCESS':
          // 구독 성공 후 즉시 호가 데이터 요청하거나 대기
          break;
        case 'CONNECTION':
          this.notifyListeners('CONNECTION', message.data);
          break;
        case 'ERROR':
          this.notifyListeners('ERROR', message.data);
          break;
        case 'PORTFOLIO_UPDATE':
          this.notifyListeners('PORTFOLIO_UPDATE', message.data as PortfolioUpdate);
          break;
        case 'ORDER_UPDATE':
          this.notifyListeners('ORDER_UPDATE', message.data as OrderUpdate);
          break;
        case 'MARKET_UPDATE':
          this.notifyListeners('MARKET_UPDATE', message.data as MarketUpdate);
          break;
        default:
      }
    } catch (error) {
      this.notifyListeners('ERROR', { error: 'Message parsing error' });
    }
  }


  private scheduleReconnect() {
    this.reconnectAttempts++;
    
    setTimeout(() => {
      this.connect().catch(error => {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.notifyListeners('ERROR', { error: 'Maximum reconnection attempts exceeded' });
        }
      });
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  private notifyListeners(type: string, data: any) {
    const listeners = this.listeners.get(type);
    
    if (listeners) {
      listeners.forEach((listener, index) => {
        try {
          // 실제 데이터만 전달 (전체 메시지 래퍼 제거)
          listener(data);
        } catch (error) {
        }
      });
    } else {
    }
  }

  // 이벤트 리스너 등록
  onPriceUpdate(listener: (data: PriceUpdate) => void): () => void {
    return this.addEventListener('PRICE_UPDATE', listener);
  }

  onPortfolioUpdate(listener: (data: PortfolioUpdate) => void): () => void {
    return this.addEventListener('PORTFOLIO_UPDATE', listener);
  }

  onOrderUpdate(listener: (data: OrderUpdate) => void): () => void {
    return this.addEventListener('ORDER_UPDATE', listener);
  }

  onMarketUpdate(listener: (data: MarketUpdate) => void): () => void {
    return this.addEventListener('MARKET_UPDATE', listener);
  }

  onQuoteUpdate(listener: (data: QuoteUpdate) => void): () => void {
    return this.addEventListener('QUOTE_UPDATE', listener);
  }

  onConnection(listener: (data: any) => void): () => void {
    return this.addEventListener('CONNECTION', listener);
  }

  onError(listener: (data: any) => void): () => void {
    return this.addEventListener('ERROR', listener);
  }

  private addEventListener(type: string, listener: MessageListener): () => void {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);

    // 리스너 제거 함수 반환
    return () => {
      const currentListeners = this.listeners.get(type) || [];
      const index = currentListeners.indexOf(listener);
      if (index > -1) {
        currentListeners.splice(index, 1);
        this.listeners.set(type, currentListeners);
      }
    };
  }

  // 특정 상품 가격 업데이트 구독
  subscribeToProduct(productId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'SUBSCRIBE',
        data: { productId }
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  // 특정 상품 가격 업데이트 구독 해제
  unsubscribeFromProduct(productId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'UNSUBSCRIBE',
        data: { productId }
      }));
    }
  }

  // 포트폴리오 업데이트 구독
  subscribeToPortfolio() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SUBSCRIBE_PORTFOLIO'
      }));
    }
  }

  // 연결 상태 확인
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // 하트비트 시작
  private startHeartbeat() {
    this.lastHeartbeat = Date.now();
    
    // 10초마다 PING 전송
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('PING');
        
        // PONG 응답을 기다리는 타이머 (5초)
        this.pongTimeout = setTimeout(() => {
          this.checkConnectionHealth();
        }, 5000);
      } else {
        this.stopHeartbeat();
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      }
    }, 10000);

    // 30초마다 하트비트 상태 확인
    this.heartbeatInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, this.heartbeatTimeoutMs);
  }

  // 하트비트 중지
  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  // 연결 건강도 확인
  private checkConnectionHealth() {
    const now = Date.now();
    const timeSinceLastHeartbeat = now - this.lastHeartbeat;
    
    
    // 30초 이상 메시지가 없으면 연결이 끊어진 것으로 판단
    if (timeSinceLastHeartbeat > this.heartbeatTimeoutMs) {
      
      // WebSocket 상태가 OPEN이더라도 실제로는 끊어져있을 수 있음
      if (this.ws) {
        this.ws.close(1006, 'Heartbeat timeout');
      }
      
      this.stopHeartbeat();
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    }
  }

  // 연결 상태 반환
  getConnectionState(): string {
    if (!this.ws) return 'DISCONNECTED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'CONNECTED';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }

  // 실시간 호가 구독
  subscribeToQuote(productId: string) {
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      
      // 재연결 시도
      if (!this.isConnecting) {
        this.connect().then(() => {
          setTimeout(() => this.subscribeToQuote(productId), 500);
        }).catch(err => {
        });
      }
      return;
    }

    const message = {
      type: 'SUBSCRIBE_QUOTE',
      data: { productId }
    };
    
    const messageString = JSON.stringify(message);
    

    try {
      this.ws.send(messageString);
      
      // 백엔드 응답 대기 타이머 설정 (10초)
      setTimeout(() => {
      }, 10000);
    } catch (error) {
    }
  }

  // 실시간 호가 구독 해제
  unsubscribeFromQuote(productId: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = JSON.stringify({
      type: 'UNSUBSCRIBE_QUOTE',
      data: { productId }
    });

    try {
      this.ws.send(message);
    } catch (error) {
    }
  }
}

// WebSocket 서비스 인스턴스 생성 및 내보내기
export const webSocketService = new WebSocketService();