import { HanaHeader } from "@/components/HanaHeader";
import { Colors } from "@/constants/Colors";
import { useTabBar } from "@/contexts/TabBarContext";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { IconButton, Text } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";

// 대출 전용 배너 데이터
const loanBanners = [
  {
    id: 1,
    title: "하나원큐 비상금대출",
    mainText: "급할 때 간편하게",
    subText: "신청 가능한 비상금 대출",
    icon: require("@/assets/images/loan_icon1.png"),
    colors: ["#e3f2fd", "#f5f5f5"],
  },
  {
    id: 2,
    title: "전월세보증금 대출",
    mainText: "신청부터 실행까지",
    subText: "모바일로 간편하게",
    icon: require("@/assets/images/loan_icon2.png"),
    colors: ["#f3e5f5", "#f5f5f5"],
  },
  {
    id: 3,
    title: "통합 신용한도 조회",
    mainText: "하나금융그룹 신용대출",
    subText: "한도를 한번에",
    icon: require("@/assets/images/loan_icon3.png"),
    colors: ["#fff3e0", "#f5f5f5"],
  },
];

export default function LoansScreen() {
  const router = useRouter();
  const { setTabBarVisible } = useTabBar();

  // 광고 배너 관련 상태
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerIntervalRef = useRef<number | null>(null);

  // 필터 상태
  const [selectedFilter, setSelectedFilter] = useState("추천");
  const [isFilterSticky, setIsFilterSticky] = useState(false);

  // 스크롤 관련 상태
  const lastScrollY = useRef(0);

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

  // 배너 자동 슬라이드 설정
  useEffect(() => {
    bannerIntervalRef.current = setInterval(() => {
      setCurrentBannerIndex((prevIndex) =>
        prevIndex === loanBanners.length - 1 ? 0 : prevIndex + 1
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
      prevIndex === loanBanners.length - 1 ? 0 : prevIndex + 1
    );

    // 타이머 재시작
    bannerIntervalRef.current = setInterval(() => {
      setCurrentBannerIndex((prevIndex) =>
        prevIndex === loanBanners.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);
  };

  const loanProducts = [
    {
      id: 1,
      name: "주택담보대출 갈아타기",
      description: "더 나은 조건으로 쉽고 편하게",
      interestRate: "연 3.56% ~ 4.19%",
      maxAmount: "최대 10억원",
      icon: "",
      color: Colors.light.success,
    },
    {
      id: 2,
      name: "주택담보대출",
      description: "주택 구입할 때도, 대출 갈아탈 때도",
      interestRate: "연 3.54% ~ 5.38%",
      maxAmount: "최대 10억원",
      icon: "",
      color: Colors.light.success,
    },
    {
      id: 3,
      name: "아낌e 보금자리론",
      description: "은행 방문 없이 더 낮은 금리로",
      interestRate: "연 2.65% ~ 3.95%",
      maxAmount: "최대 4.2억원",
      icon: "",
      color: Colors.light.success,
    },
    {
      id: 4,
      name: "전월세보증금 대출",
      description: "이사를 가거나 보증금이 오른다면",
      interestRate: "연 3.28% ~ 5.64%",
      maxAmount: "최대 5억원",
      icon: "",
      color: Colors.light.primary,
    },
    {
      id: 5,
      name: "전월세보증금 대출 갈아타기",
      description: "기존 은행 방문 없이 간편하게",
      interestRate: "연 3.28% ~ 5.64%",
      maxAmount: "최대 5억원",
      icon: "",
      color: Colors.light.primary,
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#c8e6c9"
        translucent={false}
      />

      {/* 상단 헤더 - 녹색 배경 */}
      <HanaHeader title="대출" />

      <View style={styles.whiteBackground}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          stickyHeaderIndices={[1]}
          onScroll={(event) => {
            const offsetY = event.nativeEvent.contentOffset.y;
            // 배너 높이(약 140) 이상 스크롤되면 sticky 상태로 간주
            setIsFilterSticky(offsetY > 140);

            // 탭바 숨김/표시
            handleScroll(event);
          }}
          scrollEventThrottle={16}
        >
          {/* 대출 배너 */}
          <View style={styles.bannerSection}>
            <TouchableOpacity
              onPress={handleBannerPress}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={loanBanners[currentBannerIndex].colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.loanBannerContainer}
              >
                <View style={styles.loanBannerIconContainer}>
                  <Image
                    source={loanBanners[currentBannerIndex].icon}
                    style={styles.loanBannerIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.loanBannerContent}>
                  <Text style={styles.loanBannerTitle}>
                    {loanBanners[currentBannerIndex].title}
                  </Text>
                  <Text style={styles.loanBannerMainText}>
                    {loanBanners[currentBannerIndex].mainText}
                  </Text>
                  <Text style={styles.loanBannerSubText}>
                    {loanBanners[currentBannerIndex].subText}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* 배너 인디케이터 */}
            <View style={styles.bannerIndicator}>
              <View style={styles.bannerIndicatorContainer}>
                <Text style={styles.bannerIndicatorText}>
                  ＜ {currentBannerIndex + 1}/{loanBanners.length} ＞
                </Text>
              </View>
            </View>
          </View>

          {/* 필터 버튼들 */}
          <View style={[styles.stickyFilterContainer, isFilterSticky && styles.stickyFilterContainerActive]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScrollView}
              contentContainerStyle={styles.filterContainer}
            >
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === "추천" && styles.filterButtonActive]}
              onPress={() => setSelectedFilter("추천")}
            >
              <Text style={[styles.filterButtonText, selectedFilter === "추천" && styles.filterButtonTextActive]}>추천</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === "신용" && styles.filterButtonActive]}
              onPress={() => setSelectedFilter("신용")}
            >
              <Text style={[styles.filterButtonText, selectedFilter === "신용" && styles.filterButtonTextActive]}>신용</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === "통합신용한도조회" && styles.filterButtonActive]}
              onPress={() => setSelectedFilter("통합신용한도조회")}
            >
              <Text style={[styles.filterButtonText, selectedFilter === "통합신용한도조회" && styles.filterButtonTextActive]}>통합신용한도조회</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === "담보" && styles.filterButtonActive]}
              onPress={() => setSelectedFilter("담보")}
            >
              <Text style={[styles.filterButtonText, selectedFilter === "담보" && styles.filterButtonTextActive]}>담보</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === "전세" && styles.filterButtonActive]}
              onPress={() => setSelectedFilter("전세")}
            >
              <Text style={[styles.filterButtonText, selectedFilter === "전세" && styles.filterButtonTextActive]}>전세</Text>
            </TouchableOpacity>
            </ScrollView>
          </View>

          {selectedFilter === "추천" && (
            <>
              {/* 추천 상품 타이틀 */}
              <Text style={styles.recommendTitle}>추천 상품</Text>

              {/* 갈아타기 서비스 안내 배너 */}
              <View style={styles.serviceInfoSection}>
            <TouchableOpacity style={styles.serviceInfoBanner}>
              <View style={styles.serviceInfoContent}>
                <Text style={styles.serviceInfoLabel}>갈아타기 서비스 안내</Text>
                <Text style={styles.serviceInfoTitle}>신용, 담보, 전세대출</Text>
                <Text style={styles.serviceInfoSubtitle}>낮은 금리로 갈아타기</Text>
                <View style={styles.serviceInfoArrow}>
                  <Text style={styles.serviceInfoArrowText}>→</Text>
                </View>
              </View>
              <Image
                source={require("@/assets/images/loan_icon4.png")}
                style={styles.serviceInfoIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* 추천 상품 리스트 */}
            <View style={styles.recommendSection}>

              {/* 하나원큐신용대출 */}
              <TouchableOpacity style={styles.loanProductItem}>
                <View style={styles.loanProductItemContent}>
                  <Text style={styles.loanProductTitle}>하나원큐신용대출</Text>
                  <Text style={styles.loanProductDescription}>간편하게 나오는 한도/금리</Text>
                </View>
                <View style={styles.loanProductItemRight}>
                  <Text style={styles.loanProductBadge}>최대</Text>
                  <Text style={styles.loanProductAmount}>3억 5천만원</Text>
                </View>
              </TouchableOpacity>

              {/* 하나원큐 비상금대출 */}
              <TouchableOpacity
                style={styles.loanProductItem}
                onPress={() => router.push("/emergency-loan")}
              >
                <View style={styles.loanProductItemContent}>
                  <Text style={styles.loanProductTitle}>하나원큐 비상금대출</Text>
                  <Text style={styles.loanProductDescription}>내 통장에 비상금이 간편하게 똑딱</Text>
                </View>
                <View style={styles.loanProductItemRight}>
                  <Text style={styles.loanProductBadge}>최대</Text>
                  <Text style={styles.loanProductAmount}>3백만원</Text>
                </View>
              </TouchableOpacity>

              {/* 하나원큐 전월세대출 */}
              <TouchableOpacity style={styles.loanProductItem}>
                <View style={styles.loanProductItemContent}>
                  <Text style={styles.loanProductTitle}>하나원큐 전월세대출</Text>
                  <Text style={styles.loanProductDescription}>대출신청과 약정을 모바일로</Text>
                </View>
                <View style={styles.loanProductItemRight}>
                  <Text style={styles.loanProductBadge}>최대</Text>
                  <Text style={styles.loanProductAmount}>가용가 금액</Text>
                </View>
              </TouchableOpacity>

              {/* 하나원큐신용대출(군인) */}
              <TouchableOpacity style={styles.loanProductItem}>
                <View style={styles.loanProductItemContent}>
                  <Text style={styles.loanProductTitle}>하나원큐신용대출(군인)</Text>
                  <Text style={styles.loanProductDescription}>직업군인 특별 우대 상품</Text>
                </View>
                <View style={styles.loanProductItemRight}>
                  <Text style={styles.loanProductBadge}>최대</Text>
                  <Text style={styles.loanProductAmount}>1억 6천만원</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
            </>
          )}

          {selectedFilter === "전세" && (
            <>
              {/* 전세대출 타이틀 */}
              <Text style={styles.recommendTitle}>전세대출</Text>

              {/* 전세대출 배너 */}
              <View style={styles.serviceInfoSection}>
                <TouchableOpacity style={styles.serviceInfoBanner}>
                  <View style={styles.serviceInfoContent}>
                    <Text style={styles.serviceInfoLabel}>전세대출 안내</Text>
                    <Text style={styles.serviceInfoTitle}>맞춤형 전세대출</Text>
                    <Text style={styles.serviceInfoSubtitle}>최저 금리로 시작하세요</Text>
                    <View style={styles.serviceInfoArrow}>
                      <Text style={styles.serviceInfoArrowText}>→</Text>
                    </View>
                  </View>
                  <Image
                    source={require("@/assets/images/loan_icon5.png")}
                    style={styles.serviceInfoIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                {/* 전세대출 목록 */}
                <View style={styles.recommendSection}>
                {/* 전세대출 갈아타기 */}
                <TouchableOpacity style={styles.loanProductItem}>
                  <View style={styles.loanProductItemContent}>
                    <Text style={styles.loanProductTitle}>전세대출 갈아타기</Text>
                    <Text style={styles.loanProductDescription}>낮은 금리로 갈아타기</Text>
                  </View>
                  <View style={styles.loanProductItemRight}>
                    <Text style={styles.loanProductBadge}>최대</Text>
                    <Text style={styles.loanProductAmount}>5억원</Text>
                  </View>
                </TouchableOpacity>

                {/* 주택금융공사 전세대출(비대면전용) */}
                <TouchableOpacity style={styles.loanProductItem}>
                  <View style={styles.loanProductItemContent}>
                    <Text style={styles.loanProductTitle}>주택금융공사 전세대출(비대면전용)</Text>
                    <Text style={styles.loanProductDescription}>임대인이 법인이어도 취급 가능한 전세대출</Text>
                  </View>
                  <View style={styles.loanProductItemRight}>
                    <Text style={styles.loanProductBadge}>최대</Text>
                    <Text style={styles.loanProductAmount}>2.22억원</Text>
                  </View>
                </TouchableOpacity>

                {/* 주택도시보증공사 전세대출(비대면전용) */}
                <TouchableOpacity style={styles.loanProductItem}>
                  <View style={styles.loanProductItemContent}>
                    <Text style={styles.loanProductTitle}>주택도시보증공사 전세대출(비대면전용)</Text>
                    <Text style={styles.loanProductDescription}>반환보증도 한번에 가입하는 전세대출</Text>
                  </View>
                  <View style={styles.loanProductItemRight}>
                    <Text style={styles.loanProductBadge}>최대</Text>
                    <Text style={styles.loanProductAmount}>4억원</Text>
                  </View>
                </TouchableOpacity>

                {/* 서울보증보험 전세대출(비대면전용) */}
                <TouchableOpacity style={styles.loanProductItem}>
                  <View style={styles.loanProductItemContent}>
                    <Text style={styles.loanProductTitle}>서울보증보험 전세대출(비대면전용)</Text>
                    <Text style={styles.loanProductDescription}>임차보증금에 제한이 없는 전세대출</Text>
                  </View>
                  <View style={styles.loanProductItemRight}>
                    <Text style={styles.loanProductBadge}>최대</Text>
                    <Text style={styles.loanProductAmount}>5억원</Text>
                  </View>
                </TouchableOpacity>

                {/* 서울시 협약 전세대출 */}
                <TouchableOpacity style={styles.loanProductItem}>
                  <View style={styles.loanProductItemContent}>
                    <Text style={styles.loanProductTitle}>서울시 협약 전세대출</Text>
                    <Text style={styles.loanProductDescription}>서울시에 거주하는 청년을 위한 전세대출</Text>
                  </View>
                  <View style={styles.loanProductItemRight}>
                    <Text style={styles.loanProductBadge}>최대</Text>
                    <Text style={styles.loanProductAmount}>2억원</Text>
                  </View>
                </TouchableOpacity>

                {/* 군간부전세론(기본)(M) */}
                <TouchableOpacity style={styles.loanProductItem}>
                  <View style={styles.loanProductItemContent}>
                    <Text style={styles.loanProductTitle}>군간부전세론(기본)(M)</Text>
                    <Text style={styles.loanProductDescription}>대출신청과 약정을 모바일로</Text>
                  </View>
                  <View style={styles.loanProductItemRight}>
                    <Text style={styles.loanProductBadge}>최대</Text>
                    <Text style={styles.loanProductAmount}>3.6억원</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

              {/* 나의 한도 확인하기 버튼 */}
              <TouchableOpacity
                style={styles.checkLimitButton}
                onPress={() => router.push("/loan-consent")}
              >
                <Text style={styles.checkLimitButtonText}>나의 한도 확인하기</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  whiteBackground: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  summaryCard: {
    margin: 20,
    marginBottom: 24,
  },
  summaryHeader: {
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 8,
  },
  summarySubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  summaryStats: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.light.divider,
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
    padding: 16,
    paddingBottom: 0,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  productsContainer: {
    gap: 16,
  },
  productCard: {
    marginBottom: 0,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  productInfo: {
    flex: 1,
    marginRight: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  productBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  productBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.light.textInverse,
  },
  productDetails: {
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailItem: {
    flex: 1,
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
  },
  productFeatures: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  featureChip: {
    height: 28,
  },
  featureChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  productButton: {
    width: "100%",
  },
  filterContainer: {
    paddingRight: 20,
  },
  filterChip: {
    marginRight: 12,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  filterChipSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterChipText: {
    color: Colors.light.text,
  },
  filterChipTextSelected: {
    color: Colors.light.textInverse,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  loansContainer: {
    gap: 16,
  },
  loanCard: {
    marginBottom: 0,
  },
  loanHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  loanInfo: {
    flex: 1,
  },
  buildingName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 8,
  },
  unitNumber: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: 12,
  },
  loanTypeContainer: {
    flexDirection: "row",
    gap: 8,
  },
  loanTypeChip: {
    height: 28,
  },
  loanTypeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusChip: {
    height: 28,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.textInverse,
  },
  menuButton: {
    margin: 0,
  },
  loanDetails: {
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailItem: {
    flex: 1,
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
  },
  progressSection: {
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  progressValue: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  loanInfoSection: {
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  loanFeatures: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  loanActions: {
    flexDirection: "row",
    gap: 12,
  },
  detailButton: {
    flex: 1,
  },
  repaymentButton: {
    flex: 1,
  },
  approvalButton: {
    flex: 1,
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  applySection: {
    paddingHorizontal: 20,
  },
  applyButton: {
    width: "100%",
  },
  categorySection: {
    marginBottom: 24,
  },
  loanItem: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  loanInfo: {
    paddingTop: 2,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  loanHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  loanTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.3,
  },
  loanDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  loanDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  interestRateLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  interestRate: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.primary,
    letterSpacing: -0.3,
  },
  maxAmount: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.textSecondary,
  },
  infoSection: {
    backgroundColor: "#f0f8f0",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  iconText: {
    fontSize: 24,
  },
  // 필터 버튼 스타일
  stickyFilterContainer: {
    backgroundColor: Colors.light.background,
    paddingTop: 12,
    paddingBottom: 20,
  },
  stickyFilterContainerActive: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  filterScrollView: {
    marginBottom: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  filterButtonActive: {
    backgroundColor: "#2c3e50",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
  },
  filterButtonTextActive: {
    color: "white",
  },
  // 갈아타기 서비스 배너
  serviceInfoSection: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  serviceInfoContent: {
    flex: 1,
  },
  serviceInfoLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  serviceInfoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
  },
  serviceInfoSubtitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 8,
  },
  serviceInfoArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  serviceInfoArrowText: {
    fontSize: 18,
    color: Colors.light.text,
  },
  serviceInfoIcon: {
    width: 120,
    height: 120,
    marginLeft: 16,
  },
  // 추천 상품 섹션
  recommendSection: {
    marginBottom: 0,
  },
  recommendTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 16,
    marginLeft: 16,
  },
  loanProductItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  loanProductItemContent: {
    flex: 1,
    marginRight: 16,
  },
  loanProductItemRight: {
    alignItems: "flex-end",
  },
  loanProductTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
  },
  loanProductDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  loanProductBadge: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  loanProductAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.primary,
  },
  checkLimitButton: {
    backgroundColor: Colors.light.primary,
    marginHorizontal: 16,
    marginBottom: 75,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
  },
  checkLimitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  // 광고 배너 스타일
  bannerSection: {
    marginBottom: 16,
  },
  loanBannerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    minHeight: 140,
  },
  loanBannerIconContainer: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  loanBannerIcon: {
    width: 100,
    height: 100,
  },
  loanBannerContent: {
    flex: 1,
  },
  loanBannerTitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  loanBannerMainText: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  loanBannerSubText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
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
