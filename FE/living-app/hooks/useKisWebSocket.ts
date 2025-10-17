import { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { KisStockPriceResponse, KisReitsItem } from '@/services/investmentApi';

interface KisWebSocketConfig {
  url?: string;
  enableRealtimePrice?: boolean;
  enableMarketData?: boolean;
  enableQuotation?: boolean;
  stockCodes?: string[];
}

interface KisWebSocketData {
  realtimePrice: KisReitsItem | null;
  marketData: KisReitsItem[] | null;
  quotationData: KisStockPriceResponse | null;
  connectionStatus: {
    isConnected: boolean;
    connectionTime: Date | null;
    lastUpdate: Date | null;
    error: string | null;
  };
}

export const useKisWebSocket = (config: KisWebSocketConfig = {}) => {
  const {
    url = process.env.EXPO_PUBLIC_INVESTMENT_API_URL + '/ws/reits-realtime',
    enableRealtimePrice = false,
    enableMarketData = false,
    enableQuotation = false,
    stockCodes = []
  } = config;

  const [data, setData] = useState<KisWebSocketData>({
    realtimePrice: null,
    marketData: null,
    quotationData: null,
    connectionStatus: {
      isConnected: false,
      connectionTime: null,
      lastUpdate: null,
      error: null
    }
  });

  const clientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!enableRealtimePrice && !enableMarketData && !enableQuotation) {
      return;
    }

    const socket = new SockJS(url);
    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: {},
      debug: (str) => {
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = (frame) => {
      
      setData(prev => ({
        ...prev,
        connectionStatus: {
          ...prev.connectionStatus,
          isConnected: true,
          connectionTime: new Date(),
          error: null
        }
      }));

      // 실시간 가격 구독
      if (enableRealtimePrice) {
        const priceSubscription = client.subscribe('/topic/reits/market', (message) => {
          try {
            const kisResponse = JSON.parse(message.body);
            if (kisResponse.rt_cd === '0' && kisResponse.reits_list) {
              setData(prev => ({
                ...prev,
                marketData: kisResponse.reits_list,
                connectionStatus: {
                  ...prev.connectionStatus,
                  lastUpdate: new Date()
                }
              }));
            }
          } catch (error) {
          }
        });
        subscriptionsRef.current.push(priceSubscription);

        // 개별 종목별 구독
        stockCodes.forEach(stockCode => {
          const stockSubscription = client.subscribe(`/topic/reits/stock/${stockCode}`, (message) => {
            try {
              const kisResponse = JSON.parse(message.body);
              if (kisResponse.rt_cd === '0' && kisResponse.output) {
                setData(prev => ({
                  ...prev,
                  realtimePrice: kisResponse.output,
                  connectionStatus: {
                    ...prev.connectionStatus,
                    lastUpdate: new Date()
                  }
                }));
              }
            } catch (error) {
            }
          });
          subscriptionsRef.current.push(stockSubscription);
        });
      }

      // 호가 정보 구독
      if (enableQuotation) {
        stockCodes.forEach(stockCode => {
          const quotationSubscription = client.subscribe(`/topic/reits/quotation/${stockCode}`, (message) => {
            try {
              const kisResponse = JSON.parse(message.body);
              if (kisResponse.rt_cd === '0' && kisResponse.output) {
                setData(prev => ({
                  ...prev,
                  quotationData: kisResponse.output,
                  connectionStatus: {
                    ...prev.connectionStatus,
                    lastUpdate: new Date()
                  }
                }));
              }
            } catch (error) {
            }
          });
          subscriptionsRef.current.push(quotationSubscription);
        });
      }

      // 에러 메시지 구독
      const errorSubscription = client.subscribe('/topic/reits/error', (message) => {
        try {
          const errorResponse = JSON.parse(message.body);
          setData(prev => ({
            ...prev,
            connectionStatus: {
              ...prev.connectionStatus,
              error: errorResponse.msg1,
              lastUpdate: new Date()
            }
          }));
        } catch (error) {
        }
      });
      subscriptionsRef.current.push(errorSubscription);

      // 구독 시작 메시지 전송
      client.publish({
        destination: '/app/reits/subscribe',
        body: JSON.stringify({
          stock_code: stockCodes.join(','),
          market_code: 'ALL'
        })
      });
    };

    client.onStompError = (frame) => {
      setData(prev => ({
        ...prev,
        connectionStatus: {
          ...prev.connectionStatus,
          isConnected: false,
          error: frame.headers['message']
        }
      }));
    };

    client.onWebSocketClose = () => {
      setData(prev => ({
        ...prev,
        connectionStatus: {
          ...prev.connectionStatus,
          isConnected: false,
          connectionTime: null
        }
      }));
    };

    client.activate();
    clientRef.current = client;

    return () => {
      // 모든 구독 해제
      subscriptionsRef.current.forEach(subscription => {
        subscription.unsubscribe();
      });
      subscriptionsRef.current = [];

      // 클라이언트 연결 해제
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    };
  }, [url, enableRealtimePrice, enableMarketData, enableQuotation, stockCodes.join(',')]);

  const subscribeToStock = (stockCode: string) => {
    if (clientRef.current?.connected) {
      const subscription = clientRef.current.subscribe(`/topic/reits/stock/${stockCode}`, (message) => {
        try {
          const kisResponse = JSON.parse(message.body);
          if (kisResponse.rt_cd === '0' && kisResponse.output) {
            setData(prev => ({
              ...prev,
              realtimePrice: kisResponse.output,
              connectionStatus: {
                ...prev.connectionStatus,
                lastUpdate: new Date()
              }
            }));
          }
        } catch (error) {
        }
      });
      subscriptionsRef.current.push(subscription);
      return subscription;
    }
    return null;
  };

  const unsubscribeFromStock = (subscription: any) => {
    if (subscription) {
      subscription.unsubscribe();
      subscriptionsRef.current = subscriptionsRef.current.filter(sub => sub !== subscription);
    }
  };

  return {
    ...data,
    subscribeToStock,
    unsubscribeFromStock,
    isConnected: data.connectionStatus.isConnected
  };
};