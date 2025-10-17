import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Constants from 'expo-constants';
import { HanaHeader } from '@/components/HanaHeader';
import { buildingAPI } from '@/services/api';

const { width, height } = Dimensions.get('window');

interface Building {
  id: number;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  totalUnits: number;
  buildingType: string;
  images?: string[];
}

interface ReitProduct {
  productId?: string;
  productCode: string;
  productName: string;
  currentPrice?: number;
  dividendYield?: number;
  totalReturn?: number;
}

export default function InvestmentMapScreen() {
  // Kakao Map API 키
  const KAKAO_MAP_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_KAKAO_MAP_JS_KEY || process.env.EXPO_PUBLIC_KAKAO_MAP_JS_KEY;

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [reitProducts, setReitProducts] = useState<ReitProduct[]>([]);
  const [loadingReits, setLoadingReits] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      const response = await buildingAPI.getBuildings();
      const buildingsData = response?.data?.data || response?.data || [];

      // 위치 정보가 있는 오피스텔만 필터링
      const buildingsWithLocation = buildingsData.filter(
        (b: Building) => b.latitude && b.longitude
      );

      setBuildings(buildingsWithLocation);
      setError(null);
    } catch (err: any) {
      setError('오피스텔 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerClick = async (building: Building) => {
    setSelectedBuilding(building);
    setShowBottomSheet(true);
    setLoadingReits(true);

    try {
      const response = await buildingAPI.getReitsByBuilding(building.id);
      const reitsData = response?.data?.data || response?.data || [];
      setReitProducts(reitsData);
    } catch (err: any) {
      setReitProducts([]);
    } finally {
      setLoadingReits(false);
    }
  };

  const handleProductPress = (product: ReitProduct) => {
    setShowBottomSheet(false);
    const productId = product.productId || product.productCode;
    router.push(`/investment/product-detail?productId=${productId}`);
  };

  // 지도 중심 좌표 계산 (서울 중심)
  const centerLat = buildings.length > 0
    ? buildings.reduce((sum, b) => sum + (b.latitude || 0), 0) / buildings.length
    : 37.5665;
  const centerLng = buildings.length > 0
    ? buildings.reduce((sum, b) => sum + (b.longitude || 0), 0) / buildings.length
    : 126.9780;

  // Kakao Map HTML 생성
  const generateMapHTML = () => {
    const markers = buildings
      .map(
        (b) => `
        {
          id: ${b.id},
          name: "${b.name}",
          address: "${b.address}",
          lat: ${b.latitude},
          lng: ${b.longitude}
        }`
      )
      .join(',');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
          <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_API_KEY}"></script>
          <style>
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; }
            #map { width: 100%; height: 100%; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            const markers = [${markers}];

            const container = document.getElementById('map');
            const options = {
              center: new kakao.maps.LatLng(${centerLat}, ${centerLng}),
              level: 8
            };
            const map = new kakao.maps.Map(container, options);

            markers.forEach(function(markerData) {
              const markerPosition = new kakao.maps.LatLng(markerData.lat, markerData.lng);
              const marker = new kakao.maps.Marker({
                position: markerPosition,
                title: markerData.name
              });
              marker.setMap(map);

              kakao.maps.event.addListener(marker, 'click', function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'markerClick',
                  buildingId: markerData.id
                }));
              });
            });
          </script>
        </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>지도를 불러오는 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <HanaHeader
          title="투자 지도"
          showBackButton={true}
          onBackPress={() => router.back()}
        />
        <MaterialIcons name="error-outline" size={48} color={Colors.light.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchBuildings}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <HanaHeader
        title="투자 지도"
        showBackButton={true}
        onBackPress={() => router.back()}
      />

      <View style={styles.mapContainer}>
        {KAKAO_MAP_API_KEY ? (
          <WebView
            style={styles.map}
            source={{ html: generateMapHTML() }}
            scrollEnabled={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'markerClick') {
                  const building = buildings.find(b => b.id === data.buildingId);
                  if (building) {
                    handleMarkerClick(building);
                  }
                }
              } catch (err) {
              }
            }}
          />
        ) : (
          <View style={styles.noMapContainer}>
            <MaterialIcons name="map" size={48} color={Colors.light.textSecondary} />
            <Text style={styles.noMapText}>지도 API 키가 설정되지 않았습니다.</Text>
          </View>
        )}
      </View>

      {/* 하단 시트: 선택된 오피스텔의 리츠 상품 */}
      <Modal
        visible={showBottomSheet}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBottomSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBottomSheet(false)}
        >
          <View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{selectedBuilding?.name}</Text>
              <TouchableOpacity onPress={() => setShowBottomSheet(false)}>
                <MaterialIcons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetAddress}>{selectedBuilding?.address}</Text>

            {selectedBuilding?.images && selectedBuilding.images.length > 0 && (
              <View style={styles.buildingImageContainer}>
                <Image
                  source={{ uri: selectedBuilding.images[0] }}
                  style={styles.buildingImage}
                  resizeMode="cover"
                />
              </View>
            )}

            <View style={styles.sheetDivider} />

            <Text style={styles.sheetSubtitle}>포함된 리츠 상품</Text>

            <ScrollView style={styles.productList}>
              {loadingReits ? (
                <View style={styles.loadingReits}>
                  <ActivityIndicator size="small" color={Colors.light.primary} />
                  <Text style={styles.loadingReitsText}>리츠 상품 조회 중...</Text>
                </View>
              ) : reitProducts.length > 0 ? (
                reitProducts.map((product, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.productCard}
                    onPress={() => handleProductPress(product)}
                  >
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.productName}</Text>
                      {product.dividendYield && (
                        <Text style={styles.productDetail}>
                          배당수익률: {product.dividendYield.toFixed(2)}%
                        </Text>
                      )}
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color={Colors.light.textSecondary} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noProductsContainer}>
                  <MaterialIcons name="info-outline" size={32} color={Colors.light.textSecondary} />
                  <Text style={styles.noProductsText}>
                    이 오피스텔은 현재 리츠 상품에 포함되어 있지 않습니다.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.light.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  noMapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  noMapText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: height * 0.7,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  sheetAddress: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  buildingImageContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  buildingImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
    marginHorizontal: 20,
  },
  sheetSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  productList: {
    paddingHorizontal: 20,
  },
  loadingReits: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingReitsText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  productDetail: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  noProductsContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noProductsText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});
