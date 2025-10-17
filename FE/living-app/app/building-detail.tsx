import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
  Share,
  StatusBar,
  Clipboard,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Constants from 'expo-constants';
import { HanaHeader } from '@/components/HanaHeader';
import { HanaCard } from '@/components/HanaCard';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { buildingAPI, unitAPI, reservationAPI } from '@/services/mobileApi';

const { width } = Dimensions.get('window');

interface Building {
  id: number;
  name: string;
  address: string;
  description: string;
  status: string;
  buildingType: string;
  totalUnits: number;
  availableUnits: number;
  latitude?: number;
  longitude?: number;
  images: string;
  createdAt: string;
  updatedAt: string;
}

interface Unit {
  id: number;
  buildingId: number;
  unitNumber: string;
  floor: number;
  roomCount: number;
  bathCount: number;
  area: number;
  monthlyRent: number;
  deposit: number;
  status: string;
  unitType: string;
  description: string;
  images: string;
  createdAt: string;
  updatedAt: string;
}

interface ReservationForm {
  buildingId: number;
  unitId: number;
  name: string;
  email: string;
  phone: string;
  age: string;
  occupation: string;
  currentResidence: string;
  moveInDate: string;
  residencePeriod: string;
  howDidYouKnow: string;
  message: string;
}

