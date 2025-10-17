import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { investmentApi, SimulationRequest } from '@/services/investmentApi';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function SimulationInputScreen() {
  const [startDate, setStartDate] = useState(new Date('2024-01-02'));
  const [endDate, setEndDate] = useState(new Date('2025-01-02'));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const [initialInvestment, setInitialInvestment] = useState('10000000');
  const [recurringAmount, setRecurringAmount] = useState('100000');
  const [recurringEnabled, setRecurringEnabled] = useState(true);
  const [recurringFrequency, setRecurringFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY');
  const [dividendReinvestment, setDividendReinvestment] = useState<'ALL' | 'NONE'>('ALL');
  const [loading, setLoading] = useState(false);

  const [slideAnim] = useState(new Animated.Value(300));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (showStartPicker || showEndPicker) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showStartPicker, showEndPicker]);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatCurrency = (value: string): string => {
    const number = value.replace(/[^0-9]/g, '');
    return new Intl.NumberFormat('ko-KR').format(Number(number));
  };

  const handleStartDatePress = () => {
    setTempDate(startDate);
    setShowStartPicker(true);
  };

  const handleEndDatePress = () => {
    setTempDate(endDate);
    setShowEndPicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleStartDateConfirm = () => {
    setStartDate(tempDate);
    setShowStartPicker(false);
  };

  const handleEndDateConfirm = () => {
    setEndDate(tempDate);
    setShowEndPicker(false);
  };

  const handleInitialInvestmentChange = (text: string) => {
    const number = text.replace(/[^0-9]/g, '');
    setInitialInvestment(number);
  };

  const handleRecurringAmountChange = (text: string) => {
    const number = text.replace(/[^0-9]/g, '');
    setRecurringAmount(number);
  };

  const validateInputs = (): boolean => {
    if (!initialInvestment || Number(initialInvestment) < 1000000) {
      Alert.alert('입력 오류', '초기 투자금은 최소 100만원 이상이어야 합니다.');
      return false;
    }

    if (Number(initialInvestment) > 100000000) {
      Alert.alert('입력 오류', '초기 투자금은 최대 1억원까지 입력 가능합니다.');
      return false;
    }

    if (recurringEnabled && (!recurringAmount || Number(recurringAmount) < 10000)) {
      Alert.alert('입력 오류', '정기 투자금은 최소 1만원 이상이어야 합니다.');
      return false;
    }

    if (startDate >= endDate) {
      Alert.alert('입력 오류', '종료일은 시작일보다 이후여야 합니다.');
      return false;
    }

    const yearsDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (yearsDiff < 1) {
      Alert.alert('입력 오류', '투자 기간은 최소 1년 이상이어야 합니다.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const request: SimulationRequest = {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        initialInvestment: Number(initialInvestment),
        recurringInvestment: {
          amount: recurringEnabled ? Number(recurringAmount) : 0,
          frequency: recurringEnabled ? recurringFrequency : 'NONE',
        },
        dividendReinvestment,
      };

      const result = await investmentApi.runSimulation(request);

      if (result.success && result.data) {
        router.push({
          pathname: '/investment/simulation-result',
          params: { resultData: JSON.stringify(result.data) },
        });
      } else {
        Alert.alert('오류', result.message || '시뮬레이션 실행 중 오류가 발생했습니다.');
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '시뮬레이션 실행 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>리츠 투자 시뮬레이션</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.subtitle}>과거 투자 결과를 기반으로 시뮬레이션 해보세요</Text>

        {/* 날짜 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>투자 시뮬레이션 기간을 선택하세요</Text>

          <View style={styles.dateRow}>
            <View style={styles.dateInputWrapper}>
              <Text style={styles.dateLabel}>시작일</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={handleStartDatePress}
              >
                <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
                <MaterialIcons name="calendar-today" size={20} color={Colors.light.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.dateSeparator}>~</Text>

            <View style={styles.dateInputWrapper}>
              <Text style={styles.dateLabel}>종료일</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={handleEndDatePress}
              >
                <Text style={styles.dateButtonText}>{formatDate(endDate)}</Text>
                <MaterialIcons name="calendar-today" size={20} color={Colors.light.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 초기 투자금 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>초기 투자 금액을 입력하세요</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={formatCurrency(initialInvestment)}
              onChangeText={handleInitialInvestmentChange}
              keyboardType="numeric"
              placeholder="10,000,000"
              placeholderTextColor={Colors.light.textSecondary}
            />
            <Text style={styles.inputUnit}>원</Text>
          </View>
          <Text style={styles.inputHint}>최소 100만원 ~ 최대 1억원</Text>
        </View>

        {/* 정기 투자 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleInHeader}>정기 투자를 추가하시겠어요?</Text>
            <TouchableOpacity
              style={[styles.toggle, recurringEnabled && styles.toggleActive]}
              onPress={() => setRecurringEnabled(!recurringEnabled)}
            >
              <Text style={[styles.toggleText, recurringEnabled && styles.toggleTextActive]}>
                {recurringEnabled ? '예' : '아니오'}
              </Text>
            </TouchableOpacity>
          </View>

          {recurringEnabled && (
            <>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={formatCurrency(recurringAmount)}
                  onChangeText={handleRecurringAmountChange}
                  keyboardType="numeric"
                  placeholder="100,000"
                  placeholderTextColor={Colors.light.textSecondary}
                />
                <Text style={styles.inputUnit}>원</Text>
              </View>

              <View style={styles.frequencyContainer}>
                {(['MONTHLY', 'WEEKLY', 'DAILY'] as const).map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyButton,
                      recurringFrequency === freq && styles.frequencyButtonActive,
                    ]}
                    onPress={() => setRecurringFrequency(freq)}
                  >
                    <Text
                      style={[
                        styles.frequencyButtonText,
                        recurringFrequency === freq && styles.frequencyButtonTextActive,
                      ]}
                    >
                      {freq === 'MONTHLY' ? '매월' : freq === 'WEEKLY' ? '매주' : '매일'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* 배당 재투자 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>배당금 재투자 설정</Text>

          <TouchableOpacity
            style={[
              styles.radioOption,
              dividendReinvestment === 'ALL' && styles.radioOptionActive,
            ]}
            onPress={() => setDividendReinvestment('ALL')}
          >
            <View style={styles.radioCircle}>
              {dividendReinvestment === 'ALL' && <View style={styles.radioCircleInner} />}
            </View>
            <View style={styles.radioTextContainer}>
              <Text style={styles.radioLabel}>배당금 전액 재투자</Text>
              <Text style={styles.radioDescription}>복리 효과로 수익률 극대화</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.radioOption,
              dividendReinvestment === 'NONE' && styles.radioOptionActive,
            ]}
            onPress={() => setDividendReinvestment('NONE')}
          >
            <View style={styles.radioCircle}>
              {dividendReinvestment === 'NONE' && <View style={styles.radioCircleInner} />}
            </View>
            <View style={styles.radioTextContainer}>
              <Text style={styles.radioLabel}>배당금 현금 수령</Text>
              <Text style={styles.radioDescription}>정기적인 현금 흐름 확보</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 실행 버튼 */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors.light.background} />
              <Text style={styles.submitButtonText}>계산 중...</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>결과 확인하기</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* 시작일 선택 모달 */}
      {showStartPicker && (
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>투자 시작일 선택</Text>
              <Text style={styles.modalSubtitle}>년도, 월, 일을 선택해주세요</Text>
            </View>
            <View style={styles.datePickerWrapper}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                locale="ko-KR"
                textColor={Colors.light.text}
                accentColor={Colors.light.primary}
                maximumDate={new Date()}
                style={styles.nativeDatePicker}
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleStartDateConfirm}>
                <Text style={styles.modalConfirmText}>확인</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* 종료일 선택 모달 */}
      {showEndPicker && (
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>투자 종료일 선택</Text>
              <Text style={styles.modalSubtitle}>년도, 월, 일을 선택해주세요</Text>
            </View>
            <View style={styles.datePickerWrapper}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                locale="ko-KR"
                textColor={Colors.light.text}
                accentColor={Colors.light.primary}
                maximumDate={new Date()}
                style={styles.nativeDatePicker}
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleEndDateConfirm}>
                <Text style={styles.modalConfirmText}>확인</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  sectionTitleInHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 0,
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  dateInputWrapper: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  dateButtonText: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '600',
  },
  dateSeparator: {
    fontSize: 18,
    color: Colors.light.textSecondary,
    marginBottom: 10,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    paddingVertical: 16,
  },
  inputUnit: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginLeft: 8,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 8,
    marginLeft: 4,
  },
  toggle: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  toggleTextActive: {
    color: Colors.light.background,
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  frequencyButton: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  frequencyButtonTextActive: {
    color: Colors.light.background,
    fontWeight: '600',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    marginBottom: 12,
  },
  radioOptionActive: {
    borderColor: Colors.light.primary,
    backgroundColor: `${Colors.light.primary}08`,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.primary,
  },
  radioTextContainer: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  radioDescription: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  submitButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.background,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomSpacing: {
    height: 40,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  datePickerWrapper: {
    padding: 16,
  },
  modalButtons: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  modalConfirmButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.background,
  },
  nativeDatePicker: {
    width: '100%',
    height: 200,
  },
});
