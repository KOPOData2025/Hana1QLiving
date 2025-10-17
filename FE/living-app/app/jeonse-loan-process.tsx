import { HanaHeader } from '@/components/HanaHeader';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';

// 한국어 로케일 설정
LocaleConfig.locales['ko'] = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘'
};
LocaleConfig.defaultLocale = 'ko';

import { Colors } from '../constants/Colors';
import { loanAPI } from '../services/mobileApi';
import { useAuth } from '../contexts/AuthContext';

// 타입 정의
interface ProcessStep {
  readonly id: number;
  readonly title: string;
  readonly description: string;
}

interface Option {
  readonly id: string;
  readonly title: string;
}

type ScreenType = 'steps' | 'purpose' | 'moving' | 'contract' | 'houseType' | 'location' | 'deposit' | 'monthlyRent' | 'monthlyRentAmount' | 'dueDate' | 'incomeType' | 'employmentDate' | 'annualIncome' | 'maritalStatus' | 'houseOwnership' | 'summary' | 'loanRecommendations' | 'loanDetail' | 'public' | 'private' | 'apartment' | 'villa' | 'house' | 'other' | 'stay';

interface ScreenConfig {
  readonly title: string;
  readonly subtitle?: string;
  readonly description?: string;
}

interface InputData {
  contractType: string;
  houseType: string;
  location: string;
  deposit: string;
  dueDate: string;
  maritalStatus: string;
  houseOwnership: string;
  annualIncome: string;
  monthlyRent: string;
}

interface LoadingStates {
  houseInfo: boolean;
  incomeInfo: boolean;
  houseOwnership: boolean;
  loanLimit: boolean;
}

// 상수 데이터
const LOAN_PROCESS_STEPS: readonly ProcessStep[] = [
  { id: 1, title: '대출한도 확인', description: '임대차계약과 신청인 정보를 입력하여 예상 대출가능금액을 확인합니다.' },
  { id: 2, title: '대출신청', description: '주택 정보, 신청금액, 금리 등 대출 관련 정보를 입력하여 신청합니다.' },
  { id: 3, title: '대출심사', description: '금융인증서로 본인인증 후 필요한 서류를 스마트폰으로 촬영하여 제출합니다.' },
  { id: 4, title: '모바일 약정', description: '대출 조건을 확인하고 연락처, 이자납입계좌를 지정하여 약정서를 작성합니다.' },
  { id: 5, title: '실행', description: '잔금 지급일에 맞춰서 대출을 실행합니다.' }
] as const;

const OPTIONS_DATA = {
  loanPurposes: [
    { id: 'new', title: '대출 새로 받기' },
    { id: 'transfer', title: '대출 갈아타기' }
  ] as const,
  moving: [
    { id: 'moving', title: '이사 예정입니다.' },
    { id: 'staying', title: '현재 집에 계속 거주합니다.' }
  ] as const,
  contract: [
    { id: 'agency', title: '공인중개업소' },
    { id: 'public', title: '공공주택사업자' },
    { id: 'private', title: '개인(신청불가)' }
  ],
  houseType: [
    { id: 'officetel', title: '오피스텔' },
    { id: 'apartment', title: '아파트' },
    { id: 'villa', title: '빌라' },
    { id: 'house', title: '주택' }
  ] as const,
  location: [
    { id: 'seoul', title: '수도권(서울/경기/인천)' },
    { id: 'other', title: '수도권 외' }
  ],
  monthlyRent: [
    { id: 'yes', title: '네, 있어요' },
    { id: 'no', title: '아니요, 없어요' }
  ],
  incomeType: [
    { id: 'salary', title: '근로소득' },
    { id: 'business', title: '사업소득' },
    { id: 'other', title: '기타소득' },
    { id: 'none', title: '무소득' }
  ],
  maritalStatus: [
    { id: 'married7', title: '기혼(7년이내)' },
    { id: 'married', title: '기혼' },
    { id: 'single', title: '미혼' }
  ],
  houseOwnership: [
    { id: 'none', title: '보유주택 없음' },
    { id: 'one', title: '1주택 (신청불가)' },
    { id: 'multiple', title: '2주택 이상 (신청불가)' }
  ]
} as const;


// 유틸리티 함수
const formatNumber = (value: string): string => {
  const numericValue = value.replace(/[^0-9]/g, '');
  return numericValue === '' ? '' : parseInt(numericValue).toLocaleString();
};

const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

const formatLoanLimit = (limitString: string): string => {
  if (!limitString) return '한도 조회 중';

  const numericValue = limitString.replace(/[^0-9]/g, '');
  if (numericValue) {
    return `최대 ${parseInt(numericValue).toLocaleString()}만원`;
  }

  return limitString;
};

// 공통 컴포넌트
const SectionHeader = React.memo<{ title: string; subtitle?: string; description?: string }>(({ title, subtitle, description }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    {description && (
      <View style={styles.descriptionContainer}>
        <Text style={styles.sectionDescription}>보유 대출이 없으면 새로 받기,</Text>
        <Text style={styles.sectionDescription}>다른 은행 대출이 있으면 갈아타기를 선택하세요.</Text>
      </View>
    )}
  </View>
));

const ActionButton = React.memo<{ title: string; onPress: () => void }>(({ title, onPress }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <Text style={styles.actionButtonText}>{title}</Text>
  </TouchableOpacity>
));

const BottomButton = React.memo<{ title: string; onPress: () => void }>(({ title, onPress }) => (
  <View style={styles.bottomSection}>
    <TouchableOpacity style={styles.bottomButton} onPress={onPress}>
      <Text style={styles.bottomButtonText}>{title}</Text>
    </TouchableOpacity>
  </View>
));