export default function BuildingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  // Kakao Map API 키
  const KAKAO_MAP_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_KAKAO_MAP_JS_KEY || process.env.EXPO_PUBLIC_KAKAO_MAP_JS_KEY;
  
  const [building, setBuilding] = useState<Building | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [unitImageModalVisible, setUnitImageModalVisible] = useState(false);
  const [currentUnitImages, setCurrentUnitImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [reservationForm, setReservationForm] = useState<ReservationForm>({
    buildingId: 0,
    unitId: 0,
    name: '',
    email: '',
    phone: '',
    age: '',
    occupation: '',
    currentResidence: '',
    moveInDate: '',
    residencePeriod: '',
    howDidYouKnow: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isFavorite, setIsFavorite] = useState(false);
  const [compareList, setCompareList] = useState<number[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // 드롭다운 상태
  const [showAgeDropdown, setShowAgeDropdown] = useState(false);
  const [showOccupationDropdown, setShowOccupationDropdown] = useState(false);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  // 드롭다운 옵션들
  const ageOptions = ['20대', '30대', '40대', '50대', '60대 이상'];
  const occupationOptions = ['회사원', '공무원', '자영업', '프리랜서', '학생', '주부', '기타'];
  const periodOptions = ['6개월', '1년', '2년', '3년', '장기거주'];

  useEffect(() => {
    if (id) {
      fetchBuildingDetail();
      fetchAvailableUnits();
    }
  }, [id]);

  useEffect(() => {
    if (user && showReservationForm) {
      setReservationForm(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        howDidYouKnow: user.beforeAddress || ''
      }));
    }
  }, [user, showReservationForm]);

  const fetchBuildingDetail = async () => {
    try {
      const response = await buildingAPI.getById(Number(id));
      
      const buildingData = response && typeof response === 'object' && 'data' in response 
        ? response.data 
        : response;
      
      if (buildingData) {
        let parsedImages: string[] = [];
        
        if (buildingData.images) {
          try {
            if (typeof buildingData.images === 'string') {
              parsedImages = JSON.parse(buildingData.images);
            } else if (Array.isArray(buildingData.images)) {
              parsedImages = buildingData.images;
            }
          } catch (parseError) {
            parsedImages = [];
          }
        }
        
        const buildingWithImages = {
          ...buildingData,
          images: JSON.stringify(parsedImages)
        };

        setBuilding(buildingWithImages);

        // 예약 폼에 건물 ID 설정
        setReservationForm(prev => ({
          ...prev,
          buildingId: buildingWithImages.id
        }));
      } else {
        setError('건물 정보를 찾을 수 없습니다.');
      }
    } catch (error: any) {
      setError('건물 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUnits = async () => {
    try {
      const response = await unitAPI.getByBuildingId(Number(id));
      const unitsData = response && typeof response === 'object' && 'data' in response 
        ? response.data 
        : response;
      
      if (Array.isArray(unitsData)) {
        setUnits(unitsData);
      } else {
        setUnits([]);
      }
    } catch (error: any) {
      setUnits([]);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return '입주가능';
      case 'OCCUPIED': return '입주중';
      case 'MAINTENANCE': return '수리중';
      case 'RESERVED': return '예약됨';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return Colors.light.success;
      case 'OCCUPIED': return Colors.light.error;
      case 'MAINTENANCE': return Colors.light.warning;
      case 'RESERVED': return Colors.light.primary;
      default: return Colors.light.textSecondary;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'STUDIO': return '원룸';
      case 'ONE_BEDROOM': return '원룸';
      case 'TWO_BEDROOM': return '투룸';
      case 'THREE_BEDROOM': return '쓰리룸';
      case 'OFFICE': return '오피스';
      default: return type;
    }
  };

  const copyAddress = async () => {
    if (!building?.address) {
      Alert.alert('알림', '주소 정보가 없습니다.');
      return;
    }

    try {
      await Clipboard.setString(building.address);
      Alert.alert('완료', '주소가 클립보드에 복사되었습니다.');
    } catch (error) {
      Alert.alert('오류', '주소 복사에 실패했습니다.');
    }
  };

  const openNavigation = () => {
    if (!building?.address) {
      Alert.alert('알림', '주소 정보가 없습니다.');
      return;
    }

    const address = encodeURIComponent(building.address);

    Alert.alert(
      '길안내',
      '어떤 앱으로 길안내를 받으시겠습니까?',
      [
        {
          text: '카카오맵',
          onPress: () => {
            const kakaoUrl = `kakaomap://search?q=${address}`;
            Linking.canOpenURL(kakaoUrl).then(supported => {
              if (supported) {
                Linking.openURL(kakaoUrl);
              } else {
                Linking.openURL(`https://map.kakao.com/link/search/${address}`);
              }
            });
          }
        },
        {
          text: '네이버 지도',
          onPress: () => {
            const naverUrl = `nmap://search?query=${address}`;
            Linking.canOpenURL(naverUrl).then(supported => {
              if (supported) {
                Linking.openURL(naverUrl);
              } else {
                Linking.openURL(`https://map.naver.com/v5/search/${address}`);
              }
            });
          }
        },
        {
          text: '구글 지도',
          onPress: () => {
            const googleUrl = `comgooglemaps://?q=${address}`;
            Linking.canOpenURL(googleUrl).then(supported => {
              if (supported) {
                Linking.openURL(googleUrl);
              } else {
                Linking.openURL(`https://www.google.com/maps/search/${address}`);
              }
            });
          }
        },
        {
          text: '취소',
          style: 'cancel'
        }
      ]
    );
  };


  const formatCurrency = (amount: number) => {
    if (amount >= 100000000) {
      const billion = Math.floor(amount / 100000000);
      const remainder = Math.floor((amount % 100000000) / 10000);
      return remainder > 0 ? `${billion}억 ${remainder}만원` : `${billion}억`;
    } else if (amount >= 10000) {
      return `${Math.floor(amount / 10000)}만원`;
    } else {
      return `${amount}원`;
    }
  };

  const getPriceRange = () => {
    const availableUnits = units.filter(unit => unit.status === 'AVAILABLE');
    if (availableUnits.length === 0) return null;

    const prices = availableUnits.map(unit => unit.monthlyRent);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) {
      return formatCurrency(minPrice);
    } else {
      return `${formatCurrency(minPrice)} ~ ${formatCurrency(maxPrice)}`;
    }
  };

  const handleReservation = (unit: Unit) => {
    setSelectedUnit(unit);
    setReservationForm(prev => ({ 
      ...prev, 
      buildingId: building?.id || 0,
      unitId: unit.id 
    }));
    setShowReservationForm(true);
  };

  const submitReservation = async () => {
    if (!reservationForm.name || !reservationForm.email || !reservationForm.phone || 
        !reservationForm.age || !reservationForm.occupation || !reservationForm.currentResidence ||
        !reservationForm.moveInDate || !reservationForm.residencePeriod) {
      Alert.alert('오류', '필수 항목을 모두 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await reservationAPI.create(reservationForm);
      Alert.alert('성공', '예약이 완료되었습니다.', [
        { text: '확인', onPress: () => setShowReservationForm(false) }
      ]);
    } catch (error: any) {
      Alert.alert('오류', '예약 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };


  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setSelectedDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setReservationForm(prev => ({...prev, moveInDate: formattedDate}));
    }
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '날짜를 선택하세요';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const handleFavoriteToggle = () => {
    setIsFavorite(!isFavorite);
    Alert.alert(
      isFavorite ? '관심 목록에서 제거' : '관심 목록에 추가',
      isFavorite
        ? '이 건물을 관심 목록에서 제거하시겠습니까?'
        : '이 건물을 관심 목록에 추가하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: isFavorite ? '제거' : '추가',
          onPress: () => {
            Alert.alert('완료', isFavorite ? '관심 목록에서 제거되었습니다.' : '관심 목록에 추가되었습니다.');
          }
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `${building?.name}\n${building?.address}\n\n하나원큐리빙에서 확인해보세요!`,
        title: building?.name,
      });
    } catch (error) {
      Alert.alert('오류', '공유하기에 실패했습니다.');
    }
  };

  const handleUnitCompare = (unitId: number) => {
    const isAlreadyInCompare = compareList.includes(unitId);

    if (isAlreadyInCompare) {
      setCompareList(compareList.filter(id => id !== unitId));
      Alert.alert('알림', '비교 목록에서 제거되었습니다.');
    } else {
      if (compareList.length >= 3) {
        Alert.alert('알림', '최대 3개까지만 비교할 수 있습니다.');
        return;
      }
      setCompareList([...compareList, unitId]);
      Alert.alert('알림', '비교 목록에 추가되었습니다.');
    }
  };

  const openCompareModal = () => {
    if (compareList.length < 2) {
      Alert.alert('알림', '비교하려면 최소 2개의 호실을 선택해주세요.');
      return;
    }
    setShowCompareModal(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>건물 정보를 불러오는 중...</Text>
      </View>
    );
  }

  if (error || !building) {
    return (
      <View style={styles.errorContainer}>
        <HanaHeader
          title="오피스텔 상세정보"
          showBackButton={true}
          onBackPress={() => router.back()}
        />
        <MaterialIcons name="error-outline" size={48} color={Colors.light.error} />
        <Text style={styles.errorText}>{error || '건물 정보를 찾을 수 없습니다.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchBuildingDetail}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const buildingImages = building.images ? (() => {
    try {
      return JSON.parse(building.images);
    } catch {
      return [];
    }
  })() : [];

  const headerOpacity = scrollY > 10 ? 1 : 0;
  const headerVisible = scrollY > 10;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={scrollY > 10 ? "dark-content" : "light-content"}
        backgroundColor="transparent"
        translucent={true}
      />

      {/* 투명 헤더 - 스크롤 시에만 표시 */}
      <View style={[styles.headerContainer, { opacity: headerOpacity }]}>
        <HanaHeader
          title={building?.name || "오피스텔 상세정보"}
          showBackButton={true}
          onBackPress={() => router.back()}
        />
      </View>

      {/* 뒤로가기 버튼 - 스크롤 전에만 표시 */}
      {scrollY <= 10 && (
        <TouchableOpacity
          style={styles.floatingBackButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      )}

      <View style={styles.whiteBackground}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingHorizontal: 0 }}
          showsVerticalScrollIndicator={false}
          onScroll={(event) => {
            const offsetY = event.nativeEvent.contentOffset.y;
            setScrollY(offsetY);
          }}
          scrollEventThrottle={16}
        >
        {/* 건물 이미지 섹션 */}
        {buildingImages.length > 0 && (
          <View style={styles.imageSection}>
            <View style={styles.imageGrid}>
              {/* 메인 이미지 */}
              <TouchableOpacity
                style={[styles.mainImageContainer, buildingImages.length === 1 && styles.singleImage]}
                onPress={() => {
                  setSelectedImageIndex(0);
                  setImageModalVisible(true);
                }}
              >
                <Image
                  source={{ uri: buildingImages[0] }}
                  style={styles.mainImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>

              {/* 서브 이미지들 */}
              {buildingImages.length > 1 && (
                <View style={styles.subImagesContainer}>
                  {buildingImages.slice(1, 5).map((image: string, index: number) => (
                    <TouchableOpacity
                      key={index + 1}
                      style={[
                        styles.subImageContainer,
                        index === buildingImages.slice(1, 5).length - 1 && styles.lastSubImage
                      ]}
                      onPress={() => {
                        setSelectedImageIndex(index + 1);
                        setImageModalVisible(true);
                      }}
                    >
                      <Image
                        source={{ uri: image }}
                        style={styles.subImage}
                        resizeMode="cover"
                      />
                      {/* 마지막 이미지에 더보기 표시 */}
                      {index === 3 && buildingImages.length > 5 && (
                        <View style={styles.moreImagesOverlay}>
                          <Text style={styles.moreImagesText}>+{buildingImages.length - 5}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* 이미지 인디케이터 - 항상 5개 표시 */}
            <View style={styles.imageIndicatorContainer}>
              {[0, 1, 2, 3, 4].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.imageIndicatorDot,
                    index === 0 && styles.imageIndicatorDotActive
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* 건물 기본 정보 */}
        <View style={styles.infoSection}>
          {/* 태그들 */}
          <View style={styles.tagsContainer}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>역세권</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>신축</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>핫플</Text>
            </View>
          </View>

          {/* 제목과 액션 버튼 */}
          <View style={styles.titleRow}>
            <Text style={styles.buildingName}>{building.name}</Text>
            <View style={styles.titleActions}>
              <TouchableOpacity
                style={styles.titleIconButton}
                onPress={handleFavoriteToggle}
              >
                <MaterialIcons
                  name={isFavorite ? "favorite" : "favorite-border"}
                  size={24}
                  color={isFavorite ? Colors.light.error : Colors.light.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.titleIconButton}
                onPress={handleShare}
              >
                <MaterialIcons name="share" size={24} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.buildingAddress}>{building.address}</Text>

          {getPriceRange() && (
            <Text style={styles.priceRange}>월세 {getPriceRange()}</Text>
          )}

          <Text style={styles.statsText}>
            전체 {building.totalUnits}세대 • 입주가능 {units.filter(unit => unit.status === 'AVAILABLE').length}세대
          </Text>

          {building.description && (
            <Text style={styles.buildingDescription}>{building.description}</Text>
          )}

          {/* 비교하기 버튼 (호실 선택 시에만 표시) */}
          {compareList.length > 0 && (
            <TouchableOpacity
              style={styles.compareActionButton}
              onPress={openCompareModal}
            >
              <MaterialIcons name="compare-arrows" size={20} color="white" />
              <Text style={styles.compareActionButtonText}>
                선택된 호실 비교하기 ({compareList.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 세대 목록 */}
        <View style={styles.unitsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>입주 가능한 세대</Text>
          </View>
          
          {units.filter(unit => unit.status === 'AVAILABLE').map((unit) => (
            <View key={unit.id} style={styles.unitCard}>
              {/* 세대 메인 이미지 */}
              {unit.images && JSON.parse(unit.images).length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setCurrentUnitImages(JSON.parse(unit.images));
                    setCurrentImageIndex(0);
                    setUnitImageModalVisible(true);
                  }}
                  style={styles.unitMainImageContainer}
                >
                  <Image
                    source={{ uri: JSON.parse(unit.images)[0] }}
                    style={styles.unitMainImage}
                    resizeMode="cover"
                  />
                  <View style={styles.unitImageOverlay}>
                    <MaterialIcons name="fullscreen" size={20} color="white" />
                  </View>
                </TouchableOpacity>
              )}

              {/* 세대 헤더 - 호수와 가격 정보 */}
              <View style={styles.unitHeader}>
                <View style={styles.unitTitleSection}>
                  <Text style={styles.unitNumber}>{unit.unitNumber}호</Text>
                  <View style={styles.unitBasicInfo}>
                    <Text style={styles.unitType}>{getTypeText(unit.unitType)}</Text>
                    <View style={styles.separator} />
                    <Text style={styles.unitFloor}>{unit.floor}층</Text>
                    <View style={styles.separator} />
                    <Text style={styles.unitArea}>{unit.area}㎡</Text>
                  </View>
                </View>
                <View style={styles.priceTag}>
                  <Text style={styles.priceText}>
                    {unit.deposit > 0 && (
                      <>
                        <Text style={styles.priceLabel}>보증금 </Text>
                        <Text style={styles.depositAmount}>{formatCurrency(unit.deposit)}</Text>
                        <Text style={styles.priceLabel}> / </Text>
                      </>
                    )}
                    <Text style={styles.priceLabel}>월세 </Text>
                    <Text style={styles.rentAmount}>{formatCurrency(unit.monthlyRent)}</Text>
                  </Text>
                </View>
              </View>

              {/* 세대 설명 */}
              {unit.description && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.unitDescription}>{unit.description}</Text>
                </View>
              )}
              
              {/* 예약 버튼 */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.reservationButton}
                  onPress={() => handleReservation(unit)}
                >
                  <View style={styles.buttonContent}>
                    <MaterialIcons name="event-available" size={18} color="white" />
                    <Text style={styles.reservationButtonText}>방문 예약하기</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          
          {units.filter(unit => unit.status === 'AVAILABLE').length === 0 && (
            <HanaCard style={styles.noUnitsCard}>
              <MaterialIcons name="home" size={48} color={Colors.light.textSecondary} />
              <Text style={styles.noUnitsText}>현재 입주 가능한 세대가 없습니다.</Text>
              <Text style={styles.noUnitsSubText}>빈 세대가 생기면 알림을 받아보세요.</Text>
            </HanaCard>
          )}
        </View>

        {/* 지도 섹션 */}
        <View style={styles.mapSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>위치정보</Text>
          </View>
          <View style={styles.mapContainer}>
            {KAKAO_MAP_API_KEY ? (
              <WebView
                style={styles.map}
                source={{
                  html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>Kakao Map</title>
                      <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_API_KEY}"></script>
                    </head>
                    <body style="margin:0;padding:0;width:100%;height:100%;">
                      <div id="map" style="width:100%;height:250px;"></div>
                      <script>
                        window.onload = function() {
                          try {
                            if (typeof kakao === 'undefined') {
                              document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:250px;font-family:Arial;color:#666;">Kakao Map API를 불러올 수 없습니다</div>';
                              return;
                            }

                            // 위도/경도 값 설정 (기본값: 서울시청)
                            var latitude = ${building?.latitude ? building.latitude : 37.5665};
                            var longitude = ${building?.longitude ? building.longitude : 126.9780};


                            var container = document.getElementById('map');
                            var options = {
                              center: new kakao.maps.LatLng(latitude, longitude),
                              level: 3
                            };
                            var map = new kakao.maps.Map(container, options);

                            // 마커 생성 및 표시
                            var markerPosition = new kakao.maps.LatLng(latitude, longitude);
                            var marker = new kakao.maps.Marker({
                              position: markerPosition
                            });
                            marker.setMap(map);


                          } catch (error) {
                            console.error('Map error:', error);
                            document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:250px;font-family:Arial;color:#666;">지도 로딩 중 오류가 발생했습니다: ' + error.message + '</div>';
                          }
                        };
                      </script>
                    </body>
                    </html>
                  `
                }}
                scrollEnabled={false}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.warn('WebView error: ', nativeEvent);
                }}
                onHttpError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.warn('WebView HTTP error: ', nativeEvent);
                }}
                onMessage={(event) => {
                }}
              />
            ) : (
              <View style={styles.mapPlaceholder}>
                <MaterialIcons name="location-off" size={48} color={Colors.light.textSecondary} />
                <Text style={styles.mapPlaceholderText}>
                  지도를 표시하려면 Kakao Map API 키가 필요합니다
                </Text>
              </View>
            )}
          </View>
          {building?.address && (
            <View style={styles.addressContainer}>
              <MaterialIcons name="location-on" size={20} color={Colors.light.primary} />
              <Text style={styles.addressText}>{building.address}</Text>
            </View>
          )}

          {building?.address && (
            <View style={styles.mapButtonContainer}>
              <TouchableOpacity style={styles.mapButton} onPress={copyAddress}>
                <MaterialIcons name="content-copy" size={20} color={Colors.light.primary} />
                <Text style={styles.mapButtonText}>주소복사</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.mapButton} onPress={openNavigation}>
                <MaterialIcons name="directions" size={20} color={Colors.light.primary} />
                <Text style={styles.mapButtonText}>길안내</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 주변 둘러보기 섹션 */}
        <View style={styles.exploreSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>주변 둘러보기</Text>
          </View>

          <View style={styles.exploreList}>
            {/* 핫플레이스 */}
            <TouchableOpacity style={styles.exploreItem}>
              <View style={styles.exploreIconContainer}>
                <MaterialIcons name="local-fire-department" size={24} color="#FF6B35" />
              </View>
              <View style={styles.exploreContent}>
                <Text style={styles.exploreTitle}>핫플레이스</Text>
                <Text style={styles.exploreDescription}>주변 인기 맛집, 카페, 쇼핑몰</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.light.textSecondary} />
            </TouchableOpacity>

            {/* 도심 중심 위치 */}
            <TouchableOpacity style={styles.exploreItem}>
              <View style={styles.exploreIconContainer}>
                <MaterialIcons name="location-city" size={24} color="#4CAF50" />
              </View>
              <View style={styles.exploreContent}>
                <Text style={styles.exploreTitle}>도심 중심 위치</Text>
                <Text style={styles.exploreDescription}>지하철역, 버스정류장, 주요 시설</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.light.textSecondary} />
            </TouchableOpacity>

            {/* 편의시설 */}
            <TouchableOpacity style={styles.exploreItem}>
              <View style={styles.exploreIconContainer}>
                <MaterialIcons name="local-convenience-store" size={24} color="#2196F3" />
              </View>
              <View style={styles.exploreContent}>
                <Text style={styles.exploreTitle}>편의시설</Text>
                <Text style={styles.exploreDescription}>병원, 은행, 마트, 공원 등</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 빈 공간 */}
        <View style={styles.spacer} />

        {/* 오피스텔 문의 섹션 */}
        <View style={styles.inquirySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>오피스텔 문의</Text>
          </View>

          <View style={styles.inquiryList}>
            {/* 임대 문의 */}
            <TouchableOpacity style={styles.inquiryItem}>
              <View style={styles.inquiryContent}>
                <Text style={styles.inquiryTitle}>임대 문의</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.light.textSecondary} />
            </TouchableOpacity>

            {/* 관리실 문의 */}
            <TouchableOpacity style={styles.inquiryItem}>
              <View style={styles.inquiryContent}>
                <Text style={styles.inquiryTitle}>관리실 문의</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.light.textSecondary} />
            </TouchableOpacity>

            {/* 온라인 문의 */}
            <TouchableOpacity style={styles.inquiryItem}>
              <View style={styles.inquiryContent}>
                <Text style={styles.inquiryTitle}>온라인 문의</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 고지사항 섹션 */}
        <View style={styles.noticeSection}>
          <View style={styles.noticeContent}>
            <Text style={styles.noticeText}>
              - 표시된 임대료 및 관리비는 실제와 상이할 수 있습니다.{'\n'}
              - 계약 조건 및 입주 가능 일정은 임대인과 협의 후 확정됩니다.{'\n'}
              - 공용시설 이용료 및 주차비는 별도 부과될 수 있습니다.{'\n'}
              - 반려동물 동반 입주는 사전 협의가 필요합니다.{'\n'}
              - 상기 정보는 참고용이며, 정확한 내용은 현장 확인 바랍니다.
            </Text>
          </View>
        </View>
        </ScrollView>
      </View>

      {/* 이미지 모달 */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseArea}
            onPress={() => setImageModalVisible(false)}
          >
            <View style={styles.modalImageContainer}>
              <Image
                source={{ uri: buildingImages[selectedImageIndex] }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setImageModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* 호실 이미지 모달 */}
      <Modal
        visible={unitImageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setUnitImageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseArea}
            onPress={() => setUnitImageModalVisible(false)}
          >
            <View style={styles.modalImageContainer}>
              <Image
                source={{ uri: currentUnitImages[currentImageIndex] }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setUnitImageModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* 예약 폼 모달 */}
      <Modal
        visible={showReservationForm}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowReservationForm(false)}
        presentationStyle="fullScreen"
      >
        <View style={styles.fullScreenModal}>
          <View style={styles.reservationModal}>
            <View style={styles.reservationHeader}>
              <Text style={styles.reservationTitle}>방문 예약</Text>
              <TouchableOpacity
                onPress={() => setShowReservationForm(false)}
                style={styles.modalCloseIcon}
              >
                <MaterialIcons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            {selectedUnit && (
              <View style={styles.selectedUnitInfo}>
                <Text style={styles.selectedUnitText}>
                  {building.name} {selectedUnit.unitNumber}호
                </Text>
                <Text style={styles.selectedUnitDetails}>
                  {getTypeText(selectedUnit.unitType)} • {selectedUnit.area}㎡
                </Text>
              </View>
            )}

            <ScrollView
              style={styles.formContainer}
              nestedScrollEnabled={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              scrollEnabled={true}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 20
              }}
            >
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>이름 *</Text>
                <TextInput
                  style={styles.formInput}
                  value={reservationForm.name}
                  onChangeText={(text) => setReservationForm(prev => ({...prev, name: text}))}
                  placeholder="이름을 입력하세요"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>이메일 *</Text>
                <TextInput
                  style={styles.formInput}
                  value={reservationForm.email}
                  onChangeText={(text) => setReservationForm(prev => ({...prev, email: text}))}
                  placeholder="이메일을 입력하세요"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>연락처 *</Text>
                <TextInput
                  style={styles.formInput}
                  value={reservationForm.phone}
                  onChangeText={(text) => setReservationForm(prev => ({...prev, phone: text}))}
                  placeholder="연락처를 입력하세요"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>나이</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => {
                    setShowAgeDropdown(!showAgeDropdown);
                    setShowOccupationDropdown(false);
                    setShowPeriodDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownText,
                    !reservationForm.age && styles.dropdownPlaceholder
                  ]}>
                    {reservationForm.age || '나이를 선택하세요'}
                  </Text>
                  <MaterialIcons
                    name={showAgeDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                    size={20}
                    color={Colors.light.textSecondary}
                  />
                </TouchableOpacity>
                {showAgeDropdown && (
                  <View style={styles.dropdownList}>
                    {ageOptions.map((option, index) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownItem,
                          index === ageOptions.length - 1 && styles.dropdownItemLast
                        ]}
                        onPress={() => {
                          setReservationForm(prev => ({...prev, age: option}));
                          setShowAgeDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>직업</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => {
                    setShowOccupationDropdown(!showOccupationDropdown);
                    setShowAgeDropdown(false);
                    setShowPeriodDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownText,
                    !reservationForm.occupation && styles.dropdownPlaceholder
                  ]}>
                    {reservationForm.occupation || '직업을 선택하세요'}
                  </Text>
                  <MaterialIcons
                    name={showOccupationDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                    size={20}
                    color={Colors.light.textSecondary}
                  />
                </TouchableOpacity>
                {showOccupationDropdown && (
                  <View style={styles.dropdownList}>
                    {occupationOptions.map((option, index) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownItem,
                          index === occupationOptions.length - 1 && styles.dropdownItemLast
                        ]}
                        onPress={() => {
                          setReservationForm(prev => ({...prev, occupation: option}));
                          setShowOccupationDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>현재 거주지</Text>
                <TextInput
                  style={styles.formInput}
                  value={reservationForm.currentResidence}
                  onChangeText={(text) => setReservationForm(prev => ({...prev, currentResidence: text}))}
                  placeholder="현재 거주지를 입력하세요"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>희망 거주기간</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => {
                    setShowPeriodDropdown(!showPeriodDropdown);
                    setShowAgeDropdown(false);
                    setShowOccupationDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownText,
                    !reservationForm.residencePeriod && styles.dropdownPlaceholder
                  ]}>
                    {reservationForm.residencePeriod || '거주기간을 선택하세요'}
                  </Text>
                  <MaterialIcons
                    name={showPeriodDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                    size={20}
                    color={Colors.light.textSecondary}
                  />
                </TouchableOpacity>
                {showPeriodDropdown && (
                  <View style={styles.dropdownList}>
                    {periodOptions.map((option, index) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownItem,
                          index === periodOptions.length - 1 && styles.dropdownItemLast
                        ]}
                        onPress={() => {
                          setReservationForm(prev => ({...prev, residencePeriod: option}));
                          setShowPeriodDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>희망 입주일</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[
                    styles.datePickerText,
                    !reservationForm.moveInDate && styles.datePickerPlaceholder
                  ]}>
                    {formatDateDisplay(reservationForm.moveInDate)}
                  </Text>
                  <MaterialIcons name="date-range" size={20} color={Colors.light.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>문의사항</Text>
                <TextInput
                  style={[styles.formInput, styles.messageInput]}
                  value={reservationForm.message}
                  onChangeText={(text) => setReservationForm(prev => ({...prev, message: text}))}
                  placeholder="추가 문의사항이 있으시면 입력해주세요"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            {/* 날짜 선택 피커 (iOS용) */}
            {showDatePicker && Platform.OS === 'ios' && (
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerHeaderButton}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerHeaderButton}>확인</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' && Platform.Version >= 14 ? 'compact' : 'spinner'}
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                    textColor="#000000"
                    accentColor={Colors.light.primary}
                    style={styles.datePickerSpinner}
                    locale="ko-KR"
                  />
                </View>
              </View>
            )}

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowReservationForm(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={submitReservation}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>예약하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Android용 날짜 선택 피커 */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
          locale="ko-KR"
        />
      )}

      {/* 호실 비교 모달 */}
      <Modal
        visible={showCompareModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowCompareModal(false)}
        presentationStyle="fullScreen"
      >
        <View style={styles.compareModal}>
          <View style={styles.compareHeader}>
            <Text style={styles.compareTitle}>호실 비교</Text>
            <TouchableOpacity
              onPress={() => setShowCompareModal(false)}
              style={styles.modalCloseIcon}
            >
              <MaterialIcons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.compareContent}>
            <View style={styles.compareTable}>
              {/* 헤더 행 */}
              <View style={styles.compareRowHeader}>
                <Text style={styles.compareHeaderCell}>구분</Text>
                {compareList.map((unitId) => {
                  const unit = units.find(u => u.id === unitId);
                  return (
                    <Text key={unitId} style={styles.compareHeaderCell}>
                      {unit?.unitNumber}호
                    </Text>
                  );
                })}
              </View>

              {/* 비교 데이터 행들 */}
              {[
                { label: '층수', key: 'floor', format: (val: any) => `${val}층` },
                { label: '면적', key: 'area', format: (val: any) => `${val}㎡` },
                { label: '방/욕실', key: 'rooms', format: (unit: any) => `${unit.roomCount}룸/${unit.bathCount}욕실` },
                { label: '월세', key: 'monthlyRent', format: (val: any) => formatCurrency(val) },
                { label: '보증금', key: 'deposit', format: (val: any) => formatCurrency(val) },
                { label: '타입', key: 'unitType', format: (val: any) => getTypeText(val) },
              ].map((row) => (
                <View key={row.label} style={styles.compareRow}>
                  <Text style={styles.compareCell}>{row.label}</Text>
                  {compareList.map((unitId) => {
                    const unit = units.find(u => u.id === unitId);
                    if (!unit) return <Text key={unitId} style={styles.compareCell}>-</Text>;

                    const value = row.key === 'rooms'
                      ? row.format(unit)
                      : row.format(unit[row.key as keyof Unit]);

                    return (
                      <Text key={unitId} style={styles.compareCell}>{value}</Text>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.compareActions}>
              <TouchableOpacity
                style={styles.clearCompareButton}
                onPress={() => {
                  setCompareList([]);
                  setShowCompareModal(false);
                }}
              >
                <Text style={styles.clearCompareButtonText}>비교 목록 지우기</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 0,
    marginHorizontal: 0,
  },
  whiteBackground: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 0,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'white',
  },
  floatingBackButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    zIndex: 1001,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.light.primary,
    borderRadius: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  imageSection: {
    marginBottom: 0,
    marginHorizontal: 0,
    paddingHorizontal: 0,
    backgroundColor: 'white',
    position: 'relative',
  },
  imageGrid: {
    flexDirection: 'row',
    height: 400,
    marginHorizontal: 0,
  },
  imageIndicatorContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  imageIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  imageIndicatorDotActive: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mainImageContainer: {
    flex: 1,
    marginRight: 2,
    marginLeft: 0,
  },
  singleImage: {
    marginRight: 0,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  subImagesContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  subImageContainer: {
    flex: 1,
    marginBottom: 2,
    position: 'relative',
  },
  lastSubImage: {
    marginBottom: 0,
  },
  subImage: {
    width: '100%',
    height: '100%',
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  infoSection: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  typeChip: {
    backgroundColor: `${Colors.light.primary}15`,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  buildingName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  buildingAddress: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  priceRange: {
    fontSize: 18,
    color: Colors.light.primary,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  statsText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500',
    marginBottom: 16,
  },
  buildingDescription: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  titleIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compareActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  compareActionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  
  unitsSection: {
    backgroundColor: '#f8f9fa',
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  unitCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unitMainImageContainer: {
    position: 'relative',
  },
  unitMainImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  unitImageOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 6,
  },
  unitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  unitTitleSection: {
    flex: 1,
  },
  unitNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  unitBasicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitType: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  unitFloor: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  unitArea: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  separator: {
    width: 1,
    height: 10,
    backgroundColor: Colors.light.border,
    marginHorizontal: 8,
  },
  priceTag: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 14,
    textAlign: 'right',
  },
  priceLabel: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '400',
  },
  rentAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.primary,
    letterSpacing: -0.5,
  },
  rentLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  depositAmount: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '700',
  },
  descriptionSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  unitDescription: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  actionButtons: {
    padding: 16,
    alignItems: 'flex-end',
  },
  compareToggleButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 6,
  },
  compareToggleButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  compareToggleButtonText: {
    color: Colors.light.primary,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: -0.3,
  },
  compareToggleButtonTextActive: {
    color: 'white',
  },
  reservationButton: {
    width: '40%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reservationButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: -0.3,
  },
  noUnitsCard: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  noUnitsText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: 16,
    marginBottom: 6,
    fontWeight: '500',
  },
  noUnitsSubText: {
    fontSize: 14,
    color: Colors.light.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalImageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '95%',
    height: '85%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 8,
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  reservationModal: {
    flex: 1,
    backgroundColor: 'white',
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: 'white',
  },
  reservationTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  modalCloseIcon: {
    padding: 8,
  },
  selectedUnitInfo: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  selectedUnitText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  selectedUnitDetails: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  formContainer: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
    position: 'relative',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.light.text,
    backgroundColor: 'white',
  },
  messageInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 16,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 6,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.light.textSecondary,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
    letterSpacing: -0.3,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  datePickerText: {
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
    textAlign: 'left',
  },
  datePickerPlaceholder: {
    color: Colors.light.textSecondary,
  },
  datePickerContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  datePickerHeaderButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  datePickerSpinner: {
    backgroundColor: 'white',
    height: 200,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitImagesSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  unitImagesScroll: {
    paddingVertical: 8,
  },
  imagesScrollContent: {
    paddingRight: 16,
  },
  unitImageContainer: {
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  unitImage: {
    width: 120,
    height: 80,
  },
  unitImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 4,
  },
  compareModal: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  compareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: 'white',
  },
  compareTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  compareContent: {
    flex: 1,
    padding: 16,
  },
  compareTable: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  compareRowHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  compareRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  compareHeaderCell: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
  },
  compareCell: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: Colors.light.text,
    textAlign: 'center',
  },
  compareActions: {
    marginTop: 24,
    alignItems: 'center',
  },
  clearCompareButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.light.error,
    borderRadius: 6,
  },
  clearCompareButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  mapSection: {
    backgroundColor: 'white',
    marginTop: 24,
    paddingBottom: 40,
  },
  mapContainer: {
    height: 250,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  map: {
    flex: 1,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  addressText: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: '500',
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    padding: 24,
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  mapButtonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  mapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.light.primary,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  mapButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  exploreSection: {
    backgroundColor: 'white',
    marginTop: 24,
    paddingBottom: 24,
  },
  exploreList: {
    paddingHorizontal: 16,
  },
  exploreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  exploreIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  exploreContent: {
    flex: 1,
  },
  exploreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  exploreDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  spacer: {
    height: 32,
    backgroundColor: '#f8f9fa',
  },
  inquirySection: {
    backgroundColor: '#f8f9fa',
    marginTop: 0,
    paddingBottom: 16,
  },
  inquiryList: {
    paddingHorizontal: 16,
  },
  inquiryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  inquiryContent: {
    flex: 1,
  },
  inquiryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  inquiryDescription: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  noticeSection: {
    backgroundColor: '#f8f9fa',
    marginTop: 0,
    paddingBottom: 32,
  },
  noticeContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  noticeText: {
    fontSize: 11,
    color: '#999999',
    lineHeight: 16,
  },

  // 드롭다운 스타일
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  dropdownText: {
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: Colors.light.textSecondary,
  },
  dropdownList: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: Colors.light.border,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    marginTop: 0,
    position: 'absolute',
    left: 0,
    right: 0,
    top: '100%',
    zIndex: 9999,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 15,
    color: Colors.light.text,
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
});