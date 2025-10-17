import { HanaHeader } from "@/components/HanaHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useTabBar } from "@/contexts/TabBarContext";
import { buildingAPI } from "@/services/mobileApi";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { IconButton, Text } from "react-native-paper";

// 실제 오피스텔 데이터 타입
interface Property {
  id: number;
  name: string;
  address: string;
  addressDetail: string;
  zipCode: string;
  buildingType: string;
  totalFloors: number;
  totalUnits: number;
  status: string;
  city?: string;
  district?: string;
  images: string[] | string | null;
  createdAt: string;
  updatedAt: string;
}

// 정적 데이터들
const adBanners = [
  {
    id: 1,
    image: require("@/assets/images/skybanner.png"),
    title: "하나스카이라운지",
    description: "프리미엄 고급 오피스텔 라운지 서비스",
  },
  {
    id: 2,
    image: require("@/assets/images/hanabanner.png"),
    title: "하나금융그룹",
    description: "다양한 금융 서비스를 만나보세요",
  },
  {
    id: 3,
    image: require("@/assets/images/banner3.png"),
    title: "하나원큐리빙",
    description: "스마트한 오피스텔 라이프를 경험하세요",
  },
];

const searchFilters = [
  { label: "전체", value: "all" },
  { label: "서울", value: "seoul" },
  { label: "부산", value: "busan" },
  { label: "인천", value: "incheon" },
  { label: "경기도", value: "gyeonggi" },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { setTabBarVisible } = useTabBar();

  // 오피스텔 검색 관련 상태
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 광고 배너 관련 상태
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerIntervalRef = useRef<number | null>(null);

  // 스크롤 관련 상태
  const lastScrollY = useRef(0);

  const getBuildingTypeText = (type: string) => {
    switch (type) {
      case "OFFICETEL":
        return "오피스텔";
      case "APARTMENT":
        return "아파트";
      case "VILLA":
        return "빌라";
      default:
        return type;
    }
  };

  // 스크롤 핸들러
  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const delta = currentScrollY - lastScrollY.current;

    // 스크롤이 50 이상일 때만 동작 (상단에선 항상 보임)
    if (currentScrollY > 50) {
      if (delta > 5) {
        // 아래로 스크롤
        setTabBarVisible(false);
      } else if (delta < -5) {
        // 위로 스크롤
        setTabBarVisible(true);
      }
    } else {
      // 상단에선 항상 보임
      setTabBarVisible(true);
    }

    lastScrollY.current = currentScrollY;
  };

  // 실제 오피스텔 데이터 로드
  useEffect(() => {
    fetchProperties();
  }, []);

  // 필터 변경 시 데이터 다시 로드
  useEffect(() => {
    fetchProperties(selectedFilter);
  }, [selectedFilter]);

  // 광고 배너 자동 슬라이드 설정
  useEffect(() => {
    bannerIntervalRef.current = setInterval(() => {
      setCurrentBannerIndex((prevIndex) =>
        prevIndex === adBanners.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000); // 5초마다 자동 슬라이드

    return () => {
      if (bannerIntervalRef.current) {
        clearInterval(bannerIntervalRef.current);
      }
    };
  }, []);

  // 배너 터치 시 다음으로 이동
  const handleBannerPress = () => {
    // 자동 슬라이드 타이머 리셋
    if (bannerIntervalRef.current) {
      clearInterval(bannerIntervalRef.current);
    }

    // 다음 배너로 이동
    setCurrentBannerIndex((prevIndex) =>
      prevIndex === adBanners.length - 1 ? 0 : prevIndex + 1
    );

    // 타이머 재시작
    bannerIntervalRef.current = setInterval(() => {
      setCurrentBannerIndex((prevIndex) =>
        prevIndex === adBanners.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);
  };

  const fetchProperties = async (cityFilter?: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await buildingAPI.getAll();

      const propertiesData =
        response && typeof response === "object" && "data" in response
          ? response.data
          : response;

      if (propertiesData && Array.isArray(propertiesData)) {
        // 이미지 데이터 파싱
        let parsedProperties = propertiesData.map((property) => {
          let parsedImages: string[] = [];

          if (property.images) {
            try {
              // 문자열로 된 JSON 배열을 파싱
              if (typeof property.images === "string") {
                parsedImages = JSON.parse(property.images);
              } else if (Array.isArray(property.images)) {
                parsedImages = property.images;
              }
            } catch (error) {
              parsedImages = [];
            }
          }

          return {
            ...property,
            images: parsedImages,
          };
        }); // 지역별 필터링 적용
        if (cityFilter && cityFilter !== "all") {
          const cityMap: { [key: string]: string[] } = {
            seoul: ["서울특별시", "서울시", "서울"],
            busan: ["부산광역시", "부산시", "부산"],
            incheon: ["인천광역시", "인천시", "인천"],
            gyeonggi: ["경기도", "경기"],
          };

          const targetCities = cityMap[cityFilter];
          if (targetCities) {
            parsedProperties = parsedProperties.filter((property) => {
              // city 필드로 먼저 확인
              if (
                property.city &&
                targetCities.some((city) => property.city?.includes(city))
              ) {
                return true;
              }
              // 주소로 백업 확인
              if (property.address) {
                return targetCities.some((city) =>
                  property.address?.includes(city)
                );
              }
              return false;
            });
          }
        }

        setProperties(parsedProperties);
      } else {
        setProperties(propertiesData || []);
      }
    } catch (error: any) {
      setError("오피스텔 목록을 불러오는데 실패했습니다.");
      // 에러 시 빈 배열 사용
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#c8e6c9"
        translucent={false}
      />

      {/* 상단 헤더 - 녹색 배경 */}
      <HanaHeader
        title=""
        variant="compact"
        showLogo={true}
      />

      <LinearGradient
        colors={["#c8e6c9", "#e8f5e8", "#f0f8f0", "#ffffff"]}
        style={styles.gradientContent}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* 건물 목록 섹션 */}
          <View
            style={[
              styles.section,
              { paddingHorizontal: 12, paddingTop: 2, marginTop: 0 },
            ]}
          >
            {/* 검색창 */}
            <View style={[styles.searchContainer, { marginTop: 0 }]}>
              <View style={styles.searchInputContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="원하는 오피스텔을 검색해보세요"
                  placeholderTextColor="#999999"
                  editable={false}
                />
                <IconButton
                  icon="magnify"
                  size={20}
                  iconColor="#999999"
                  style={styles.searchIcon}
                />
              </View>
            </View>

            {/* 검색 필터 */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterContainer}
            >
              {searchFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  onPress={() => setSelectedFilter(filter.value)}
                  style={[
                    styles.filterChip,
                    selectedFilter === filter.value &&
                      styles.filterChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === filter.value &&
                        styles.filterChipTextSelected,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 오피스텔 목록 */}
            <View style={styles.propertiesList}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#009178" />
                  <Text style={styles.loadingText}>
                    건물 정보를 불러오는 중...
                  </Text>
                </View>
              ) : error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={fetchProperties}
                  >
                    <Text style={styles.retryButtonText}>다시 시도</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={properties}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={styles.horizontalList}
                  pagingEnabled={true}
                  snapToInterval={Dimensions.get("window").width}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  onScroll={(event) => {
                    const newIndex = Math.round(
                      event.nativeEvent.contentOffset.x /
                        Dimensions.get("window").width
                    );
                    setCurrentIndex(newIndex);
                  }}
                  scrollEventThrottle={16}
                  renderItem={({ item: property, index }) => (
                    <TouchableOpacity
                      style={[
                        styles.propertyCard,
                        index === 0
                          ? styles.firstPropertyCard
                          : styles.otherPropertyCard,
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: "/building-detail",
                          params: {
                            id: property.id,
                            name: property.name,
                            address: property.address,
                          },
                        })
                      }
                    >
                      <Image
                        source={
                          property.images &&
                          property.images.length > 0 &&
                          property.images[0] &&
                          property.images[0].startsWith("http")
                            ? { uri: property.images[0] }
                            : require("@/assets/images/hana.png")
                        }
                        style={styles.propertyImage}
                        defaultSource={require("@/assets/images/hana.png")}
                        onError={() => {}}
                        onLoad={() => {}}
                        fadeDuration={300}
                      />
                      <View style={styles.propertyInfo}>
                        <View style={styles.propertyHeader}>
                          <Text style={styles.propertyName}>
                            {property.name}
                          </Text>
                          <View style={styles.propertyTypeContainer}>
                            <Text style={styles.propertyType}>
                              {getBuildingTypeText(property.buildingType)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.propertyAddress}>
                          {property.address}
                        </Text>
                        <View style={styles.propertyDetails}>
                          <Text style={styles.propertyFloors}>
                            {property.totalFloors}층
                          </Text>
                          <Text style={styles.propertyUnits}>
                            {property.totalUnits}호실
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}

              {/* 페이지 인디케이터 */}
              {!loading && !error && properties.length > 1 && (
                <View style={styles.pageIndicator}>
                  {properties.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.indicatorDot,
                        index === currentIndex && styles.indicatorDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* 광고 배너 */}
          <View style={styles.bannerSection}>
            <TouchableOpacity
              style={styles.bannerContainer}
              onPress={handleBannerPress}
              activeOpacity={0.9}
            >
              <Image
                source={adBanners[currentBannerIndex].image}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            </TouchableOpacity>

            {/* 배너 인디케이터 */}
            <View style={styles.bannerIndicator}>
              <View style={styles.bannerIndicatorContainer}>
                <Text style={styles.bannerIndicatorText}>
                  ＜ {currentBannerIndex + 1}/{adBanners.length} ＞
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#c8e6c9",
  },
  gradientContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 30,
  },

  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#009178",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 18,
    color: "#666666",
  },

  // 오피스텔 검색 관련 스타일
  searchContainer: {
    flexDirection: "row",
    marginBottom: 20,
    marginTop: 8,
    alignItems: "center",
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    height: 52,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333333",
    paddingVertical: 0,
  },
  searchIcon: {
    margin: 0,
    marginLeft: 4,
  },
  filterContainer: {
    paddingRight: 20,
  },
  filterChip: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipSelected: {
    backgroundColor: "#009178",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  filterChipText: {
    fontSize: 14,
    color: "#666666",
  },
  filterChipTextSelected: {
    color: "#ffffff",
  },
  propertiesList: {
    marginTop: 16,
  },
  horizontalList: {
    paddingHorizontal: 0,
  },
  pageIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 4,
  },
  indicatorDotActive: {
    backgroundColor: "#009178",
    width: 20,
  },
  propertyCard: {
    width: Dimensions.get("window").width - 24,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: "hidden",
  },
  firstPropertyCard: {
    marginLeft: 0,
    marginRight: 24,
  },
  otherPropertyCard: {
    marginLeft: 0,
    marginRight: 24,
  },
  propertyImage: {
    width: "100%",
    height: 220,
  },
  propertyInfo: {
    padding: 16,
  },
  propertyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  propertyName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    flex: 1,
    marginRight: 8,
  },
  propertyAddress: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 6,
    lineHeight: 16,
  },
  propertyDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },

  // 로딩 및 에러 관련 스타일
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "transparent",
  },
  loadingText: {
    fontSize: 16,
    color: "#666666",
    marginTop: 12,
    fontWeight: "500",
  },
  errorContainer: {
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: "#dc3545",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#009178",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },

  // 새로운 오피스텔 카드 스타일
  propertyType: {
    fontSize: 10,
    fontWeight: "600",
    color: "#009178",
    backgroundColor: "#f0f9f7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  propertyFloors: {
    fontSize: 12,
    color: "#666666",
    fontWeight: "500",
  },
  propertyUnits: {
    fontSize: 12,
    color: "#666666",
    fontWeight: "500",
  },
  propertyTypeContainer: {
    alignSelf: "flex-start",
  },

  // 광고 배너 스타일
  bannerSection: {
    marginBottom: 16,
  },
  bannerContainer: {
    height: Dimensions.get("window").width * 0.3,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  bannerIndicatorContainer: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 16,
  },
  bannerIndicatorText: {
    fontSize: 12,
    color: "#666666",
    fontWeight: "500",
  },
});