// 특화된 컴포넌트들
const ProcessStepItem = React.memo<{ step: ProcessStep }>(({ step }) => (
  <View style={styles.stepItem}>
    <View style={styles.stepHeader}>
      <View style={[styles.stepNumber, { backgroundColor: Colors.light.primary }]}>
        <Text style={styles.stepNumberText}>{step.id}</Text>
      </View>
      <Text style={styles.stepTitle}>{step.title}</Text>
    </View>
    <Text style={styles.stepDescription}>{step.description}</Text>
  </View>
));

const IntroSection = React.memo(() => (
  <View style={styles.introSection}>
    <Text style={styles.introText}>대출 신청은{'\n'}아래와 같은 단계로 진행됩니다.</Text>
  </View>
));

const OptionsSection = React.memo<{
  title: string;
  subtitle?: string;
  description?: string;
  options: Option[];
  onSelect: (id: string) => void
}>(({ title, subtitle, description, options, onSelect }) => (
  <View style={styles.section}>
    <SectionHeader title={title} subtitle={subtitle} description={description} />
    {options.map((option) => (
      <ActionButton key={option.id} title={option.title} onPress={() => onSelect(option.id)} />
    ))}
  </View>
));

const InputSection = React.memo<{
  title: string;
  description?: string;
  placeholder: string;
  maxLength: number;
  onConfirm: (amount: string) => void
}>(({ title, description, placeholder, maxLength, onConfirm }) => {
  const [amount, setAmount] = useState('');

  const handleInputChange = useCallback((text: string) => {
    setAmount(formatNumber(text));
  }, []);

  const handleConfirm = useCallback(() => {
    if (amount) onConfirm(amount);
  }, [amount, onConfirm]);

  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      {description && <Text style={styles.inputDescription}>{description}</Text>}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.depositInput}
          placeholder={placeholder}
          value={amount}
          onChangeText={handleInputChange}
          keyboardType="numeric"
          maxLength={maxLength}
        />
        <Text style={styles.inputUnit}>만원</Text>
      </View>
      <TouchableOpacity
        style={[styles.confirmButton, !amount && styles.confirmButtonDisabled]}
        onPress={handleConfirm}
        disabled={!amount}
      >
        <Text style={styles.confirmButtonText}>확인</Text>
      </TouchableOpacity>
    </View>
  );
});

const DueDateSelectionSection = React.memo<{ onConfirm: (date: string) => void }>(({ onConfirm }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const handleDayPress = useCallback((day: any) => {
    if (day && day.dateString) {
      setSelectedDate(day.dateString);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedDate) onConfirm(selectedDate);
  }, [selectedDate, onConfirm]);

  const calendarTheme = useMemo(() => ({
    selectedDayBackgroundColor: Colors.light.primary,
    selectedDayTextColor: Colors.light.surface,
    todayTextColor: Colors.light.primary,
    dayTextColor: Colors.light.text,
    textDisabledColor: Colors.light.textTertiary,
    monthTextColor: Colors.light.text,
    indicatorColor: Colors.light.primary,
    textDayFontSize: 16,
    textMonthFontSize: 18,
    textDayFontWeight: '500' as const,
    textMonthFontWeight: '600' as const,
    calendarBackground: Colors.light.surface,
    arrowColor: Colors.light.primary,
    arrowStyle: { marginHorizontal: 15 },
    textSectionTitleColor: Colors.light.textSecondary,
    textMonthFontFamily: 'System',
    textDayFontFamily: 'System',
    textDayHeaderFontFamily: 'System'
  }), []);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>임대차계약서에 쓰여있는 잔금일을 알려주세요.</Text>
      </View>
      <Text style={styles.dueDateDescription}>대출 조회는 잔금일 3개월 전부터 조회 가능합니다.</Text>

      <View style={styles.calendarContainer}>
        {selectedDate && (
          <View style={styles.selectedDateDisplay}>
            <Text style={styles.selectedDateText}>{formatDate(selectedDate)}</Text>
          </View>
        )}

        <View style={styles.calendarWrapper}>
          <Calendar
            onDayPress={handleDayPress}
            markedDates={selectedDate ? {
              [selectedDate]: {
                selected: true,
                selectedColor: Colors.light.primary,
                selectedTextColor: Colors.light.surface
              }
            } : {}}
            theme={calendarTheme}
            style={styles.calendarStyle}
            minDate={new Date().toISOString().split('T')[0]}
            maxDate="2025-12-31"
            firstDay={1}
            hideExtraDays={true}
            hideDayNames={false}
            showWeekNumbers={false}
            disableMonthChange={false}
            enableSwipeMonths={true}
            monthFormat="yyyy년 M월"
            disableAllTouchEventsForDisabledDays={false}
            allowSelectionOutOfRange={false}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.confirmButton, !selectedDate && styles.confirmButtonDisabled]}
        onPress={handleConfirm}
        disabled={!selectedDate}
      >
        <Text style={styles.confirmButtonText}>확인</Text>
      </TouchableOpacity>
    </View>
  );
});

