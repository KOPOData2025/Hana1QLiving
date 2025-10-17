import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  webSocketService,
  PriceUpdate,
  PortfolioUpdate,
  OrderUpdate,
  MarketUpdate,
  QuoteUpdate
} from '@/services/websocketService';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectOnAppActive?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    reconnectOnAppActive = true
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('DISCONNECTED');
  const [error, setError] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);

  const connect = useCallback(async () => {
    try {
      setError(null);
      
      // 토큰이 있는지 확인
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('로그인이 필요합니다');
        return;
      }
      
      await webSocketService.connect();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'WebSocket 연결 실패';
      setError(errorMessage);
    }
  }, []);

  const disconnect = useCallback(() => {
    webSocketService.disconnect();
  }, []);

  useEffect(() => {
    const removeConnectionListener = webSocketService.onConnection((data) => {
      setIsConnected(data.status === 'connected');
      setConnectionState(webSocketService.getConnectionState());
      if (data.status === 'connected') {
        setError(null);
      }
    });

    // 에러 리스너
    const removeErrorListener = webSocketService.onError((data) => {
      setError(data.error);
    });

    // 앱 상태 변경 리스너
    let appStateSubscription: any = null;
    
    if (reconnectOnAppActive) {
      const handleAppStateChange = (nextAppState: string) => {
        
        if (appState.current.match(/inactive|background/) && 
            nextAppState === 'active') {
          // 앱이 활성화되면 연결 상태 확인 후 필요시 재연결
          const currentState = webSocketService.getConnectionState();
          
          if (!webSocketService.isConnected()) {
            connect();
          }
        }
        appState.current = nextAppState;
      };

      appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    }

    // 자동 연결
    if (autoConnect) {
      connect();
    }

    return () => {
      removeConnectionListener();
      removeErrorListener();
      if (appStateSubscription) {
        appStateSubscription.remove();
      }
    };
  }, [autoConnect, reconnectOnAppActive, connect]);

  return {
    isConnected,
    connectionState,
    error,
    connect,
    disconnect
  };
}

export function usePriceUpdates(productIds?: string[]) {
  const [priceUpdates, setPriceUpdates] = useState<Map<string, PriceUpdate>>(new Map());

  useEffect(() => {
    const removePriceListener = webSocketService.onPriceUpdate((data) => {
      if (!data || !data.productId) {
        return;
      }

      setPriceUpdates(prev => {
        const newMap = new Map(prev);
        newMap.set(data.productId, {
          ...data,
          timestamp: data.timestamp || Date.now()
        });
        return newMap;
      });
    });

    // 특정 상품 구독 (한 번만 실행)
    if (productIds && productIds.length > 0) {
      productIds.forEach(productId => {
        webSocketService.subscribeToProduct(productId);
      });
    }

    return () => {
      removePriceListener();
      // 구독 해제
      if (productIds && productIds.length > 0) {
        productIds.forEach(productId => {
          webSocketService.unsubscribeFromProduct(productId);
        });
      }
    };
  }, [productIds?.join(',')]); // 배열 내용이 실제로 바뀔 때만 재실행

  const getPriceUpdate = useCallback((productId: string) => {
    return priceUpdates.get(productId);
  }, [priceUpdates]);

  return {
    priceUpdates: Array.from(priceUpdates.values()),
    getPriceUpdate
  };
}

export function usePortfolioUpdates() {
  const [portfolioUpdate, setPortfolioUpdate] = useState<PortfolioUpdate | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  useEffect(() => {
    const removePortfolioListener = webSocketService.onPortfolioUpdate((data) => {
      setPortfolioUpdate(data);
      setLastUpdated(Date.now());
    });

    // 포트폴리오 업데이트 구독
    webSocketService.subscribeToPortfolio();

    return () => {
      removePortfolioListener();
    };
  }, []);

  return {
    portfolioUpdate,
    lastUpdated
  };
}

export function useOrderUpdates() {
  const [orderUpdates, setOrderUpdates] = useState<OrderUpdate[]>([]);

  useEffect(() => {
    const removeOrderListener = webSocketService.onOrderUpdate((data) => {
      setOrderUpdates(prev => {
        // 최신 20개만 유지
        const updated = [data, ...prev].slice(0, 20);
        return updated;
      });
    });

    return () => {
      removeOrderListener();
    };
  }, []);

  const getOrderUpdate = useCallback((orderId: string) => {
    return orderUpdates.find(update => update.orderId === orderId);
  }, [orderUpdates]);

  const clearOrderUpdates = useCallback(() => {
    setOrderUpdates([]);
  }, []);

  return {
    orderUpdates,
    getOrderUpdate,
    clearOrderUpdates
  };
}

export function useMarketData() {
  const [marketUpdate, setMarketUpdate] = useState<MarketUpdate | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  useEffect(() => {
    const removeMarketListener = webSocketService.onMarketUpdate((data) => {
      setMarketUpdate(data);
      setLastUpdated(Date.now());
    });

    return () => {
      removeMarketListener();
    };
  }, []);

  return {
    marketUpdate,
    lastUpdated
  };
}

export function useQuoteUpdates(productId?: string) {
  const [quoteUpdate, setQuoteUpdate] = useState<QuoteUpdate | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    
    if (!productId) {
      setIsSubscribed(false);
      setQuoteUpdate(null);
      return;
    }

    const removeQuoteListener = webSocketService.onQuoteUpdate((data) => {
      if (data.productId === productId) {
        setQuoteUpdate(data);
        setLastUpdated(Date.now());
      }
    });

    // WebSocket이 연결되어 있는지 확인 후 구독
    const attemptSubscription = () => {
      if (webSocketService.isConnected()) {
        webSocketService.subscribeToQuote(productId);
        setIsSubscribed(true);
      } else {
        // 연결을 기다리는 리스너 추가
        const removeConnectionListener = webSocketService.onConnection((data) => {
          if (data.status === 'connected') {
            webSocketService.subscribeToQuote(productId);
            setIsSubscribed(true);
            removeConnectionListener();
          }
        });
        
        // 5초 후에도 연결이 안 되면 강제 시도
        setTimeout(() => {
          webSocketService.subscribeToQuote(productId);
          setIsSubscribed(true);
        }, 5000);
      }
    };

    attemptSubscription();

    return () => {
      removeQuoteListener();
      // 호가 구독 해제
      if (productId) {
        webSocketService.unsubscribeFromQuote(productId);
        setIsSubscribed(false);
      }
    };
  }, [productId]);

  const refreshQuote = useCallback(() => {
    if (productId && isSubscribed) {
      webSocketService.unsubscribeFromQuote(productId);
      setTimeout(() => {
        webSocketService.subscribeToQuote(productId);
      }, 100);
    }
  }, [productId, isSubscribed]);

  return {
    quoteUpdate,
    lastUpdated,
    isSubscribed,
    refreshQuote
  };
}

// 여러 hook을 조합한 완전한 투자 데이터 hook
export function useInvestmentData(options: {
  productIds?: string[];
  includePortfolio?: boolean;
  includeOrders?: boolean;
  includeMarket?: boolean;
} = {}) {
  const {
    productIds,
    includePortfolio = true,
    includeOrders = true,
    includeMarket = true
  } = options;

  const websocket = useWebSocket({ autoConnect: false }); // WebSocket 자동 연결 비활성화
  const prices = usePriceUpdates(productIds);
  const portfolio = includePortfolio ? usePortfolioUpdates() : null;
  const orders = includeOrders ? useOrderUpdates() : null;
  const market = includeMarket ? useMarketData() : null;

  return {
    websocket,
    prices,
    portfolio,
    orders,
    market
  };
}