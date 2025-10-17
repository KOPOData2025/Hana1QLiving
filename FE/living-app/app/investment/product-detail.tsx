import { AnimatedPrice } from "@/components/AnimatedPrice";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";
import {
  usePriceUpdates,
  useQuoteUpdates,
  useWebSocket,
} from "@/hooks/useWebSocket";
import { buildingAPI, financialAPI, unitAPI } from "@/services/api";
import {
  HanaLivingDividend,
  investmentApi,
  InvestmentProduct,
  OrderRequest,
  OrderResponse,
  StockDetailInfo,
} from "@/services/investmentApi";
import { OrderBook } from "@/services/websocketService";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { mobileApi } from "../../services/mobileApi";

const { width } = Dimensions.get("window");

// 상수값들을 컴포넌트 외부로 이동하여 리렌더링 시 재생성 방지
const DEFAULT_QUANTITY = "1";
const DEFAULT_YEAR = "최근 3년";
const MARKET_HOURS = {
  START: { hour: 9, minute: 0 },
  END: { hour: 15, minute: 30 },
} as const;

// 에러 메시지 상수
const ERROR_MESSAGES = {
  PRODUCT_NOT_FOUND: "상품 정보를 찾을 수 없습니다.",
  PRODUCT_LOAD_FAILED: "상품 정보를 불러오는 중 오류가 발생했습니다.",
  INVALID_QUANTITY: "수량을 올바르게 입력해주세요.",
  INVALID_PRICE: "단가를 올바르게 입력해주세요.",
  NO_ACCOUNT: "계좌번호를 입력해주세요.",
  ORDER_FAILED: "주문 처리 중 오류가 발생했습니다.",
} as const;

// 년도 필터 배열
const YEAR_FILTERS = ["최근 3년", "2025", "2024", "2023", "2022"] as const;

// 테마 색상 상수
const THEME_COLORS = {
  priceUp: "#FF6B6B",
  priceDown: "#007AFF",
  priceNeutral: "#00B894",
  priceUpLight: "rgba(255, 107, 107, 0.08)",
  priceDownLight: "rgba(77, 171, 247, 0.08)",
  priceUpHighlight: "rgba(255, 107, 107, 0.05)",
} as const;

// 카드 Shadow 스타일
const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 3.84,
  elevation: 5,
} as const;

interface OrderEstimate {
  totalAmount: number;
  fees: number;
  tax: number;
  netAmount: number;
}

interface LinkedAccount {
  id: number;
  userId: number;
  userCi: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  status: string;
  linkToken: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProductDetailScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { user } = useAuth();