const EmploymentDateSection = React.memo<{ selectedDate: Date; onChangeDate: () => void }>(({ selectedDate, onChangeDate }) => {
  const formatDisplayDate = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}년 ${month.toString().padStart(2, '0')}월 ${day.toString().padStart(2, '0')}일`;
  }, []);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>현재 재직중인 직장의 입사날짜를{'\n'}입력해 주세요.</Text>
      </View>
      <View style={styles.nativeDatePickerSection}>
        <TouchableOpacity style={styles.selectedDateDisplay} onPress={onChangeDate} activeOpacity={0.7}>
          <Text style={styles.selectedDateText}>{formatDisplayDate(selectedDate)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const AnnualIncomeSection = React.memo<{ employmentDate: string; onConfirm: (income: string) => void }>(({ employmentDate, onConfirm }) => {
  const [amount, setAmount] = useState('');

  const handleInputChange = useCallback((text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setAmount(numericValue);
  }, []);

  const handleConfirm = useCallback(() => {
    if (amount && amount.trim() !== '') {
      onConfirm(amount);
    }
  }, [amount, onConfirm]);

  const displayAmount = amount ? parseInt(amount).toLocaleString() : '';

  return (
    <View style={styles.section}>
      <SectionHeader title="연소득이 얼마인지 알려주세요." />
      <Text style={styles.incomeLimitText}>
        재직기간이 3개월 미만인 근로소득자 혹은 기타소득자는 연소득 7천만원을 초과할 수 없습니다.
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.depositInput}
          placeholder="연소득을 입력하세요 (예: 3,500)"
          value={displayAmount}
          onChangeText={handleInputChange}
          keyboardType="numeric"
          maxLength={15}
        />
        <Text style={styles.inputUnit}>만원</Text>
      </View>
      <TouchableOpacity
        style={[styles.confirmButton, (!amount || amount.trim() === '') && styles.confirmButtonDisabled]}
        onPress={handleConfirm}
        disabled={!amount || amount.trim() === ''}
      >
        <Text style={styles.confirmButtonText}>확인</Text>
      </TouchableOpacity>
    </View>
  );
});

// API 호출 함수
const submitLoanInquiry = async (loanData: any) => {
  try {
    const result = await loanAPI.inquiry(loanData);
    return result;
  } catch (error) {
    throw error;
  }
};

// 메인 컴포넌트
export default function JeonseLoanProcessScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // 기본 상태
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('steps');
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2025, 7, 1));

  // 애니메이션
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [loanModalAnim] = useState(new Animated.Value(300));

  // 입력 데이터
  const [inputData, setInputData] = useState<InputData>({
    contractType: '', houseType: '', location: '', deposit: '',
    dueDate: '', maritalStatus: '', houseOwnership: '', annualIncome: '', monthlyRent: ''
  });

  // 모달 상태
  const [showLoanModal, setShowLoanModal] = useState(false);

  // 로딩 상태
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    houseInfo: false, incomeInfo: false, houseOwnership: false, loanLimit: false
  });

  const [completedStates, setCompletedStates] = useState<LoadingStates>({
    houseInfo: false, incomeInfo: false, houseOwnership: false, loanLimit: false
  });

  // 동적 스크린 설정 (사용자 이름을 포함)
  const SCREEN_CONFIG: Record<string, ScreenConfig> = useMemo(() => ({
    purpose: {
      title: '대출 목적을 선택하세요',
      description: '보유 대출이 없으면 새로 받기,\n다른 은행 대출이 있으면 갈아타기를 선택하세요.'
    },
    moving: {
      title: '새로운 집으로 이사 예정이신가요?',
      subtitle: '이사 여부에 따라 대출 한도가 달라집니다.'
    },
    contract: {
      title: '전월세보증금 대출을 받으려는 집의 계약 방식을 알려주세요.'
    },
    houseType: {
      title: '전월세보증금 대출을 받으려는 집 유형은 무엇인가요?'
    },
    location: {
      title: '집 위치를 알려주세요.'
    },
    deposit: {
      title: '보증금은 얼마인가요?'
    },
    monthlyRent: {
      title: '월세가 있나요?'
    },
    monthlyRentAmount: {
      title: '월세는 얼마인가요?'
    },
    dueDate: {
      title: '임대차계약서에 쓰여있는 잔금일을 알려주세요.'
    },
    incomeType: {
      title: '소득정보를 확인할게요.'
    },
    employmentDate: {
      title: '현재 재직중인 직장의 입사년월일을 입력해 주세요.'
    },
    annualIncome: {
      title: '연소득이 얼마인지 알려주세요.'
    },
    maritalStatus: {
      title: '결혼 여부를 알려주세요.'
    },
    houseOwnership: {
      title: '주택 보유 수를 알려주세요.'
    },
    summary: {
      title: '입력 정보 요약',
      subtitle: '지금까지 입력한 정보를 확인해주세요.'
    },
    loanRecommendations: {
      title: `${user?.name || '고객'}님의 예상 전월세대출 한도입니다`,
      subtitle: '입력하신 정보를 바탕으로 계산된 예상 한도입니다.'
    },
    loanDetail: {
      title: '대출 상세 정보',
      subtitle: '선택하신 대출 상품의 상세 정보입니다.'
    }
  }), [user?.name]);

  // API 응답 및 선택된 데이터
  const [loanApiResponse, setLoanApiResponse] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<'6m' | '2y'>('6m');
  const [selectedLoan, setSelectedLoan] = useState<any>(null);

  // 애니메이션 효과
  useEffect(() => {
    if (showPicker) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true })
      ]).start();
    } else {
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
    }
  }, [showPicker, slideAnim, fadeAnim]);

  // employmentDate 화면 진입 시 모달 열기
  useEffect(() => {
    if (currentScreen === 'employmentDate') {
      const timer = setTimeout(() => setShowPicker(true), 300);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  // 핸들러 함수들
  const handleDateChange = useCallback((event: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    setShowPicker(false);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 300, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true })
    ]).start();
    setCurrentScreen('annualIncome');
  }, [slideAnim, fadeAnim]);

  // 한도 조회 모달 열기
  const openLoanModal = useCallback(async () => {
    const loanInquiryData = {
      loanPurpose: 'new',
      isMoving: true,
      contractType: inputData.contractType,
      houseType: inputData.houseType,
      location: inputData.location,
      deposit: inputData.deposit ? parseInt(inputData.deposit.replace(/[^0-9]/g, '')) : 0,
      monthlyRent: inputData.monthlyRent ? parseInt(inputData.monthlyRent.replace(/[^0-9]/g, '')) : 0,
      dueDate: inputData.dueDate,
      incomeType: 'salary',
      employmentDate: selectedDate.toISOString().split('T')[0],
      annualIncome: inputData.annualIncome ? parseInt(inputData.annualIncome.replace(/[^0-9]/g, '')) : 0,
      maritalStatus: inputData.maritalStatus,
      houseOwnership: inputData.houseOwnership,
      inquiryType: 'limit_and_rate',
      timestamp: new Date().toISOString(),
      deviceInfo: 'mobile_app'
    };

    try {
      const apiResponse = await submitLoanInquiry(loanInquiryData);

      let parsedData = apiResponse;
      if (apiResponse && apiResponse.data && apiResponse.data.data) {
        parsedData = apiResponse.data.data;
      } else if (apiResponse && apiResponse.data && apiResponse.success === true) {
        parsedData = apiResponse.data;
      }

      setLoanApiResponse(parsedData);
      setShowLoanModal(true);
      setLoadingStates({ houseInfo: false, incomeInfo: false, houseOwnership: false, loanLimit: false });
      setCompletedStates({ houseInfo: false, incomeInfo: false, houseOwnership: false, loanLimit: false });

      Animated.timing(loanModalAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // 순차적 로딩 애니메이션
      const loadingSequence = [
        { key: 'houseInfo' as keyof LoadingStates, delay: 500, duration: 1000 },
        { key: 'incomeInfo' as keyof LoadingStates, delay: 1500, duration: 1000 },
        { key: 'houseOwnership' as keyof LoadingStates, delay: 2500, duration: 1000 },
        { key: 'loanLimit' as keyof LoadingStates, delay: 3500, duration: 1000 }
      ];

      loadingSequence.forEach(({ key, delay, duration }) => {
        setTimeout(() => setLoadingStates(prev => ({ ...prev, [key]: true })), delay);
        setTimeout(() => {
          setLoadingStates(prev => ({ ...prev, [key]: false }));
          setCompletedStates(prev => ({ ...prev, [key]: true }));
        }, delay + duration);
      });

      setTimeout(() => {
        Animated.timing(loanModalAnim, {
          toValue: 300,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowLoanModal(false);
          setCurrentScreen('loanRecommendations');
        });
      }, 5000);

    } catch (error) {
      Alert.alert('오류', '대출 조회 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }, [loanModalAnim, inputData, selectedDate]);

  // 네비게이션 핸들러들
  const navigationHandlers = useMemo(() => ({
    back: () => router.back(),
    goToScreen: (screen: ScreenType) => () => setCurrentScreen(screen),
    handleOptionSelect: (screen: ScreenType, field: keyof InputData, optionsData: any) => (id: string) => {
      const selectedOption = optionsData.find((opt: any) => opt.id === id);
      if (selectedOption) {
        setInputData(prev => ({ ...prev, [field]: selectedOption.title }));
      }
      setCurrentScreen(screen);
    },
    handleInputConfirm: (screen: ScreenType, field: keyof InputData, suffix: string = '') => (value: string) => {
      setInputData(prev => ({ ...prev, [field]: `${value}${suffix}` }));
      setCurrentScreen(screen);
    }
  }), [router]);

  // 공통 UI 컴포넌트
  const commonUI = useMemo(() => ({
    header: (onLeftPress: () => void) => (
      <HanaHeader title="전월세보증금 대출" leftIcon="arrow-left" onLeftPress={onLeftPress} />
    ),
    scrollView: (children: React.ReactNode) => (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    )
  }), []);

  // 화면별 렌더링 로직을 더 깔끔하게 정리
  const renderScreen = useCallback((screen: ScreenType) => {
    const config = SCREEN_CONFIG[screen];

    // 기본 화면 (steps)
    if (screen === 'steps') {
      return (
        <>
          {commonUI.header(navigationHandlers.back)}
          {commonUI.scrollView(
            <>
              <IntroSection />
              {LOAN_PROCESS_STEPS.map((step) => (
                <ProcessStepItem key={step.id} step={step} />
              ))}
            </>
          )}
          <BottomButton title="확인" onPress={navigationHandlers.goToScreen('purpose')} />
        </>
      );
    }

    // 옵션 선택 화면들
    if (config && ['purpose', 'moving', 'contract', 'houseType', 'location', 'monthlyRent', 'incomeType', 'maritalStatus', 'houseOwnership'].includes(screen)) {
      const getOptionsAndHandler = () => {
        switch (screen) {
          case 'purpose':
            return {
              options: OPTIONS_DATA.loanPurposes as unknown as Option[],
              onSelect: (id: string) => setCurrentScreen(id === 'new' ? 'moving' : 'contract'),
              backHandler: navigationHandlers.goToScreen('steps')
            };
          case 'moving':
            return {
              options: OPTIONS_DATA.moving as unknown as Option[],
              onSelect: (id: string) => setCurrentScreen(id === 'moving' ? 'contract' : 'stay'),
              backHandler: navigationHandlers.goToScreen('purpose')
            };
          case 'contract':
            return {
              options: OPTIONS_DATA.contract as unknown as Option[],
              onSelect: navigationHandlers.handleOptionSelect(
                'houseType', 'contractType', OPTIONS_DATA.contract
              ),
              backHandler: navigationHandlers.goToScreen('moving')
            };
          case 'houseType':
            return {
              options: OPTIONS_DATA.houseType as unknown as Option[],
              onSelect: navigationHandlers.handleOptionSelect(
                'location', 'houseType', OPTIONS_DATA.houseType
              ),
              backHandler: navigationHandlers.goToScreen('contract')
            };
          case 'location':
            return {
              options: OPTIONS_DATA.location as unknown as Option[],
              onSelect: navigationHandlers.handleOptionSelect(
                'deposit', 'location', OPTIONS_DATA.location
              ),
              backHandler: navigationHandlers.goToScreen('houseType')
            };
          case 'monthlyRent':
            return {
              options: OPTIONS_DATA.monthlyRent as unknown as Option[],
              onSelect: (id: string) => setCurrentScreen(id === 'yes' ? 'monthlyRentAmount' : 'dueDate'),
              backHandler: navigationHandlers.goToScreen('deposit')
            };
          case 'incomeType':
            return {
              options: OPTIONS_DATA.incomeType as unknown as Option[],
              onSelect: navigationHandlers.goToScreen('employmentDate'),
              backHandler: navigationHandlers.goToScreen('dueDate')
            };
          case 'maritalStatus':
            return {
              options: OPTIONS_DATA.maritalStatus as unknown as Option[],
              onSelect: navigationHandlers.handleOptionSelect(
                'houseOwnership', 'maritalStatus', OPTIONS_DATA.maritalStatus
              ),
              backHandler: navigationHandlers.goToScreen('annualIncome')
            };
          case 'houseOwnership':
            return {
              options: OPTIONS_DATA.houseOwnership as unknown as Option[],
              onSelect: navigationHandlers.handleOptionSelect(
                'summary', 'houseOwnership', OPTIONS_DATA.houseOwnership
              ),
              backHandler: navigationHandlers.goToScreen('maritalStatus')
            };
          default:
            return { options: [], onSelect: () => {}, backHandler: () => {} };
        }
      };

      const { options, onSelect, backHandler } = getOptionsAndHandler();

      return (
        <>
          {commonUI.header(backHandler)}
          {commonUI.scrollView(
            <OptionsSection
              title={config.title}
              subtitle={config.subtitle}
              description={config.description}
              options={options}
              onSelect={onSelect}
            />
          )}
        </>
      );
    }

    // 입력 화면들
    if (screen === 'deposit') {
      return (
        <>
          {commonUI.header(navigationHandlers.goToScreen('location'))}
          {commonUI.scrollView(
            <InputSection
              title="보증금은 얼마인가요?"
              placeholder="보증금을 입력하세요 (예: 5,000)"
              maxLength={15}
              onConfirm={navigationHandlers.handleInputConfirm('monthlyRent', 'deposit', '만원')}
            />
          )}
        </>
      );
    }

    if (screen === 'monthlyRentAmount') {
      return (
        <>
          {commonUI.header(navigationHandlers.goToScreen('monthlyRent'))}
          {commonUI.scrollView(
            <InputSection
              title="월세는 얼마인가요?"
              description="월세는 만원 단위로 올림하여 입력해주세요."
              placeholder="월세를 입력하세요 (예: 50)"
              maxLength={10}
              onConfirm={navigationHandlers.handleInputConfirm('dueDate', 'monthlyRent', '만원')}
            />
          )}
        </>
      );
    }

    if (screen === 'dueDate') {
      return (
        <>
          {commonUI.header(navigationHandlers.goToScreen('monthlyRentAmount'))}
          {commonUI.scrollView(
            <DueDateSelectionSection
              onConfirm={(date) => {
                setInputData(prev => ({ ...prev, dueDate: date }));
                setCurrentScreen('incomeType');
              }}
            />
          )}
        </>
      );
    }

    if (screen === 'employmentDate') {
      return (
        <>
          {commonUI.header(navigationHandlers.goToScreen('incomeType'))}
          {commonUI.scrollView(
            <EmploymentDateSection
              selectedDate={selectedDate}
              onChangeDate={() => setShowPicker(true)}
            />
          )}
          <BottomButton title="확인" onPress={navigationHandlers.goToScreen('annualIncome')} />
        </>
      );
    }

    if (screen === 'annualIncome') {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      const employmentDateString = `${year}년 ${month.toString().padStart(2, '0')}월`;

      return (
        <>
          {commonUI.header(navigationHandlers.goToScreen('employmentDate'))}
          {commonUI.scrollView(
            <AnnualIncomeSection
              employmentDate={employmentDateString}
              onConfirm={navigationHandlers.handleInputConfirm('maritalStatus', 'annualIncome', '만원')}
            />
          )}
        </>
      );
    }

    // 요약 화면
    if (screen === 'summary') {
      return (
        <>
          {commonUI.header(navigationHandlers.goToScreen('houseOwnership'))}
          {commonUI.scrollView(
            <View style={styles.section}>
              <SectionHeader title={config!.title} subtitle={config!.subtitle} />

              <View style={styles.summaryContainer}>
                {[
                  { label: '계약 방식', value: inputData.contractType },
                  { label: '집 유형', value: inputData.houseType },
                  { label: '집 위치', value: inputData.location },
                  { label: '보증금', value: inputData.deposit },
                  {
                    label: '잔금일',
                    value: inputData.dueDate ?
                      new Date(inputData.dueDate).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) :
                      '선택되지 않음'
                  },
                  { label: '결혼여부', value: inputData.maritalStatus },
                  { label: '주택보유수', value: inputData.houseOwnership }
                ].map(({ label, value }) => (
                  <View key={label} style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>{label}</Text>
                    <Text style={styles.summaryValue}>{value || '선택되지 않음'}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.summaryButtons}>
                <TouchableOpacity style={styles.summaryButton} onPress={openLoanModal}>
                  <Text style={styles.summaryButtonText}>한도와 금리 조회하기</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.summaryButton, styles.summaryButtonSecondary]}
                  onPress={() => {
                    setCurrentScreen('steps');
                    setInputData({
                      contractType: '', houseType: '', location: '', deposit: '',
                      dueDate: '', maritalStatus: '', houseOwnership: '', annualIncome: '', monthlyRent: ''
                    });
                  }}
                >
                  <Text style={styles.summaryButtonTextSecondary}>처음부터 조회하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      );
    }

    // 대출 추천 화면
    if (screen === 'loanRecommendations') {
      return (
        <>
          {commonUI.header(navigationHandlers.goToScreen('summary'))}
          {commonUI.scrollView(
            <View style={styles.section}>
              <SectionHeader title={config!.title} subtitle={config!.subtitle} />

              <View style={styles.tabContainer}>
                {(['6m', '2y'] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tabButton, selectedTab === tab && styles.tabButtonActive]}
                    onPress={() => setSelectedTab(tab)}
                  >
                    <Text style={[styles.tabButtonText, selectedTab === tab && styles.tabButtonTextActive]}>
                      {tab === '6m' ? '6개월 변동금리' : '2년 변동금리'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.loanListContainer}>
                {loanApiResponse?.customerEligibility?.eligible === false ? (
                  <View style={styles.ineligibleContainer}>
                    <Text style={styles.ineligibleTitle}>대출 신청이 어려운 상황입니다</Text>
                    <Text style={styles.ineligibleSubtitle}>다음 조건을 확인해주세요:</Text>
                    <View style={styles.ineligibleReasons}>
                      <Text style={styles.ineligibleReason}>• 주택보유수: 무주택자만 신청 가능</Text>
                      <Text style={styles.ineligibleReason}>• 계약방식: 개인 직거래는 신청불가</Text>
                      <Text style={styles.ineligibleReason}>• 연소득: 최소 1,000만원 이상</Text>
                    </View>
                    <View style={styles.eligibilityInfo}>
                      <Text style={styles.eligibilityInfoTitle}>현재 고객님 정보</Text>
                      <Text style={styles.eligibilityInfoText}>신용등급: {loanApiResponse?.customerEligibility?.creditGrade}</Text>
                      <Text style={styles.eligibilityInfoText}>DTI 비율: {loanApiResponse?.customerEligibility?.dtiRatio}</Text>
                      <Text style={styles.eligibilityInfoText}>DSR 비율: {loanApiResponse?.customerEligibility?.dsrRatio}</Text>
                      <Text style={styles.eligibilityInfoText}>위험도: {loanApiResponse?.customerEligibility?.riskLevel}</Text>
                    </View>
                  </View>
                ) : (
                  loanApiResponse?.recommendations?.map((product: any, index: number) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.loanItem}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedLoan({
                          name: product.productName || '추천 대출상품',
                          limit: formatLoanLimit(product.maxLimit) || '한도 조회 중',
                          rate6m: product.rate6m || '금리 조회 중',
                          rate2y: product.rate2y || '금리 조회 중',
                          baseRate: loanApiResponse?.baseRate || '2.510%',
                          spread: loanApiResponse?.spread || '1.0%',
                          totalRate: loanApiResponse?.totalRate || '3.5%',
                          cycle: loanApiResponse?.cycle || '6개월'
                        });
                        setCurrentScreen('loanDetail');
                      }}
                    >
                      <Text style={styles.loanName}>{product.productName || '추천 대출상품'}</Text>
                      <View style={styles.loanDetails}>
                        <View style={styles.loanDetailItem}>
                          <Text style={styles.loanDetailLabel}>예상한도</Text>
                          <Text style={styles.loanDetailValue}>{formatLoanLimit(product.maxLimit) || '한도 조회 중'}</Text>
                        </View>
                        <View style={styles.loanDetailItem}>
                          <Text style={styles.loanDetailLabel}>
                            {selectedTab === '6m' ? '6개월 변동금리' : '2년 변동금리'}
                          </Text>
                          <Text style={styles.loanDetailValue}>
                            {selectedTab === '6m' ? product.rate6m || '금리 조회 중' : product.rate2y || '금리 조회 중'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )) || null
                )}
              </View>
            </View>
          )}
        </>
      );
    }

    // 대출 상세 화면
    if (screen === 'loanDetail') {
      return (
        <>
          {commonUI.header(navigationHandlers.goToScreen('loanRecommendations'))}
          {commonUI.scrollView(
            <View style={styles.section}>
              <SectionHeader title={selectedLoan?.name || config!.title} subtitle={config!.subtitle} />

              <View style={styles.loanDetailContainer}>
                <View style={styles.loanDetailCard}>
                  <View style={styles.loanDetailCardHeader}>
                    <Text style={styles.loanDetailCardTitle}>예상한도</Text>
                    <Text style={styles.loanDetailCardValue}>{selectedLoan?.limit}</Text>
                  </View>
                </View>

                <View style={styles.loanDetailCard}>
                  <View style={styles.loanDetailCardHeader}>
                    <Text style={styles.loanDetailCardTitle}>예상금리</Text>
                    <Text style={styles.loanDetailCardValue}>
                      {selectedTab === '6m' ? selectedLoan?.rate6m : selectedLoan?.rate2y}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>대출 정보 안내</Text>
                <Text style={styles.infoText}>
                  • 대출금리 {selectedLoan?.totalRate} = 기준금리(신규COFIX6개월) {selectedLoan?.baseRate} + 가산금리 {selectedLoan?.spread}{'\n'}
                  • 금리 변동주기는 {selectedLoan?.cycle}입니다{'\n'}
                  • 한도와 금리는 조회시점 및 제출서류에 따라 달라질 수 있습니다{'\n'}
                  • 하나금융그룹의 특별한 금리 혜택
                </Text>
              </View>

              <View style={styles.loanApplySection}>
                <TouchableOpacity
                  style={styles.loanApplyButton}
                  activeOpacity={0.8}
                  onPress={() => router.push({
                    pathname: '/loan-application',
                    params: { selectedLoanProduct: selectedLoan?.name || '전월세보증금 대출' }
                  })}
                >
                  <Text style={styles.loanApplyButtonText}>대출 신청하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      );
    }

    // 기본 반환값 (빈 화면)
    return null;
  }, [currentScreen, inputData, selectedDate, selectedTab, selectedLoan, loanApiResponse, commonUI, navigationHandlers, openLoanModal, router]);

  return (
    <View style={styles.container}>
      {renderScreen(currentScreen)}

      {/* 날짜 선택 모달 */}
      {showPicker && (
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>입사년월일 선택</Text>
              <Text style={styles.modalSubtitle}>년도, 월, 일을 선택해주세요</Text>
            </View>

            <View style={styles.datePickerWrapper}>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={new Date(2006, 0, 1)}
                maximumDate={new Date(2025, 11, 31)}
                locale="ko-KR"
                style={styles.nativeDatePicker}
                textColor={Colors.light.text}
                accentColor={Colors.light.primary}
                themeVariant="light"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleConfirm}>
                <Text style={styles.modalConfirmText}>확인</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* 한도 조회 모달 */}
      {showLoanModal && (
        <Animated.View style={styles.modalOverlay}>
          <Animated.View style={[styles.loanModalContainer, { transform: [{ translateY: loanModalAnim }] }]}>
            <View style={styles.loanModalHeader}>
              <Text style={styles.loanModalTitle}>한도와 금리 조회 중...</Text>
            </View>

            <View style={styles.loanModalContent}>
              {[
                { key: 'houseInfo' as keyof LoadingStates, label: '주택정보' },
                { key: 'incomeInfo' as keyof LoadingStates, label: '소득정보' },
                { key: 'houseOwnership' as keyof LoadingStates, label: '주택보유수' },
                { key: 'loanLimit' as keyof LoadingStates, label: '한도와 금리' }
              ].map(({ key, label }) => (
                <View key={key} style={styles.loadingItem}>
                  <Text style={styles.loadingText}>{label}</Text>
                  {loadingStates[key] && <ActivityIndicator size="small" color={Colors.light.primary} style={styles.loadingSpinner} />}
                  {completedStates[key] && <Text style={styles.checkMark}>✓</Text>}
                </View>
              ))}
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

// 스타일 (기존과 동일하게 유지)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scrollView: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { padding: 24, paddingBottom: 120 },
  section: { padding: 28 },
  sectionHeader: { marginBottom: 24, alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text, marginBottom: 12, textAlign: 'center', paddingHorizontal: 12 },
  sectionSubtitle: { fontSize: 15, color: Colors.light.textSecondary, textAlign: 'center', lineHeight: 22 },
  sectionDescription: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center', marginTop: 0, lineHeight: 20 },
  descriptionContainer: { marginTop: 8 },
  actionButton: { backgroundColor: Colors.light.primary, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 8, marginBottom: 16, alignItems: 'center', borderWidth: 0 },
  actionButtonText: { fontSize: 16, color: Colors.light.surface, fontWeight: '600', letterSpacing: 0.5 },
  bottomSection: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 28, backgroundColor: Colors.light.background, borderTopWidth: 1, borderTopColor: Colors.light.border },
  bottomButton: { backgroundColor: Colors.light.primary, paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  bottomButtonText: { fontSize: 16, color: Colors.light.surface, fontWeight: '600' },
  introSection: { marginBottom: 40, paddingBottom: 36, paddingTop: 32 },
  introText: { fontSize: 18, color: Colors.light.text, lineHeight: 24, textAlign: 'center' },
  stepItem: { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepNumber: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepNumberText: { color: Colors.light.surface, fontSize: 12, fontWeight: 'bold' },
  stepTitle: { fontSize: 17, fontWeight: '600', color: Colors.light.text, flex: 1 },
  stepDescription: { fontSize: 14, color: Colors.light.textSecondary, lineHeight: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, paddingHorizontal: 20, marginBottom: 16 },
  depositInput: { flex: 1, fontSize: 16, color: Colors.light.text, paddingVertical: 12 },
  inputUnit: { fontSize: 16, color: Colors.light.textSecondary, marginLeft: 8 },
  confirmButton: { backgroundColor: Colors.light.primary, paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmButtonText: { fontSize: 16, color: Colors.light.surface, fontWeight: '600' },
  inputDescription: { fontSize: 15, color: Colors.light.textSecondary, textAlign: 'center', marginBottom: 16, lineHeight: 22 },
  dueDateDescription: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  calendarContainer: { alignItems: 'center', marginBottom: 16 },
  selectedDateContainer: { alignItems: 'center', marginBottom: 16, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.light.primary, borderRadius: 0, borderWidth: 0, width: '100%' },
  selectedDateLabel: { fontSize: 15, color: Colors.light.surface, fontWeight: '500', marginBottom: 4 },
  selectedDateValue: { fontSize: 18, color: Colors.light.surface, fontWeight: '700' },
  calendarWrapper: { width: '100%', height: 350, borderRadius: 0, backgroundColor: Colors.light.surface, borderWidth: 1, borderColor: Colors.light.border },
  calendarStyle: { borderWidth: 0, backgroundColor: 'transparent', height: 330, width: '100%' },
  nativeDatePickerSection: { alignItems: 'center', marginBottom: 24 },
  selectedDateDisplay: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 20, textAlign: 'center', paddingVertical: 12, paddingHorizontal: 20, backgroundColor: Colors.light.surface, borderRadius: 0, borderWidth: 1, borderColor: Colors.light.primary, width: '100%' },
  selectedDateText: { fontSize: 18, fontWeight: '600', color: Colors.light.text, textAlign: 'center' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end', zIndex: 1000 },
  modalContainer: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30, height: '50%', marginHorizontal: 0, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10 },
  modalHeader: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 4 },
  modalSubtitle: { fontSize: 15, fontWeight: '500', color: Colors.light.textSecondary },
  datePickerWrapper: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  nativeDatePicker: { width: 300, height: 220, backgroundColor: '#ffffff' },
  modalButtons: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 0 },
  modalConfirmButton: { width: '100%', backgroundColor: Colors.light.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalConfirmText: { fontSize: 16, color: Colors.light.surface, fontWeight: '600' },
  incomeLimitText: { fontSize: 15, color: Colors.light.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 16, lineHeight: 22, paddingHorizontal: 16 },
  summaryContainer: { marginTop: 20, marginBottom: 30 },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  summaryLabel: { fontSize: 16, color: Colors.light.textSecondary, fontWeight: '500' },
  summaryValue: { fontSize: 16, color: Colors.light.text, fontWeight: '600' },
  summaryButtons: { marginTop: 30, gap: 16 },
  summaryButton: { backgroundColor: Colors.light.primary, paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  summaryButtonSecondary: { backgroundColor: Colors.light.surface, borderWidth: 1, borderColor: Colors.light.border },
  summaryButtonText: { fontSize: 16, color: Colors.light.surface, fontWeight: '600' },
  summaryButtonTextSecondary: { fontSize: 16, color: Colors.light.text, fontWeight: '600' },
  loanListContainer: { marginTop: 20 },
  loanItem: { backgroundColor: Colors.light.surface, borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.border },
  loanName: { fontSize: 18, fontWeight: '600', color: Colors.light.text, marginBottom: 16 },
  loanDetails: { gap: 12 },
  loanDetailItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loanDetailLabel: { fontSize: 15, color: Colors.light.textSecondary, fontWeight: '500' },
  loanDetailValue: { fontSize: 16, color: Colors.light.primary, fontWeight: '600' },
  loanModalContainer: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30, height: '60%', marginHorizontal: 0, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10 },
  loanModalHeader: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  loanModalTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 4 },
  loanModalContent: { padding: 24, gap: 20 },
  loadingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  loadingText: { fontSize: 16, color: Colors.light.text, fontWeight: '500' },
  loadingSpinner: { marginLeft: 12, width: 20, height: 20 },
  checkMark: { fontSize: 20, color: Colors.light.primary, fontWeight: 'bold', marginLeft: 12, width: 20, height: 20, textAlign: 'center', lineHeight: 20 },
  tabContainer: { flexDirection: 'row', marginBottom: 24, backgroundColor: Colors.light.surface, borderRadius: 8, padding: 4, borderWidth: 1, borderColor: Colors.light.border },
  tabButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 6, alignItems: 'center' },
  tabButtonActive: { backgroundColor: Colors.light.primary },
  tabButtonText: { fontSize: 15, fontWeight: '500', color: Colors.light.textSecondary },
  tabButtonTextActive: { color: Colors.light.surface, fontWeight: '600' },
  loanDetailContainer: { marginTop: 20, gap: 16 },
  loanDetailCard: { backgroundColor: Colors.light.surface, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: Colors.light.border },
  loanDetailCardHeader: { alignItems: 'center' },
  loanDetailCardTitle: { fontSize: 16, color: Colors.light.textSecondary, fontWeight: '500', marginBottom: 8 },
  loanDetailCardValue: { fontSize: 24, color: Colors.light.primary, fontWeight: '700' },
  infoSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#f8f9fa',
    marginTop: 16,
    marginHorizontal: -20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  loanApplySection: { marginTop: 40, paddingHorizontal: 20 },
  loanApplyButton: { backgroundColor: Colors.light.primary, paddingVertical: 18, borderRadius: 12, alignItems: 'center', shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  loanApplyButtonText: { fontSize: 18, color: Colors.light.surface, fontWeight: '700', letterSpacing: 0.5 },
  ineligibleContainer: { backgroundColor: '#fff5f5', borderRadius: 12, padding: 24, marginTop: 20, borderWidth: 1, borderColor: '#fecaca' },
  ineligibleTitle: { fontSize: 18, fontWeight: '700', color: '#dc2626', marginBottom: 8, textAlign: 'center' },
  ineligibleSubtitle: { fontSize: 15, color: '#7f1d1d', marginBottom: 16, textAlign: 'center' },
  ineligibleReasons: { marginBottom: 20 },
  ineligibleReason: { fontSize: 14, color: '#991b1b', marginBottom: 6, lineHeight: 20 },
  eligibilityInfo: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  eligibilityInfoTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  eligibilityInfoText: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: 4, lineHeight: 18 }
});