  const [product, setProduct] = useState<InvestmentProduct | null>(null);
  const [stockDetail, setStockDetail] = useState<StockDetailInfo | null>(null);
  const [hanaLivingDividends, setHanaLivingDividends] = useState<
    HanaLivingDividend[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [stockDetailLoading, setStockDetailLoading] = useState(true);
  const [hanaLivingDividendLoading, setHanaLivingDividendLoading] =
    useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(DEFAULT_YEAR);
  const [buildingOperationalData, setBuildingOperationalData] = useState<any[]>(
    []
  );
  const [buildingOperationalLoading, setBuildingOperationalLoading] =
    useState(false);
  const [aggregatedMonthlyData, setAggregatedMonthlyData] = useState<any[]>([]);
  const [regionDistribution, setRegionDistribution] = useState<Record<string, { count: number; percentage: number }>>({});

  // 주문 관련 상태
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState(DEFAULT_QUANTITY);
  const [unitPrice, setUnitPrice] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [estimate, setEstimate] = useState<OrderEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<LinkedAccount | null>(
    null
  );
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  // 탭 관련 상태
  type TabType = "BUY" | "SELL" | "DIVIDEND" | "PORTFOLIO";
  const [activeTab, setActiveTab] = useState<TabType>("BUY");

  // 호가창 스크롤 ref 및 초기화 상태
  const orderBookScrollRef = React.useRef<ScrollView>(null);
  const [orderBookInitialized, setOrderBookInitialized] = useState(false);

  // 실시간 가격 업데이트 - 여러 ID 형식으로 구독 (메모이제이션으로 최적화)
  const subscriptionIds = useMemo(() => {
    if (!product && !productId) return [];
    if (!product) return [productId];

    return [
      product.productId,
      product.productCode,
      String(product.productId),
      String(product.productCode),
      productId, // URL에서 온 productId도 포함
    ].filter(
      (id, index, arr) =>
        id && id !== "undefined" && id !== "null" && arr.indexOf(id) === index
    );
  }, [product?.productId, product?.productCode, productId]);

  const { getPriceUpdate } = usePriceUpdates(subscriptionIds);
  const websocket = useWebSocket({ autoConnect: true });

  // 실시간 호가 구독 - productId 직접 사용 (안정적)
  const quoteHookResult = useQuoteUpdates(productId as string);
  const { quoteUpdate, lastUpdated, isSubscribed, refreshQuote } =
    quoteHookResult;

  useEffect(() => {
    if (productId) {
      loadProductDetail();
      loadStockDetailInfo();
      loadLinkedAccounts();
    }
  }, [productId]);

  // product가 로드된 후 배당 정보 로드
  useEffect(() => {
    if (product?.productCode) {
      loadHanaLivingDividends();
    }
  }, [product?.productCode]);

  // 포트폴리오 데이터 프리페칭 (백그라운드)
  useEffect(() => {
    if (productId) {
      // 백그라운드에서 포트폴리오 데이터 미리 로드
      const prefetchPortfolioData = async () => {
        try {
          // 3개 API 병렬 호출 (포트폴리오 화면과 동일)
          await Promise.all([
            investmentApi.getPortfolio().catch(() => null),
            investmentApi.getPortfolioSummary().catch(() => null),
            investmentApi.getTradingProfitLoss().catch(() => null),
          ]);
        } catch (error) {
          // 에러 발생 시 조용히 무시 (사용자 경험에 영향 없음)
        }
      };

      // 약간의 지연 후 실행 (현재 화면 로딩 우선순위 보장)
      const timeoutId = setTimeout(prefetchPortfolioData, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [productId]);

  // 포트폴리오 탭 활성화 시 건물 운영 데이터 로드
  // 포트폴리오 데이터 미리 로드 (컴포넌트 마운트 시)
  useEffect(() => {
    if (productId && buildingOperationalData.length === 0) {
      loadBuildingOperationalData();
    }
  }, [productId]);

  // 정규장 시간 체크 함수 (메모이제이션으로 최적화)
  const isMarketOpen = useCallback((): boolean => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const dayOfWeek = now.getDay(); // 0: 일요일, 6: 토요일

    // 주말은 장 마감
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    // 평일 정규장 시간 체크
    if (hour < MARKET_HOURS.START.hour) return false;
    if (hour > MARKET_HOURS.END.hour) return false;
    if (hour === MARKET_HOURS.END.hour && minute > MARKET_HOURS.END.minute)
      return false;

    return true;
  }, []);

  // 자동 현재가 적용 및 주기적 업데이트
  useEffect(() => {
    if (product) {
      const marketOpen = isMarketOpen();

      if (marketOpen) {
        const currentPrice = getCurrentPrice();
        setUnitPrice(currentPrice.toString());
      } else {
        const applyClosingPrice = async () => {
          try {
            const realtimePrice = await refreshCurrentPrice();
            setUnitPrice(realtimePrice.toString());
          } catch (error) {
            setUnitPrice(product.currentPrice.toString());
          }
        };

        applyClosingPrice();
      }

      calculateEstimate();
    }
  }, [product]);

  // 수량이나 단가가 변경되면 견적 재계산 (debounced)
  useEffect(() => {
    if (product && quantity && unitPrice) {
      // 실시간 가격 변동으로 인한 불필요한 견적 API 호출 방지
      const debounceTimer = setTimeout(() => {
        calculateEstimate();
      }, 500); // 500ms 지연

      return () => clearTimeout(debounceTimer);
    }
  }, [quantity, unitPrice, product]);

  // 정규장 시간에만 WebSocket 데이터로 단가 자동 업데이트
  useEffect(() => {
    if (product && isMarketOpen()) {
      const currentPrice = getCurrentPrice();
      if (currentPrice > 0 && currentPrice !== Number(unitPrice)) {
        setUnitPrice(currentPrice.toString());
      }
    }
  }, [product, getPriceUpdate(product?.productId || "")]);

  // 호가창 스크롤을 현재가 중앙으로 설정 (초기 로딩 시에만)
  useEffect(() => {
    const orderBook = getOrderBook();
    if (orderBook && orderBookScrollRef.current && !orderBookInitialized) {
      const currentPrice = getCurrentPrice();

      // 모든 호가를 가격 높은 순으로 정렬
      const sortedAsks = [...orderBook.asks].sort((a, b) => b.price - a.price);
      const sortedBids = [...orderBook.bids].sort((a, b) => b.price - a.price);
      const allQuotes = [
        ...sortedAsks.map((ask) => ({ ...ask, type: "ask" })),
        ...sortedBids.map((bid) => ({ ...bid, type: "bid" })),
      ].sort((a, b) => b.price - a.price);

      // 현재가와 가장 가까운 호가의 인덱스 찾기
      const currentPriceIndex = allQuotes.findIndex(
        (quote) => Math.abs(quote.price - currentPrice) < 1
      );

      if (currentPriceIndex >= 0) {
        const rowHeight = 34; // 각 호가 행의 높이
        // 현재가가 화면 중앙에 오도록 스크롤 위치 계산
        const scrollToPosition = currentPriceIndex * rowHeight - 200; // 200은 뷰포트 높이의 절반

        // 약간의 지연 후 스크롤 (렌더링 완료 대기)
        setTimeout(() => {
          orderBookScrollRef.current?.scrollTo({
            y: Math.max(0, scrollToPosition),
            animated: false,
          });
          setOrderBookInitialized(true);
        }, 100);
      }
    }
  }, [product]); // 상품 정보 로딩 시에만 실행

  // activeTab과 orderType 동기화
  useEffect(() => {
    if (activeTab === "BUY") {
      setOrderType("BUY");
    } else if (activeTab === "SELL") {
      setOrderType("SELL");
    }
  }, [activeTab]);

  const loadProductDetail = async () => {
    try {
      setLoading(true);
      const response = await investmentApi.getInvestmentProduct(productId);

      if (response.success && response.data) {
        // API 응답 데이터를 안전하게 변환
        const safeProduct: InvestmentProduct = {
          ...response.data,
          currentPrice: Number(response.data.currentPrice) || 0,
          nav: Number(response.data.nav) || 0,
          totalReturn: Number(response.data.totalReturn) || 0,
          dividendYield: Number(response.data.dividendYield) || 0,
          riskLevel: Number(response.data.riskLevel) || 3,
          minInvestment: Number(response.data.minInvestment) || 0,
          managementFee: Number(response.data.managementFee) || 0,
          trustFee: Number(response.data.trustFee) || 0,
          totalAssets: Number(response.data.totalAssets) || 0,
          manager: response.data.manager || "-",
          benchmark: response.data.benchmark || "-",
          inceptionDate: response.data.inceptionDate || "",
          description: response.data.description || "",
          name:
            response.data.name ||
            response.data.productName ||
            `상품-${productId}`, // name 필드 추가
        };
        setProduct(safeProduct);
      } else {
        Alert.alert("오류", ERROR_MESSAGES.PRODUCT_NOT_FOUND);
        router.back();
      }
    } catch (error) {
      Alert.alert("오류", ERROR_MESSAGES.PRODUCT_LOAD_FAILED);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadStockDetailInfo = async () => {
    try {
      setStockDetailLoading(true);
      // productId를 종목코드로 사용 (REITs 종목코드)
      const response = await investmentApi.getRealtimeStockPrice(productId);

      if (response.success && response.data) {
        // response.data.data로 2중 중첩되어 있음
        const priceData = response.data.data || response.data;

        // 실시간 가격 응답에서 고가/저가, 거래량 정보 추출
        // 다양한 필드명 시도 (한국투자증권 API 등 다양한 형식 대응)
        const stockDetailData = {
          volume: priceData.accVolume || priceData.acml_vol || priceData.volume || 0,
          // 당일 고가 (우선순위: stck_hgpr > high_price > high > currentPrice)
          high52Week: priceData.stck_hgpr || priceData.stckHgpr ||
                      priceData.high_price || priceData.highPrice || priceData.high ||
                      priceData.high52Week || priceData.w52Hgpr || priceData.w52_hgpr ||
                      priceData.currentPrice || null,
          // 당일 저가 (우선순위: stck_lwpr > low_price > low > currentPrice)
          low52Week: priceData.stck_lwpr || priceData.stckLwpr ||
                     priceData.low_price || priceData.lowPrice || priceData.low ||
                     priceData.low52Week || priceData.w52Lwpr || priceData.w52_lwpr ||
                     priceData.currentPrice || null,
        };
        setStockDetail(stockDetailData);
      }
    } catch (error) {
    } finally {
      setStockDetailLoading(false);
    }
  };

  const loadHanaLivingDividends = async () => {
    try {
      setHanaLivingDividendLoading(true);
      // product.productCode를 사용하여 배당 정보 조회 (리츠 순위와 동일한 API)
      if (!product?.productCode) {
        setHanaLivingDividendLoading(false);
        return;
      }
      const response = await investmentApi.getProductDividends(product.productCode);
      if (response.success && response.data) {
        // 데이터 안전성 확인 및 기본값 설정
        const safeData = response.data.map((item: any) => ({
          ...item,
          CALCULATED_YIELD_PERCENT:
            item.CALCULATED_YIELD_PERCENT || item.ORIGINAL_RATE * 100 || 0,
          ORIGINAL_RATE: item.ORIGINAL_RATE || item.DIVIDEND_RATE || 0,
          BASE_PRICE: item.BASE_PRICE || 0,
          DIVIDEND_AMOUNT: item.DIVIDEND_AMOUNT || 0,
        }));
        setHanaLivingDividends(safeData);
      }
    } catch (error) {
      // 실패해도 기본 상품 정보는 표시하도록 에러를 무시
    } finally {
      setHanaLivingDividendLoading(false);
    }
  };

  const loadBuildingOperationalData = async () => {
    try {
      setBuildingOperationalLoading(true);
      // 리츠 상품에 포함된 건물 목록 조회
      const buildingsResponse = await investmentApi.getReitBuildings(productId);

      if (
        buildingsResponse.success &&
        buildingsResponse.data &&
        Array.isArray(buildingsResponse.data)
      ) {
        const buildings = buildingsResponse.data;
        const allMonthlyDataByBuilding: any[][] = [];

        // 각 건물에 대해 재무 데이터, 유닛 데이터, 건물 상세 정보, 월별 데이터 병렬로 가져오기
        const buildingDataPromises = buildings.map(async (building: any) => {
          try {
            const [financialRes, unitsRes, buildingDetailRes, monthlyRes] =
              await Promise.all([
                financialAPI
                  .getFinancialDashboard(building.buildingId)
                  .catch(() => null),
                unitAPI
                  .getUnitsByBuilding(building.buildingId)
                  .catch(() => null),
                buildingAPI
                  .getBuildingDetail(building.buildingId.toString())
                  .catch(() => null),
                financialAPI
                  .getMonthlyTrend(building.buildingId)
                  .catch(() => null),
              ]);

            // 재무 데이터 추출
            const financialData = financialRes?.data?.data || null;
            const totalRevenue = financialData?.totalRevenue || 0;
            const totalExpense = financialData?.totalExpense || 0;
            const netProfit = financialData?.netProfit || 0;
            const profitMargin = financialData?.profitMargin || 0;

            // 유닛 데이터에서 입주율 계산
            const units = unitsRes?.data?.data || [];
            const totalUnits = units.length;
            const occupiedUnits = units.filter(
              (unit: any) =>
                unit.status === "OCCUPIED" || unit.status === "occupied"
            ).length;
            const occupancyRate =
              totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

            // 건물 이미지 및 지역 정보 추출
            const buildingDetail = buildingDetailRes?.data?.data || null;
            const imageUrls = buildingDetail?.imageUrls || [];
            const imageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

            // 주소에서 시/구 정보 추출
            let city = buildingDetail?.city || "";
            let district = buildingDetail?.district || "";

            if (!city && !district && buildingDetail?.address) {
              const address = buildingDetail.address;
              // "서울 중구 왕십리로 407" 형식에서 "서울"과 "중구" 추출
              const parts = address.split(' ');
              if (parts.length >= 2) {
                city = parts[0]; // "서울", "광명시" 등
                district = parts[1]; // "중구", "오리로" 등
              }
            }

            // 월별 데이터 수집
            const monthlyData = monthlyRes?.data?.data || [];
            if (Array.isArray(monthlyData) && monthlyData.length > 0) {
              allMonthlyDataByBuilding.push(monthlyData);
            }

            return {
              buildingId: building.buildingId,
              buildingName:
                building.buildingName || `건물 ${building.buildingId}`,
              imageUrl,
              city,
              district,
              totalRevenue,
              netProfit,
              profitMargin,
              occupancyRate,
              totalUnits,
              occupiedUnits,
              hasData: financialData !== null || units.length > 0,
            };
          } catch (error) {
            // 개별 건물 데이터 로드 실패 시 기본값 반환
            return {
              buildingId: building.buildingId,
              buildingName:
                building.buildingName || `건물 ${building.buildingId}`,
              imageUrl: null,
              totalRevenue: 0,
              netProfit: 0,
              profitMargin: 0,
              occupancyRate: 0,
              totalUnits: 0,
              occupiedUnits: 0,
              hasData: false,
            };
          }
        });

        const buildingData = await Promise.all(buildingDataPromises);
        setBuildingOperationalData(buildingData);

        // 지역별 분포 계산
        const regionMap = new Map<string, number>();
        buildingData.forEach((building) => {
          if (building.city && building.district) {
            const regionKey = `${building.city} ${building.district}`;
            regionMap.set(regionKey, (regionMap.get(regionKey) || 0) + 1);
          }
        });

        const totalBuildings = buildingData.length;
        const regionDist: Record<string, { count: number; percentage: number }> = {};
        regionMap.forEach((count, region) => {
          regionDist[region] = {
            count,
            percentage: totalBuildings > 0 ? (count / totalBuildings) * 100 : 0,
          };
        });
        setRegionDistribution(regionDist);

        // 월별 데이터 합산
        if (allMonthlyDataByBuilding.length > 0) {
          const monthlyMap = new Map<string, number>();

          allMonthlyDataByBuilding.forEach((buildingMonthly) => {
            buildingMonthly.forEach((monthData: any) => {
              const month = monthData.month || monthData.yearMonth || "";
              const revenue = monthData.revenue || monthData.totalRevenue || 0;

              if (month) {
                monthlyMap.set(month, (monthlyMap.get(month) || 0) + revenue);
              }
            });
          });

          // Map을 배열로 변환하고 날짜순 정렬
          const aggregated = Array.from(monthlyMap.entries())
            .map(([month, revenue]) => ({ month, revenue }))
            .sort((a, b) => a.month.localeCompare(b.month));

          setAggregatedMonthlyData(aggregated);
        }
      }
    } catch (error) {
      // 실패해도 다른 정보는 표시하도록 에러를 무시
    } finally {
      setBuildingOperationalLoading(false);
    }
  };

  const loadLinkedAccounts = async () => {
    try {
      const response = await mobileApi.get("/api/securities-accounts/linked");

      // mobileApi는 createRetryableAPI를 통해 순수한 데이터만 반환함
      const accounts = Array.isArray(response) ? response : [];
      setLinkedAccounts(accounts);

      // 첫 번째 활성 계좌를 기본 선택
      const activeAccount = accounts.find(
        (account: LinkedAccount) => account.status === "ACTIVE"
      );
      if (activeAccount) {
        setSelectedAccount(activeAccount);
        setAccountNumber(activeAccount.accountNumber);
      } else if (accounts.length > 0) {
        setSelectedAccount(accounts[0]);
        setAccountNumber(accounts[0].accountNumber);
      } else {
      }
    } catch (error) {
      // 사용자에게 알림을 표시하지 않고 조용히 처리 (계좌가 없을 수도 있음)
    }
  };

  const calculateEstimate = async () => {
    if (!product || !isValidNumber(quantity) || !isValidNumber(unitPrice)) {
      setEstimate(null);
      return;
    }

    try {
      setEstimating(true);
      const response = await investmentApi.estimateOrder({
        productId: product.productId,
        orderType,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
      });

      if (response.success && response.data) {
        setEstimate(response.data);
      } else {
        setEstimate(null);
      }
    } catch (error) {
      setEstimate(null);
    } finally {
      setEstimating(false);
    }
  };

  const validateOrder = (): boolean => {
    if (!isValidNumber(quantity)) {
      Alert.alert("입력 오류", ERROR_MESSAGES.INVALID_QUANTITY);
      return false;
    }

    if (!isValidNumber(unitPrice)) {
      Alert.alert("입력 오류", ERROR_MESSAGES.INVALID_PRICE);
      return false;
    }

    if (
      product &&
      Number(quantity) < product.minInvestment / Number(unitPrice)
    ) {
      const minQuantity = Math.ceil(product.minInvestment / Number(unitPrice));
      Alert.alert(
        "입력 오류",
        `최소 투자금액은 ${formatCurrency(
          product.minInvestment
        )}이므로 최소 ${minQuantity}주 이상 주문해주세요.`
      );
      return false;
    }

    if (!accountNumber.trim()) {
      Alert.alert("입력 오류", ERROR_MESSAGES.NO_ACCOUNT);
      return false;
    }

    return true;
  };

  const handleOrderSubmit = async () => {
    if (!validateOrder() || !product || !user || !estimate) return;

    try {
      setOrdering(true);

      const orderRequest: OrderRequest = {
        userId: user.id,
        productId: product.productId,
        orderType,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        accountNumber: accountNumber.trim(),
        password: "1234", // Mock 환경에서 고정 비밀번호 사용
        channel: "APP",
      };

      const response: OrderResponse =
        orderType === "BUY"
          ? await investmentApi.createBuyOrder(orderRequest)
          : await investmentApi.createSellOrder(orderRequest);

      if (response.success) {
        Alert.alert(
          "주문 완료",
          `${
            orderType === "BUY" ? "매수" : "매도"
          } 주문이 성공적으로 처리되었습니다.\n주문번호: ${response.orderId}`,
          [
            {
              text: "확인",
              onPress: () => {
                router.push("/investment/transactions");
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "주문 실패",
          response.message || ERROR_MESSAGES.ORDER_FAILED
        );
      }
    } catch (error: any) {
      let errorMessage = ERROR_MESSAGES.ORDER_FAILED;
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("주문 실패", errorMessage);
    } finally {
      setOrdering(false);
      setConfirmModalVisible(false);
    }
  };

  // 숫자 유효성 검증 유틸 함수
  const isValidNumber = (value: string | undefined | null): boolean => {
    return !!value && !isNaN(Number(value)) && Number(value) > 0;
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    const safeAmount = Number(amount) || 0;
    if (isNaN(safeAmount)) return "0";
    return new Intl.NumberFormat("ko-KR").format(safeAmount);
  };

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined || num === null || isNaN(num)) return "0";
    return new Intl.NumberFormat("ko-KR").format(num);
  };

  const getAccountTypeText = (type: string): string => {
    switch (type) {
      case "NORMAL":
        return "일반계좌";
      case "ISA":
        return "ISA계좌";
      case "PENSION":
        return "연금계좌";
      default:
        return type;
    }
  };

  const formatRate = (rate: number | undefined | null): string => {
    const safeRate = Number(rate) || 0;
    if (isNaN(safeRate)) return "0.00%";
    const sign = safeRate >= 0 ? "+" : "";
    return `${sign}${safeRate.toFixed(2)}%`;
  };

  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "-";
      return date.toLocaleDateString("ko-KR");
    } catch {
      return "-";
    }
  };

  const renderInfoItem = (
    label: string,
    value: string | number,
    highlightColor?: 'red' | 'blue'
  ): JSX.Element => (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueContainer}>
        <Text style={[
          styles.infoValue,
          highlightColor === 'red' && styles.infoValueRed,
          highlightColor === 'blue' && styles.infoValueBlue
        ]}>{value}</Text>
      </View>
    </View>
  );

  const renderAccountOption = (account: any) => (
    <TouchableOpacity
      key={account.id}
      style={[
        styles.accountOption,
        selectedAccount?.id === account.id && styles.selectedAccountOption,
      ]}
      onPress={() => {
        setSelectedAccount(account);
        setAccountNumber(account.accountNumber);
        setAccountModalVisible(false);
      }}
    >
      <View style={styles.accountOptionInfo}>
        <Text style={styles.accountOptionName}>{account.accountName}</Text>
        <Text style={styles.accountOptionNumber}>{account.accountNumber}</Text>
        <Text style={styles.accountOptionType}>
          {getAccountTypeText(account.accountType)}
        </Text>
      </View>
      {selectedAccount?.id === account.id && (
        <MaterialIcons name="check" size={24} color={Colors.light.primary} />
      )}
    </TouchableOpacity>
  );

  const renderDividendCard = (dividend: any) => {
    const today = new Date();
    const paymentDate = new Date(dividend.PAYMENT_DATE_STR);
    const isPaid = paymentDate <= today;

    return (
      <View
        key={dividend.DIVIDEND_ID}
        style={[
          styles.hanaLivingDividendCard,
          isPaid && styles.paidDividendCard,
        ]}
      >
        <View style={styles.dividendCardHeader}>
          <Text style={styles.hanaLivingDividendPeriod}>
            {dividend.QUARTER_LABEL.replace("1분기", "1Q")
              .replace("2분기", "2Q")
              .replace("3분기", "3Q")
              .replace("4분기", "4Q")}
          </Text>
          <View
            style={[
              styles.statusBadge,
              isPaid ? styles.paidBadge : styles.upcomingBadge,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isPaid ? styles.paidBadgeText : styles.upcomingBadgeText,
              ]}
            >
              {isPaid ? "완료" : "예정"}
            </Text>
          </View>
        </View>
        <Text style={styles.hanaLivingDividendAmount}>
          주당배당금 {dividend.DIVIDEND_AMOUNT}원
        </Text>
        <Text style={styles.hanaLivingDividendRate}>
          시가배당률{" "}
          {(
            dividend.CALCULATED_YIELD_PERCENT ||
            dividend.ORIGINAL_RATE * 100 ||
            0
          ).toFixed(2)}
          %
        </Text>
        <View style={styles.dividendDates}>
          <Text style={styles.dividendDateLabel}>
            기준일: {dividend.RECORD_DATE_STR}
          </Text>
          <Text style={styles.dividendDateLabel}>
            지급일: {dividend.PAYMENT_DATE_STR}
          </Text>
        </View>
      </View>
    );
  };

  const renderDividendSummaryItem = (label: string, value: string) => (
    <View style={styles.hanaLivingDividendSummaryItem}>
      <Text style={styles.hanaLivingDividendLabel}>{label}</Text>
      <Text style={styles.hanaLivingDividendValue}>{value}</Text>
    </View>
  );

  // 연도별 배당 요약 정보 렌더링
  const renderYearlyDividendSummary = (dividends: HanaLivingDividend[]) => {
    if (!dividends || dividends.length === 0) return null;

    // 연간 총 배당금 계산
    let totalDividend = dividends.reduce((sum, d) => sum + (d.DIVIDEND_AMOUNT || 0), 0);

    // "최근 3년" 선택 시 연평균 배당금 계산
    const isRecent3Years = selectedYear === DEFAULT_YEAR;
    if (isRecent3Years && dividends.length > 0) {
      // 3년치 데이터를 연평균으로 변환
      totalDividend = Math.round(totalDividend / 3);
    }

    // 배당수익률 계산: (연 배당금 / 현재가) * 100
    const currentPrice = getCurrentPrice();
    const dividendYield = currentPrice > 0 ? (totalDividend / currentPrice) * 100 : 0;

    // 배당 지급 월 추출 (중복 제거)
    const paymentMonths = [...new Set(dividends.map(d => {
      const date = new Date(d.PAYMENT_DATE_STR);
      return date.getMonth() + 1; // 1~12월
    }))].sort((a, b) => a - b);

    const paymentSchedule = paymentMonths.map(m => `${m}월`).join('/');

    return (
      <View style={styles.yearlyDividendSummary}>
        <View style={styles.yearlyDividendItem}>
          <Text style={styles.yearlyDividendLabel}>1주당 배당금</Text>
          <Text style={styles.yearlyDividendValue}>
            연 {totalDividend}원
            {isRecent3Years && <Text style={styles.yearlyDividendNote}> (3년 평균)</Text>}
          </Text>
        </View>
        <View style={styles.yearlyDividendItem}>
          <Text style={styles.yearlyDividendLabel}>배당수익률</Text>
          <Text style={styles.yearlyDividendValue}>연 {dividendYield.toFixed(2)}%</Text>
        </View>
        <View style={styles.yearlyDividendItem}>
          <Text style={styles.yearlyDividendLabel}>배당주기</Text>
          <Text style={styles.yearlyDividendValue}>{paymentSchedule}</Text>
        </View>
      </View>
    );
  };

  // 호가창 렌더링 함수
  const renderOrderBook = (): JSX.Element => {
    if (!getOrderBook()) {
      return (
        <View style={styles.noOrderBookContainer}>
          <MaterialIcons
            name="trending-up"
            size={48}
            color={Colors.light.textSecondary}
          />
          <Text style={styles.noOrderBookText}>호가 정보를 불러오는 중...</Text>
        </View>
      );
    }

    return (
      <View style={styles.orderBookContainer}>
        {/* 공통 헤더 */}
        <View style={styles.orderBookMainHeader}>
          <View style={styles.headerPriceColumn}>
            <Text style={styles.orderBookHeaderPrice}>호가</Text>
          </View>
          <View style={styles.headerQuantityColumn}>
            <Text style={styles.orderBookHeaderQuantity}>잔량</Text>
          </View>
        </View>

        {/* 스크롤 가능한 호가 리스트 */}
        <ScrollView
          ref={orderBookScrollRef}
          style={styles.orderBookScrollView}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={false}
          bounces={false}
        >
          {/* 모든 호가 데이터를 하나의 리스트로 합쳐서 표시 */}
          {(() => {
            const orderBook = getOrderBook()!;
            const currentPrice = getCurrentPrice();

            // 매도 호가를 역순으로 정렬 (높은 가격부터)
            const sortedAsks = [...orderBook.asks].sort(
              (a, b) => b.price - a.price
            );
            // 매수 호가를 정순으로 정렬 (높은 가격부터)
            const sortedBids = [...orderBook.bids].sort(
              (a, b) => b.price - a.price
            );

            // 모든 호가를 하나의 배열로 합치기
            const allQuotes = [
              ...sortedAsks.map((ask) => ({ ...ask, type: "ask" })),
              ...sortedBids.map((bid) => ({ ...bid, type: "bid" })),
            ].sort((a, b) => b.price - a.price); // 가격 높은 순으로 최종 정렬

            return allQuotes.map((quote, index) => {
              const isCurrentPrice = Math.abs(quote.price - currentPrice) < 1; // 현재가와 동일한 가격인지 확인
              const isHigherThanCurrent = quote.price > currentPrice; // 현재가보다 높은 가격인지 확인
              const isLowerThanCurrent = quote.price < currentPrice; // 현재가보다 낮은 가격인지 확인
              const isAsk = quote.type === "ask";

              // 전일 종가와 비교하여 가격 색상 결정
              const previousClose = getPreviousClosePrice();
              const isHigherThanPrevious = quote.price > previousClose;
              const isLowerThanPrevious = quote.price < previousClose;

              return (
                <View
                  key={`${quote.type}-${index}`}
                  style={[
                    styles.orderBookRow,
                    isCurrentPrice && styles.currentPriceRowHighlight,
                    isHigherThanCurrent &&
                      !isCurrentPrice &&
                      styles.higherPriceBackground,
                    isLowerThanCurrent &&
                      !isCurrentPrice &&
                      styles.lowerPriceBackground,
                  ]}
                >
                  <View style={styles.priceColumn}>
                    <Text
                      style={[
                        styles.orderBookPrice,
                        // 전일 종가 대비 색상 (매수/매도 색상 대신 사용)
                        isHigherThanPrevious
                          ? styles.upPrice
                          : isLowerThanPrevious
                          ? styles.downPrice
                          : styles.neutralPrice,
                      ]}
                    >
                      {formatCurrency(quote.price)}
                    </Text>
                    <Text style={styles.priceChangePercent}>
                      {(() => {
                        const changePercent =
                          ((quote.price - previousClose) / previousClose) * 100;
                        const sign =
                          changePercent > 0 ? "+" : changePercent < 0 ? "" : "";
                        return `${sign}${changePercent.toFixed(2)}%`;
                      })()}
                    </Text>
                  </View>
                  <View style={styles.quantityColumn}>
                    <Text
                      style={[
                        styles.orderBookQuantity,
                        // 현재가보다 비싸거나 같으면 진한 파랑, 아니면 진한 빨강
                        quote.price >= currentPrice
                          ? styles.highQuantityColor
                          : styles.lowQuantityColor,
                      ]}
                    >
                      {quote.volume}
                    </Text>
                  </View>
                </View>
              );
            });
          })()}
        </ScrollView>
      </View>
    );
  };

  // 투자 정보 섹션 렌더링 함수
  const renderInvestmentInfo = (): JSX.Element => {
    // 실시간 가격 데이터
    const currentPrice = getCurrentPrice();
    const priceUpdate = getPriceUpdate(product?.productId || '');
    const previousPrice = priceUpdate?.previousPrice || product?.currentPrice || 0;

    // 거래대금 계산 (누적거래량 × 현재가)
    const tradingValue = stockDetail?.volume
      ? (stockDetail.volume * currentPrice)
      : 0;

    // 시가총액 (리츠 순위와 동일 - product.marketCap 사용)
    const marketCap = product?.marketCap || 0;

    // 배당금 및 배당수익률 계산 (올해 전체 배당금 기준)
    const currentYear = new Date().getFullYear();

    // 올해 배당금 합계 계산
    const thisYearDividends = hanaLivingDividends
      ? hanaLivingDividends.filter(d => {
          const year = parseInt(d.RECORD_DATE_STR?.substring(0, 4) || '0');
          return year === currentYear;
        })
      : [];

    const latestDividend = thisYearDividends.length > 0
      ? thisYearDividends.reduce((sum, d) => sum + (d.DIVIDEND_AMOUNT || 0), 0)
      : (product?.dividendYield && currentPrice ? (product.dividendYield * currentPrice / 100) : 0);

    // 시가배당률 계산: (올해 연간 배당금 / 현재가) * 100
    const dividendYieldPercent = currentPrice > 0 && latestDividend > 0
      ? (latestDividend / currentPrice) * 100
      : (product?.dividendYield || 0);

    return (
      <View style={styles.investmentInfo}>
        <Text style={styles.sectionTitle}>
          투자 정보
          {stockDetailLoading && (
            <ActivityIndicator
              size="small"
              color={Colors.light.primary}
              style={{ marginLeft: 8 }}
            />
          )}
        </Text>

        <View style={styles.infoGrid}>
          {renderInfoItem(
            "전일종가",
            formatCurrency(previousPrice)
          )}
          {renderInfoItem(
            "시가",
            product?.currentPrice ? formatCurrency(product.currentPrice) : "정보 없음"
          )}
          {renderInfoItem(
            "고가",
            stockDetail?.high52Week
              ? formatCurrency(stockDetail.high52Week)
              : (currentPrice > 0 ? formatCurrency(currentPrice) : "정보 없음"),
            'red'
          )}
          {renderInfoItem(
            "저가",
            stockDetail?.low52Week
              ? formatCurrency(stockDetail.low52Week)
              : (currentPrice > 0 ? formatCurrency(currentPrice) : "정보 없음"),
            'blue'
          )}
          {renderInfoItem(
            "거래량",
            stockDetail?.volume
              ? stockDetail.volume.toLocaleString()
              : "정보 없음"
          )}
          {renderInfoItem(
            "거래대금",
            tradingValue > 0
              ? `${(tradingValue / 100000000).toFixed(2)}억`
              : "정보 없음"
          )}
          {renderInfoItem(
            "시가총액",
            marketCap > 0
              ? (() => {
                  const trillion = Math.floor(marketCap / 1000000000000);
                  const billion = Math.floor((marketCap % 1000000000000) / 100000000);
                  if (trillion > 0 && billion > 0) {
                    return `${trillion}조${billion}억`;
                  } else if (trillion > 0) {
                    return `${trillion}조`;
                  } else {
                    return `${billion}억`;
                  }
                })()
              : "-"
          )}
          {renderInfoItem(
            "운용보수",
            product?.managementFee
              ? `${product.managementFee.toFixed(2)}%`
              : "정보 없음"
          )}
          {renderInfoItem(
            "최근 1년 최고",
            stockDetail?.high52Week
              ? formatCurrency(stockDetail.high52Week)
              : "정보 없음"
          )}
          {renderInfoItem(
            "최근 1년 최저",
            stockDetail?.low52Week
              ? formatCurrency(stockDetail.low52Week)
              : "정보 없음"
          )}
          {renderInfoItem(
            "PER",
            stockDetail?.per ? stockDetail.per.toFixed(2) : "-"
          )}
          {renderInfoItem(
            "EPS",
            stockDetail?.roe ? `${(stockDetail.roe * 1000).toFixed(0)}원` : "-"
          )}
          {renderInfoItem(
            "PBR",
            stockDetail?.pbr ? stockDetail.pbr.toFixed(2) : "-"
          )}
          {renderInfoItem(
            "BPS",
            stockDetail?.roe && stockDetail?.pbr
              ? `${((stockDetail.roe / stockDetail.pbr) * 1000).toFixed(0)}원`
              : "-"
          )}
          {renderInfoItem(
            "배당수익률",
            dividendYieldPercent > 0
              ? `${dividendYieldPercent.toFixed(2)}%`
              : "정보 없음"
          )}
          {renderInfoItem(
            "주당배당금",
            latestDividend > 0
              ? `${latestDividend.toLocaleString()}원`
              : "정보 없음"
          )}
        </View>
      </View>
    );
  };

  // 주문 확인 모달 렌더링 함수
  const renderConfirmModal = (): JSX.Element => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={confirmModalVisible}
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>주문 확인</Text>

            <View style={styles.confirmDetails}>
              <Text style={styles.confirmProduct}>{product?.productName}</Text>

              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>주문유형</Text>
                <Text style={styles.confirmValue}>
                  {orderType === "BUY" ? "매수" : "매도"}
                </Text>
              </View>

              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>수량</Text>
                <Text style={styles.confirmValue}>
                  {formatNumber(Number(quantity))}주
                </Text>
              </View>

              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>단가</Text>
                <Text style={styles.confirmValue}>
                  {formatCurrency(Number(unitPrice))}
                </Text>
              </View>

              {estimate && (
                <View style={[styles.confirmRow, styles.totalConfirmRow]}>
                  <Text style={styles.totalConfirmLabel}>
                    {orderType === "BUY" ? "결제예정금액" : "수취예정금액"}
                  </Text>
                  <Text style={styles.totalConfirmValue}>
                    {formatCurrency(estimate.netAmount)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  orderType === "BUY"
                    ? styles.buyConfirmButton
                    : styles.sellConfirmButton,
                ]}
                onPress={handleOrderSubmit}
                disabled={ordering}
              >
                {ordering ? (
                  <ActivityIndicator
                    size="small"
                    color={Colors.light.background}
                  />
                ) : (
                  <Text style={styles.confirmButtonText}>주문하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // 계좌 선택 모달 렌더링 함수
  const renderAccountModal = (): JSX.Element => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={accountModalVisible}
        onRequestClose={() => setAccountModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.accountModalContent}>
            <Text style={styles.modalTitle}>계좌 선택</Text>

            <ScrollView style={styles.accountList}>
              {linkedAccounts.map(renderAccountOption)}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setAccountModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // 주문 패널 렌더링 함수
  const renderOrderPanel = (type: "BUY" | "SELL"): JSX.Element => {
    return (
      <View style={styles.rightPanel}>
        <Text style={styles.sectionTitle}>주문하기</Text>

        {/* 주문 수량 입력 */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>수량</Text>
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={[styles.inlineButton, styles.minusButton]}
              onPress={() => {
                const currentQty = Number(quantity) || 0;
                if (currentQty > 1) {
                  setQuantity((currentQty - 1).toString());
                }
              }}
            >
              <Text style={styles.inlineButtonText}>-</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="수량"
              keyboardType="numeric"
              placeholderTextColor={Colors.light.textSecondary}
            />

            <Text style={styles.inputUnit}>주</Text>

            <TouchableOpacity
              style={[styles.inlineButton, styles.plusButton]}
              onPress={() => {
                const currentQty = Number(quantity) || 0;
                setQuantity((currentQty + 1).toString());
              }}
            >
              <Text style={styles.inlineButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 주문 단가 입력 */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>단가</Text>
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={[styles.inlineButton, styles.minusButton]}
              onPress={() => {
                const currentPrice = Number(unitPrice) || 0;
                const tickSize = getPriceTickSize();
                const newPrice = Math.max(0, currentPrice - tickSize);
                setUnitPrice(newPrice.toString());
              }}
            >
              <Text style={styles.inlineButtonText}>-</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={unitPrice}
              onChangeText={setUnitPrice}
              placeholder="단가"
              keyboardType="numeric"
              placeholderTextColor={Colors.light.textSecondary}
            />

            <Text style={styles.inputUnit}>원</Text>

            <TouchableOpacity
              style={[styles.inlineButton, styles.plusButton]}
              onPress={() => {
                const currentPrice = Number(unitPrice) || 0;
                const tickSize = getPriceTickSize();
                const newPrice = currentPrice + tickSize;
                setUnitPrice(newPrice.toString());
              }}
            >
              <Text style={styles.inlineButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.currentPriceButton}
            onPress={async () => {
              if (product) {
                const marketOpen = isMarketOpen();
                let priceToApply: number;

                if (marketOpen) {
                  priceToApply = getCurrentPrice();
                } else {
                  priceToApply = await refreshCurrentPrice();
                }

                setUnitPrice(priceToApply.toString());
              }
            }}
          >
            <Text style={styles.currentPriceButtonText}>현재가</Text>
          </TouchableOpacity>
        </View>

        {/* 예상 금액 */}
        {estimate && (
          <View style={styles.estimateCard}>
            {estimating && (
              <View style={styles.estimatingOverlay}>
                <ActivityIndicator size="small" color={Colors.light.primary} />
              </View>
            )}

            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>주문금액</Text>
              <Text style={styles.estimateValue}>
                {formatCurrency(estimate.totalAmount)}
              </Text>
            </View>

            <View style={[styles.estimateRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>
                {type === "BUY" ? "결제예정" : "수취예정"}
              </Text>
              <Text style={styles.totalValue}>
                {formatCurrency(estimate.totalAmount)}
              </Text>
            </View>
          </View>
        )}

        {/* 계좌 선택 */}
        {linkedAccounts.length > 0 ? (
          <TouchableOpacity
            style={styles.accountSelector}
            onPress={() => setAccountModalVisible(true)}
          >
            <View style={styles.selectedAccountInfo}>
              {selectedAccount ? (
                <>
                  <Text style={styles.selectedAccountName}>
                    {selectedAccount.accountName}
                  </Text>
                  <Text style={styles.selectedAccountNumber}>
                    {selectedAccount.accountNumber}
                  </Text>
                </>
              ) : (
                <Text style={styles.accountPlaceholder}>계좌 선택</Text>
              )}
            </View>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={20}
              color={Colors.light.textSecondary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.noAccountsContainer}>
            <Text style={styles.noAccountsText}>연동된 계좌가 없습니다</Text>
            <TouchableOpacity
              style={styles.linkAccountButton}
              onPress={() => router.push("/investment/account-link")}
            >
              <Text style={styles.linkAccountButtonText}>계좌 연동</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 주문 버튼 */}
        <TouchableOpacity
          style={[
            styles.orderButton,
            type === "BUY" ? styles.buyOrderButton : styles.sellOrderButton,
            (!quantity ||
              !unitPrice ||
              !selectedAccount ||
              !estimate ||
              linkedAccounts.length === 0) &&
              styles.disabledOrderButton,
          ]}
          onPress={() => {
            const isDisabled =
              !quantity ||
              !unitPrice ||
              !selectedAccount ||
              !estimate ||
              ordering ||
              linkedAccounts.length === 0;

            if (!isDisabled) {
              setConfirmModalVisible(true);
            }
          }}
          disabled={
            !quantity ||
            !unitPrice ||
            !selectedAccount ||
            !estimate ||
            ordering ||
            linkedAccounts.length === 0
          }
        >
          <Text style={styles.orderButtonText}>
            {type === "BUY" ? "매수" : "매도"} 주문
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 탭 전환 함수
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  // 현재가 가져오기 (WebSocket 우선, 없으면 API 데이터 사용)
  const getCurrentPrice = (): number => {
    // product가 없어도 URL productId로 시도
    const possibleIds = product
      ? [
          product.productId,
          product.productCode,
          String(product.productId),
          String(product.productCode),
          productId,
        ]
      : [productId];

    for (const id of possibleIds) {
      if (id && id !== "undefined" && id !== "null") {
        const priceUpdate = getPriceUpdate(id);
        if (priceUpdate?.currentPrice > 0) {
          return priceUpdate.currentPrice;
        }
      }
    }

    // WebSocket 데이터가 없으면 API에서 가져온 현재가 사용
    return product?.currentPrice || 0;
  };

  // 실시간 현재가 새로고침 (현재가 버튼용)
  const refreshCurrentPrice = async (): Promise<number> => {
    if (!product) return 0;

    try {
      // 실시간 가격 API 호출
      const response = await investmentApi.getRealtimeStockPrice(
        product.productId
      );

      if (response.success && response.data && response.data.currentPrice > 0) {
        const realtimePrice = Number(response.data.currentPrice);
        return realtimePrice;
      } else {
        return getCurrentPrice();
      }
    } catch (error) {
      return getCurrentPrice();
    }
  };

  // 전일 대비 변동금액 가져오기 (WebSocket 우선, 없으면 0)
  const getPriceChange = (): number => {
    // product가 없어도 URL productId로 시도
    const possibleIds = product
      ? [
          product.productId,
          product.productCode,
          String(product.productId),
          String(product.productCode),
          productId,
        ]
      : [productId];

    for (const id of possibleIds) {
      if (id && id !== "undefined" && id !== "null") {
        const priceUpdate = getPriceUpdate(id);
        if (priceUpdate && priceUpdate.change !== undefined) {
          return priceUpdate.change || 0;
        }
      }
    }
    // WebSocket 데이터가 없으면 0 반환 (변동금액은 실시간 데이터에만 의존)
    return 0;
  };

  // 전일 대비 변동률 가져오기 (WebSocket 우선, 없으면 0)
  const getPriceChangePercent = (): number => {
    // product가 없어도 URL productId로 시도
    const possibleIds = product
      ? [
          product.productId,
          product.productCode,
          String(product.productId),
          String(product.productCode),
          productId,
        ]
      : [productId];

    for (const id of possibleIds) {
      if (id && id !== "undefined" && id !== "null") {
        const priceUpdate = getPriceUpdate(id);
        if (priceUpdate && priceUpdate.changePercent !== undefined) {
          return priceUpdate.changePercent || 0;
        }
      }
    }
    // WebSocket 데이터가 없으면 0 반환 (변동률은 실시간 데이터에만 의존)
    return 0;
  };

  // 실시간 호가창 데이터 가져오기
  const getOrderBook = (): OrderBook | null => {
    if (!product) {
      return null;
    }

    // 1순위: 실시간 호가 데이터 (H0STASP0 - 10단계 호가)
    if (quoteUpdate && quoteUpdate.orderBook) {
      return quoteUpdate.orderBook;
    }

    // 2순위: 현재가 데이터의 호가 (H0STCNT0 - 1단계 호가)
    const possibleIds = [
      product.productId,
      product.productCode,
      String(product.productId),
      String(product.productCode),
    ];

    for (const id of possibleIds) {
      if (id) {
        const priceUpdate = getPriceUpdate(id);
        if (priceUpdate && priceUpdate.orderBook) {
          return priceUpdate.orderBook;
        }
      }
    }

    return null;
  };

  // 호가창에서 가격 간격(틱 사이즈) 계산
  const getPriceTickSize = (): number => {
    const orderBook = getOrderBook();
    if (!orderBook) {
      return 10; // 기본값: 10원
    }

    // 매수 호가에서 가격 간격 계산
    if (orderBook.bids && orderBook.bids.length >= 2) {
      const priceDiff = Math.abs(
        orderBook.bids[0].price - orderBook.bids[1].price
      );
      if (priceDiff > 0) {
        return priceDiff;
      }
    }

    // 매도 호가에서 가격 간격 계산
    if (orderBook.asks && orderBook.asks.length >= 2) {
      const priceDiff = Math.abs(
        orderBook.asks[0].price - orderBook.asks[1].price
      );
      if (priceDiff > 0) {
        return priceDiff;
      }
    }

    // 현재가 기준 일반적인 틱 사이즈 계산
    const currentPrice = getCurrentPrice();
    if (currentPrice >= 500000) return 1000; // 50만원 이상: 1000원
    if (currentPrice >= 100000) return 500; // 10만원 이상: 500원
    if (currentPrice >= 50000) return 100; // 5만원 이상: 100원
    if (currentPrice >= 10000) return 50; // 1만원 이상: 50원
    if (currentPrice >= 5000) return 10; // 5천원 이상: 10원
    return 5; // 5천원 미만: 5원
  };

  // 가장 최근 배당 수익률 가져오기
  const getLatestDividendYield = (): number => {
    return product?.dividendYield || 0;
  };

  // 총 수익률 가져오기 (신뢰할 수 있는 WebSocket 데이터 우선, 그 외엔 API 데이터 유지)
  const getTotalReturn = (): number => {
    if (!product) return 0;

    // 기본적으로는 API에서 가져온 총 수익률을 사용
    let baseReturn = product.totalReturn || 0;

    // WebSocket 데이터 확인
    const possibleIds = [
      product.productId,
      product.productCode,
      String(product.productId),
      String(product.productCode),
    ];

    for (const id of possibleIds) {
      if (id) {
        const priceUpdate = getPriceUpdate(id);
        if (
          priceUpdate &&
          priceUpdate.changePercent !== undefined &&
          priceUpdate.changePercent !== null
        ) {
          // WebSocket 데이터가 최근 1분 이내의 데이터인지 확인
          const now = Date.now();
          const dataAge = now - (priceUpdate.timestamp || 0);
          const oneMinute = 60 * 1000; // 1분으로 단축

          // 연결 상태 확인
          const isConnected = websocket.isConnected;

          // 1분 이내의 최신 데이터이고, 연결 상태가 양호하며, 의미 있는 값이면 사용
          if (
            dataAge < oneMinute &&
            isConnected &&
            Math.abs(priceUpdate.changePercent) >= 0.001
          ) {
            return priceUpdate.changePercent;
          }
        }
      }
    }

    // WebSocket 데이터가 오래되었거나, 0에 가깝거나, 없으면 API 데이터 유지
    return baseReturn;
  };

  // 실시간 가격 데이터 메모이제이션으로 무한 리렌더링 방지
  const currentPriceValue = useMemo(
    () => getCurrentPrice(),
    [subscriptionIds, getPriceUpdate]
  );
  const priceChangeValue = useMemo(
    () => getPriceChange(),
    [subscriptionIds, getPriceUpdate]
  );
  const priceChangePercentValue = useMemo(
    () => getPriceChangePercent(),
    [subscriptionIds, getPriceUpdate]
  );

  // 전일 종가 계산 (현재가 - 변동금액)
  const getPreviousClosePrice = (): number => {
    const currentPrice = getCurrentPrice();
    const priceChange = getPriceChange();
    return currentPrice - priceChange;
  };

  // 선택된 연도에 따른 하나원큐리빙 배당 정보 필터링 (메모이제이션 적용)
  const filteredHanaLivingDividends = useMemo(() => {
    if (!hanaLivingDividends) return [];

    // "최근 3년" 선택 시 최근 3년치만 표시
    if (selectedYear === DEFAULT_YEAR) {
      const currentYear = new Date().getFullYear();
      const threeYearsAgo = currentYear - 2; // 현재 연도 포함 3년

      return hanaLivingDividends.filter((dividend) => {
        const year = parseInt(dividend.RECORD_DATE_STR?.substring(0, 4) || '0');
        return year >= threeYearsAgo && year <= currentYear;
      });
    }

    return hanaLivingDividends.filter((dividend) => {
      const year = dividend.RECORD_DATE_STR?.substring(0, 4);
      return year === selectedYear;
    });
  }, [hanaLivingDividends, selectedYear]);

  // 하나원큐리빙 배당 차트 렌더링 함수
  const renderHanaLivingDividendChart = (dividends: HanaLivingDividend[]) => {
    if (!dividends || dividends.length === 0) return null;

    // 배당기준일 기준으로 정렬 (오래된 것부터)
    const sortedDividends = [...dividends].sort((a, b) => {
      const dateA = new Date(a.RECORD_DATE_STR);
      const dateB = new Date(b.RECORD_DATE_STR);
      return dateA.getTime() - dateB.getTime();
    });

    // 최대 배당금 찾기 (차트 스케일링용)
    const maxDividend = Math.max(
      ...sortedDividends.map((d) => d.DIVIDEND_AMOUNT)
    );
    const chartHeight = 130;

    return (
      <View style={styles.hanaLivingChartArea}>
        <Text style={styles.hanaLivingChartTitle}>
          배당금 추이 (배당기준일 기준)
        </Text>
        {/* 차트 막대들 */}
        <View style={styles.hanaLivingChartBars}>
          {sortedDividends.map((dividend, index) => {
            const dividendValue = dividend.DIVIDEND_AMOUNT || 0;
            const barHeight =
              maxDividend > 0
                ? Math.max(8, (dividendValue / maxDividend) * chartHeight)
                : 8;
            const isLatest = index === sortedDividends.length - 1;

            return (
              <View
                key={dividend.DIVIDEND_ID}
                style={styles.hanaLivingChartBarContainer}
              >
                <View style={styles.hanaLivingChartBarArea}>
                  <View
                    style={[
                      styles.hanaLivingChartBar,
                      {
                        height: barHeight,
                        backgroundColor: isLatest
                          ? Colors.light.primary
                          : Colors.light.info + "40",
                      },
                    ]}
                  >
                    {barHeight > 25 && dividendValue > 0 && (
                      <Text style={styles.hanaLivingBarValueText}>
                        {dividendValue}
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={styles.hanaLivingChartLabel} numberOfLines={2}>
                  {dividend.QUARTER_LABEL
                    .replace("1분기", "1Q")
                    .replace("2분기", "2Q")
                    .replace("3분기", "3Q")
                    .replace("4분기", "4Q")
                    .replace("2025년", "25")
                    .replace("2024년", "24")
                    .replace("2023년", "23")
                    .replace("2022년", "22")
                    .replace(" ", "\n")}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderMonthlyTrendChart = () => {
    if (!aggregatedMonthlyData || aggregatedMonthlyData.length === 0) {
      return (
        <View style={styles.monthlyTrendNoData}>
          <Text style={styles.monthlyTrendNoDataText}>
            월별 데이터가 없습니다
          </Text>
        </View>
      );
    }

    // 최근 6개월 데이터만 표시
    const recentData = aggregatedMonthlyData.slice(-6);
    const maxRevenue = Math.max(...recentData.map((d: any) => d.revenue || 0));

    return (
      <View style={styles.monthlyTrendContainer}>
        <View style={styles.monthlyTrendBars}>
          {recentData.map((data: any, index: number) => {
            const height =
              maxRevenue > 0 ? (data.revenue / maxRevenue) * 120 : 0;
            return (
              <View key={index} style={styles.monthlyTrendBarContainer}>
                <Text
                  style={styles.monthlyTrendBarValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.7}
                >
                  {formatCurrency(data.revenue)}
                </Text>
                <View
                  style={[
                    styles.monthlyTrendBar,
                    { height: Math.max(10, height) },
                  ]}
                />
                <Text style={styles.monthlyTrendBarLabel}>
                  {data.month ? data.month.substring(5) : `${index + 1}월`}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>상품 정보를 불러오고 있습니다...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons
          name="error"
          size={64}
          color={Colors.light.textSecondary}
        />
        <Text style={styles.errorText}>상품 정보를 찾을 수 없습니다</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={Colors.light.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>종목 상세</Text>
        <TouchableOpacity>
          <MaterialIcons
            name="bookmark-border"
            size={24}
            color={Colors.light.text}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} stickyHeaderIndices={[2]}>
        {/* 상품 기본 정보 */}
        <View style={styles.productHeader}>
          <View style={styles.productTitle}>
            <Text style={styles.productName}>{product.productName}</Text>
            <Text style={styles.productCode}>{product.productCode}</Text>
          </View>
        </View>

        {/* 현재 가격 및 변동 정보 */}
        <View style={styles.priceSection}>
          <View style={styles.priceHeader}>
            <View style={styles.currentPriceContainer}>
              <AnimatedPrice
                price={currentPriceValue}
                style={[
                  styles.priceValue,
                  priceChangeValue >= 0 ? styles.profitText : styles.lossText,
                ]}
                formatFunction={formatCurrency}
                animationDuration={400}
                flashColor={priceChangeValue >= 0 ? "#ff444420" : "#0066cc20"}
              />
              <View style={styles.priceChangeContainer}>
                <View style={styles.priceChangeRow}>
                  <MaterialIcons
                    name={
                      priceChangeValue >= 0
                        ? "arrow-drop-up"
                        : "arrow-drop-down"
                    }
                    size={28}
                    color={priceChangeValue >= 0 ? "#ff4444" : "#0066cc"}
                  />
                  <AnimatedPrice
                    price={priceChangeValue}
                    style={[
                      styles.priceChangeValue,
                      priceChangeValue >= 0
                        ? styles.profitText
                        : styles.lossText,
                    ]}
                    formatFunction={(price) =>
                      `${price >= 0 ? "+" : "-"}${formatCurrency(
                        Math.abs(price)
                      )}`
                    }
                    animationDuration={400}
                  />
                  <AnimatedPrice
                    price={priceChangePercentValue}
                    style={[
                      styles.priceChangeValue,
                      priceChangePercentValue >= 0
                        ? styles.profitText
                        : styles.lossText,
                    ]}
                    formatFunction={(price) =>
                      `(${price >= 0 ? "+" : "-"}${Math.abs(price).toFixed(
                        2
                      )}%)`
                    }
                    animationDuration={400}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 4개 탭 헤더 - Sticky */}
        <View style={styles.stickyTabHeader}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabHeaderContainer}
            contentContainerStyle={styles.tabHeaderContent}
          >
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "BUY" && styles.tabButtonActive,
            ]}
            onPress={() => handleTabChange("BUY")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "BUY" && styles.tabButtonTextActive,
              ]}
            >
              매수
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "SELL" && styles.tabButtonActive,
            ]}
            onPress={() => handleTabChange("SELL")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "SELL" && styles.tabButtonTextActive,
              ]}
            >
              매도
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "DIVIDEND" && styles.tabButtonActive,
            ]}
            onPress={() => handleTabChange("DIVIDEND")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "DIVIDEND" && styles.tabButtonTextActive,
              ]}
            >
              배당
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "PORTFOLIO" && styles.tabButtonActive,
            ]}
            onPress={() => handleTabChange("PORTFOLIO")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "PORTFOLIO" && styles.tabButtonTextActive,
              ]}
            >
              포트폴리오
            </Text>
          </TouchableOpacity>
          </ScrollView>
        </View>

        {/* 탭별 컨텐츠 영역 */}
        {activeTab === "BUY" && (
          <View style={styles.tabPage}>
            <View style={styles.tradingSection}>
              {/* 왼쪽: 실시간 호가창 */}
              <View style={styles.leftPanel}>{renderOrderBook()}</View>

              {/* 오른쪽: 주문 패널 */}
              {renderOrderPanel("BUY")}
            </View>

            {/* 투자 정보 */}
            {renderInvestmentInfo()}
          </View>
        )}

        {activeTab === "SELL" && (
          <View style={styles.tabPage}>
            <View style={styles.tradingSection}>
              {/* 왼쪽: 실시간 호가창 */}
              <View style={styles.leftPanel}>{renderOrderBook()}</View>

              {/* 오른쪽: 주문 패널 */}
              {renderOrderPanel("SELL")}
            </View>

            {/* 투자 정보 */}
            {renderInvestmentInfo()}
          </View>
        )}

        {activeTab === "DIVIDEND" && (
          <View style={styles.tabPage}>
            {/* 하나원큐리빙 배당 정보 */}
            <View style={styles.hanaLivingDividendInfo}>
              <View style={styles.hanaLivingDividendHeader}>
                <Text style={styles.hanaLivingDividendTitle}>
                  하나원큐리빙 배당 정보
                </Text>
                <Text style={styles.hanaLivingDividendSubtitle}>
                  실제 배당 지급 내역
                </Text>
              </View>

              {/* 연도별 탭 */}
              <View style={styles.yearTabs}>
                {YEAR_FILTERS.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.yearTab,
                      selectedYear === year && styles.selectedYearTab,
                    ]}
                    onPress={() => setSelectedYear(year)}
                  >
                    <Text
                      style={[
                        styles.yearTabText,
                        selectedYear === year && styles.selectedYearTabText,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {hanaLivingDividends && hanaLivingDividends.length > 0 ? (
                <>
                  {/* 연도별 배당 요약 */}
                  {renderYearlyDividendSummary(filteredHanaLivingDividends)}

                  {/* 배당금 차트 */}
                  {renderHanaLivingDividendChart(filteredHanaLivingDividends)}

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.hanaLivingDividendScroll}
                  >
                    {filteredHanaLivingDividends.map(renderDividendCard)}
                  </ScrollView>

                  <View style={styles.hanaLivingDividendSummary}>
                    {renderDividendSummaryItem("데이터 출처", "하나원큐리빙")}
                    {renderDividendSummaryItem(
                      "배당 건수",
                      `${filteredHanaLivingDividends.length}회`
                    )}
                  </View>
                </>
              ) : (
                <View style={styles.hanaLivingNoDividendInfo}>
                  <Text style={styles.hanaLivingNoDividendText}>
                    {hanaLivingDividendLoading
                      ? "하나원큐리빙 배당 정보 로딩 중..."
                      : "하나원큐리빙 배당 정보가 없습니다."}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === "PORTFOLIO" && (
          <View style={styles.tabPage}>
            {/* 포트폴리오 운영 현황 */}
            {buildingOperationalData.length > 0 && (
              <View style={styles.buildingOperationalSection}>
                <Text style={styles.sectionTitle}>포트폴리오 운영 현황</Text>
                <Text style={styles.sectionSubtitle}>
                  실제 운영 데이터 기반 수익률 정보
                </Text>

                {buildingOperationalLoading ? (
                  <View style={styles.buildingLoadingContainer}>
                    <ActivityIndicator
                      size="small"
                      color={Colors.light.primary}
                    />
                    <Text style={styles.buildingLoadingText}>
                      운영 데이터 조회 중...
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* 전체 합계 고정 영역 */}
                    {(() => {
                      const totalRevenue = buildingOperationalData.reduce(
                        (sum, b) => sum + b.totalRevenue,
                        0
                      );
                      const totalUnits = buildingOperationalData.reduce(
                        (sum, b) => sum + b.totalUnits,
                        0
                      );
                      const totalOccupiedUnits = buildingOperationalData.reduce(
                        (sum, b) => sum + b.occupiedUnits,
                        0
                      );
                      const totalOccupancyRate =
                        totalUnits > 0
                          ? (totalOccupiedUnits / totalUnits) * 100
                          : 0;
                      const avgProfitMargin =
                        buildingOperationalData.reduce(
                          (sum, b) => sum + b.profitMargin,
                          0
                        ) / buildingOperationalData.length;

                      return (
                        <View style={styles.totalSummarySection}>
                          <Text style={styles.totalSummaryTitle}>
                            전체 합계
                          </Text>

                          <View style={styles.totalSummaryGrid}>
                            <View style={styles.totalSummaryItem}>
                              <Text style={styles.totalSummaryLabel}>
                                전체 입주율
                              </Text>
                              <Text style={styles.totalSummaryValue}>
                                {totalOccupancyRate.toFixed(1)}%
                              </Text>
                            </View>

                            <View style={styles.totalSummaryItem}>
                              <Text style={styles.totalSummaryLabel}>
                                총 월 임대수익
                              </Text>
                              <Text style={styles.totalSummaryValue}>
                                {formatCurrency(totalRevenue)}원
                              </Text>
                            </View>

                            <View style={styles.totalSummaryItem}>
                              <Text style={styles.totalSummaryLabel}>
                                평균 수익률
                              </Text>
                              <Text style={styles.totalSummaryValue}>
                                {avgProfitMargin.toFixed(2)}%
                              </Text>
                            </View>

                            <View style={styles.totalSummaryItem}>
                              <Text style={styles.totalSummaryLabel}>
                                총 세대
                              </Text>
                              <Text style={styles.totalSummaryValue}>
                                {totalUnits}실 ({totalOccupiedUnits}실 입주)
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })()}

                    {/* 월별 수익 추이 */}
                    <View style={styles.monthlyTrendSection}>
                      <Text style={styles.monthlyTrendTitle}>
                        월별 수익 추이 (최근 6개월)
                      </Text>
                      {renderMonthlyTrendChart()}
                    </View>

                    {/* 개별 건물 카드 스크롤 */}
                    <Text style={styles.buildingListTitle}>
                      오피스텔 상세
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.buildingCardsScroll}
                    >
                      {buildingOperationalData.map((building) => (
                        <TouchableOpacity
                          key={building.buildingId}
                          style={styles.buildingCard}
                          onPress={() =>
                            router.push(
                              `/investment/building-analysis?buildingId=${building.buildingId}`
                            )
                          }
                          activeOpacity={0.7}
                        >
                          {building.imageUrl && (
                            <Image
                              source={{ uri: building.imageUrl }}
                              style={styles.buildingImage}
                              resizeMode="cover"
                            />
                          )}
                          <Text style={styles.buildingName}>
                            {building.buildingName}
                          </Text>

                          <View style={styles.buildingMetrics}>
                            <View style={styles.metricRow}>
                              <Text style={styles.metricLabel}>입주율</Text>
                              <Text style={styles.metricValue}>
                                {building.occupancyRate.toFixed(1)}%
                              </Text>
                            </View>

                            <View style={styles.metricRow}>
                              <Text style={styles.metricLabel}>
                                월 임대수익
                              </Text>
                              <Text style={styles.metricValue}>
                                {formatCurrency(building.totalRevenue)}원
                              </Text>
                            </View>

                            <View style={styles.metricRow}>
                              <Text style={styles.metricLabel}>수익률</Text>
                              <Text
                                style={[
                                  styles.metricValue,
                                  building.profitMargin >= 0
                                    ? styles.profitPositive
                                    : styles.profitNegative,
                                ]}
                              >
                                {building.profitMargin.toFixed(2)}%
                              </Text>
                            </View>

                            <View style={styles.metricRow}>
                              <Text style={styles.metricLabel}>세대</Text>
                              <Text style={styles.metricValue}>
                                {building.totalUnits}실 (
                                {building.occupiedUnits}실 입주)
                              </Text>
                            </View>
                          </View>

                          {!building.hasData && (
                            <Text style={styles.noDataText}>
                              일부 운영 데이터를 불러올 수 없습니다
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* 지역별 자산 분포 섹션 */}
                    {Object.keys(regionDistribution).length > 0 && (
                      <View style={styles.regionDistributionSection}>
                        <Text style={styles.regionDistributionTitle}>
                          지역별 자산 분포
                        </Text>
                        <View style={styles.regionBarsContainer}>
                          {Object.entries(regionDistribution)
                            .sort((a, b) => b[1].count - a[1].count)
                            .map(([region, data]) => (
                              <View key={region} style={styles.regionBarItem}>
                                <View style={styles.regionBarLabelContainer}>
                                  <Text style={styles.regionBarLabel}>
                                    {region}
                                  </Text>
                                  <Text style={styles.regionBarCount}>
                                    {data.count}개 ({data.percentage.toFixed(1)}%)
                                  </Text>
                                </View>
                                <View style={styles.regionBarTrack}>
                                  <View
                                    style={[
                                      styles.regionBarFill,
                                      { width: `${data.percentage}%` },
                                    ]}
                                  />
                                </View>
                              </View>
                            ))}
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 주문 확인 모달 */}
      {renderConfirmModal()}

      {/* 계좌 선택 모달 */}
      {renderAccountModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.background,
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  backButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.light.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.light.surface,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: Colors.light.surface,
  },
  productTitle: {
    flex: 1,
  },
  productName: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.light.text,
    marginBottom: 0,
  },
  productCode: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  recommendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginLeft: 16,
  },
  recommendedText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: "600",
  },
  priceSection: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  priceHeader: {
    marginBottom: 4,
  },
  currentPriceContainer: {
    alignItems: "flex-start",
  },
  priceValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: Colors.light.text,
    marginBottom: 8,
  },
  priceChangeContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
  },
  priceChangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  priceChangeValue: {
    fontSize: 20,
    fontWeight: "600",
  },
  priceChangePercent: {
    fontSize: 16,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 16,
  },
  descriptionSection: {
    padding: 20,
    backgroundColor: Colors.light.surface,
    marginTop: 0,
    borderRadius: 0,
  },
  descriptionText: {
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 24,
  },
  investmentInfo: {
    padding: 20,
    backgroundColor: Colors.light.surface,
    marginTop: 0,
    borderRadius: 0,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  infoItem: {
    width: "50%",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  infoLabel: {
    fontSize: 13,
    color: "#999999",
    marginBottom: 8,
    fontWeight: "400",
  },
  infoValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
  },
  infoValueRed: {
    color: "#FF6B6B",
  },
  infoValueBlue: {
    color: "#007AFF",
  },
  infoColorCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  infoColorCircleRed: {
    backgroundColor: "#FF6B6B",
  },
  infoColorCircleBlue: {
    backgroundColor: "#4DABF7",
  },
  bottomSpacing: {
    height: 0,
  },
  // 새로운 트레이딩 섹션 스타일
  tradingSection: {
    flexDirection: "row",
    backgroundColor: Colors.light.surface,
    marginTop: 0,
    marginBottom: 16,
    gap: 0,
    height: 527,
  },
  leftPanel: {
    width: 170,
    height: 527,
  },
  rightPanel: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 20,
    height: 527,
  },
  orderBookContainer: {
    backgroundColor: Colors.light.background,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: "hidden",
    flex: 1,
    margin: 0,
  },
  orderBookScrollView: {
    flex: 1,
  },
  orderBookMainHeader: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  orderBookHeaderPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    textAlign: "center",
  },
  orderBookHeaderQuantity: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    textAlign: "center",
  },
  orderBookRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F8F9FA",
    minHeight: 36,
  },
  priceColumn: {
    flex: 1,
    paddingVertical: 8,
    paddingLeft: 4,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: Colors.light.border,
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  quantityColumn: {
    flex: 1,
    paddingVertical: 8,
    paddingLeft: 4,
    paddingRight: 8,
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  headerPriceColumn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: Colors.light.border,
    justifyContent: "center",
    alignItems: "center",
  },
  headerQuantityColumn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  orderBookPrice: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
  priceChangePercent: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    textAlign: "right",
    marginTop: 2,
  },
  orderBookQuantity: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "right",
  },
  upPrice: {
    color: THEME_COLORS.priceUp, // 전일 종가보다 높으면 빨간색
  },
  downPrice: {
    color: THEME_COLORS.priceDown, // 전일 종가보다 낮으면 파란색
  },
  neutralPrice: {
    color: THEME_COLORS.priceNeutral, // 전일 종가와 동일하면 하나금융 초록색
  },
  currentPriceRowHighlight: {
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderTopColor: THEME_COLORS.priceUp,
    borderLeftColor: THEME_COLORS.priceUp,
    borderRightColor: THEME_COLORS.priceUp,
    borderBottomColor: THEME_COLORS.priceUp,
    backgroundColor: THEME_COLORS.priceUpHighlight,
  },
  higherPriceBackground: {
    backgroundColor: THEME_COLORS.priceDownLight,
  },
  lowerPriceBackground: {
    backgroundColor: THEME_COLORS.priceUpLight,
  },
  noOrderBookContainer: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  noOrderBookText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 8,
  },
  // 주문 관련 스타일
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 8,
  },
  inlineButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.light.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 0,
  },
  inlineButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
  },
  minusButton: {
    marginRight: 8,
  },
  plusButton: {
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 0,
    minHeight: 44,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
  },
  inputUnit: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginLeft: 6,
  },
  currentPriceButton: {
    alignSelf: "flex-start",
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  currentPriceButtonText: {
    fontSize: 10,
    color: Colors.light.background,
    fontWeight: "600",
  },
  estimateCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    position: "relative",
  },
  estimatingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  estimateSection: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  estimateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  estimateLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  estimateValue: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.light.text,
  },
  totalEstimateRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    marginTop: 8,
    paddingTop: 8,
  },
  totalEstimateLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  totalEstimateValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.light.primary,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    marginTop: 6,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.light.primary,
  },
  accountSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    minHeight: 50,
  },
  selectedAccountInfo: {
    flex: 1,
  },
  selectedAccountName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  selectedAccountNumber: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  accountPlaceholder: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  noAccountsContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 16,
  },
  noAccountsText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 8,
    textAlign: "center",
  },
  linkAccountButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  linkAccountButtonText: {
    color: Colors.light.background,
    fontSize: 10,
    fontWeight: "600",
  },
  orderButton: {
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 56,
    justifyContent: "center",
  },
  buyOrderButton: {
    backgroundColor: "#FF6B6B",
  },
  sellOrderButton: {
    backgroundColor: "#007AFF",
  },
  disabledOrderButton: {
    backgroundColor: Colors.light.textSecondary,
  },
  orderButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.background,
  },
  profitText: {
    color: "#FF6B6B",
  },
  lossText: {
    color: "#007AFF",
  },
  // 년도별 탭 스타일
  yearTabs: {
    flexDirection: "row",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  yearTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedYearTab: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  yearTabText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: "500",
    textAlign: "center",
  },
  selectedYearTabText: {
    color: Colors.light.background,
    fontWeight: "600",
  },

  // 모달 관련 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 40,
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.light.text,
    textAlign: "center",
    marginBottom: 20,
  },
  confirmDetails: {
    marginBottom: 24,
  },
  confirmProduct: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    textAlign: "center",
    marginBottom: 16,
  },
  confirmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  confirmLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  confirmValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  totalConfirmRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    marginTop: 8,
    paddingTop: 12,
  },
  totalConfirmLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  totalConfirmValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.light.primary,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: Colors.light.surface,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buyConfirmButton: {
    backgroundColor: "#FF6B6B",
  },
  sellConfirmButton: {
    backgroundColor: "#007AFF",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.background,
  },
  // 계좌 선택 모달 스타일
  accountModalContent: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    maxHeight: "80%",
  },
  accountList: {
    maxHeight: 300,
    marginVertical: 16,
  },
  accountOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  selectedAccountOption: {
    borderColor: Colors.light.primary,
    backgroundColor: "#f0f8f0",
  },
  accountOptionInfo: {
    flex: 1,
  },
  accountOptionName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
  },
  accountOptionNumber: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  accountOptionType: {
    fontSize: 12,
    color: Colors.light.primary,
  },
  modalCloseButton: {
    backgroundColor: Colors.light.surface,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  highQuantityColor: {
    color: "#007AFF", // 호가와 완전히 동일한 쨍한 파란색
    fontSize: 14,
    fontWeight: "600",
  },
  lowQuantityColor: {
    color: "#FF6B6B", // 호가에서 사용하는 빨강색
    fontSize: 14,
    fontWeight: "600",
  },
  // 하나금융 스타일 탭
  hanaTabContainer: {
    flexDirection: "row",
    backgroundColor: "transparent",
    margin: 0,
    padding: 0,
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  hanaTab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  hanaTabLeft: {
    marginRight: 0,
  },
  hanaTabRight: {
    marginLeft: 0,
  },
  hanaTabText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.textSecondary,
  },
  hanaTabBuyActive: {
    backgroundColor: "transparent",
    borderBottomColor: "#ff4444",
  },
  hanaTabSellActive: {
    backgroundColor: "transparent",
    borderBottomColor: "#0066cc",
  },
  hanaTabBuyTextActive: {
    color: "#ff4444",
    fontWeight: "700",
  },
  hanaTabSellTextActive: {
    color: "#0066cc",
    fontWeight: "700",
  },

  // 새로운 5개 탭 스타일
  stickyTabHeader: {
    backgroundColor: Colors.light.surface,
    zIndex: 10,
  },
  tabHeaderContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  tabHeaderContent: {
    paddingHorizontal: 8,
  },
  tabButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 4,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomColor: Colors.light.primary,
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.textSecondary,
  },
  tabButtonTextActive: {
    color: Colors.light.primary,
    fontWeight: "700",
  },
  tabContentContainer: {
    flexGrow: 0,
  },
  tabPage: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },

  // 하나원큐리빙 배당 정보 스타일
  hanaLivingDividendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  hanaLivingDividendAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.light.primary,
  },
  hanaLivingDividendLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  hanaLivingDividendValue: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.light.text,
  },

  // JSX에서 사용하는 하나원큐리빙 배당 정보 스타일
  hanaLivingDividendInfo: {
    backgroundColor: Colors.light.surface,
    borderRadius: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    marginTop: 0,
    ...CARD_SHADOW,
  },
  hanaLivingDividendTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.light.text,
    marginBottom: 4,
  },
  hanaLivingDividendSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  hanaLivingDividendScroll: {
    marginBottom: 16,
  },
  hanaLivingDividendCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    minWidth: 160,
  },
  hanaLivingDividendPeriod: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.primary,
    marginBottom: 8,
  },
  hanaLivingDividendRate: {
    fontSize: 12,
    color: Colors.light.info,
    marginBottom: 4,
  },
  hanaLivingDividendSummary: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 16,
    paddingBottom: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  hanaLivingDividendSummaryItem: {
    alignItems: "center",
  },
  hanaLivingNoDividendInfo: {
    alignItems: "center",
    paddingVertical: 32,
  },
  hanaLivingNoDividendText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },

  // 연도별 배당 요약 스타일
  yearlyDividendSummary: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 12,
  },
  yearlyDividendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  yearlyDividendLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
  yearlyDividendValue: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  yearlyDividendNote: {
    fontSize: 12,
    fontWeight: "400",
    color: Colors.light.textSecondary,
  },

  // 하나원큐리빙 배당 차트 스타일
  hanaLivingChartArea: {
    marginBottom: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  hanaLivingChartTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 30,
    textAlign: "center",
  },
  hanaLivingChartBars: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 150,
    paddingHorizontal: 8,
    gap: 4,
  },
  hanaLivingChartBarContainer: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 3,
  },
  hanaLivingChartBarArea: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 8,
  },
  hanaLivingChartBar: {
    width: 24,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 8,
  },
  hanaLivingBarValueText: {
    fontSize: 10,
    color: Colors.light.background,
    fontWeight: "bold",
    textAlign: "center",
  },
  hanaLivingChartLabel: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 12,
    minHeight: 24,
  },

  // 배당 상태 구분 스타일 (깔끔하게 개선)
  paidDividendCard: {
    opacity: 0.8,
  },
  dividendCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  paidBadge: {
    backgroundColor: Colors.light.textSecondary + "15",
  },
  paidBadgeText: {
    color: Colors.light.textSecondary,
  },
  upcomingBadge: {
    backgroundColor: Colors.light.primary + "15",
  },
  upcomingBadgeText: {
    color: Colors.light.primary,
  },
  dividendDates: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border + "30",
  },
  dividendDateLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },

  // 오피스텔 운영 현황 스타일
  buildingOperationalSection: {
    backgroundColor: Colors.light.surface,
    borderRadius: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    marginTop: 0,
    ...CARD_SHADOW,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  buildingLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  buildingLoadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  buildingCardsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    flexGrow: 0,
  },
  totalSummarySection: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  totalSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  totalSummaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  totalSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  totalSummaryItem: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 8,
  },
  totalSummaryLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  totalSummaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  monthlyTrendSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  monthlyTrendTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 16,
  },
  monthlyTrendContainer: {
    width: "100%",
  },
  monthlyTrendBars: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 160,
    paddingHorizontal: 8,
  },
  monthlyTrendBarContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    marginHorizontal: 4,
  },
  monthlyTrendBarValue: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginBottom: 4,
    textAlign: "center",
  },
  monthlyTrendBar: {
    width: 32,
    backgroundColor: Colors.light.primary,
    borderRadius: 4,
    minHeight: 10,
  },
  monthlyTrendBarLabel: {
    fontSize: 11,
    color: Colors.light.text,
    marginTop: 8,
    textAlign: "center",
  },
  monthlyTrendNoData: {
    paddingVertical: 40,
    alignItems: "center",
  },
  monthlyTrendNoDataText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  regionDistributionSection: {
    marginTop: 20,
    marginBottom: 0,
  },
  regionDistributionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 16,
  },
  regionBarsContainer: {
    gap: 16,
  },
  regionBarItem: {
    gap: 8,
  },
  regionBarLabelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  regionBarLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.text,
  },
  regionBarCount: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  regionBarTrack: {
    height: 24,
    backgroundColor: Colors.light.border,
    borderRadius: 6,
    overflow: "hidden",
  },
  regionBarFill: {
    height: "100%",
    backgroundColor: Colors.light.primary,
    borderRadius: 6,
  },
  buildingListTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 12,
  },
  buildingCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    minWidth: 260,
  },
  buildingImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: Colors.light.border,
  },
  buildingName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 12,
  },
  buildingMetrics: {
    gap: 8,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
  },
  profitPositive: {
    color: "#FF4444",
  },
  profitNegative: {
    color: "#0066CC",
  },
  noDataText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 8,
    fontStyle: "italic",
  },
});
