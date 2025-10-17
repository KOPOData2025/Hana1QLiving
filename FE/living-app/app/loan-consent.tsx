import { HanaHeader } from '@/components/HanaHeader';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IconButton } from 'react-native-paper';

interface AgreementItem {
  id: string;
  text: string;
}

interface AgreementSectionProps {
  title: string;
  agreements: boolean[];
  onAgreementChange: (index: number) => void;
  onAllAgreementChange: () => void;
  items: AgreementItem[];
  isRequired?: boolean;
}

const AgreementSection = memo<AgreementSectionProps>(({
  title, agreements, onAgreementChange, onAllAgreementChange, items, isRequired = false
}) => {
  const allAgreed = useMemo(() => agreements.every(agreed => agreed), [agreements]);
  const handleItemPress = useCallback((index: number) => () => onAgreementChange(index), [onAgreementChange]);
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity style={styles.agreementSection} onPress={onAllAgreementChange}>
        <View style={styles.agreementHeader}>
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, allAgreed && styles.checkboxChecked]}>
              {allAgreed && <Text style={styles.checkText}>✓</Text>}
            </View>
            <Text style={styles.agreementTitle}>{title}</Text>
          </View>
          <IconButton icon="chevron-right" size={20} iconColor={Colors.light.textSecondary} />
        </View>
      </TouchableOpacity>
      {items.map((item, index) => (
        <TouchableOpacity key={item.id} style={styles.agreementItem} onPress={handleItemPress(index)}>
          <View style={styles.agreementItemContent}>
            <View style={[styles.checkIcon, !agreements[index] && styles.checkIconUnchecked]}>
              {agreements[index] && <Text style={styles.checkText}>✓</Text>}
            </View>
            <Text style={styles.agreementItemText}>{item.text}</Text>
          </View>
          <IconButton icon="chevron-right" size={16} iconColor={Colors.light.textSecondary} />
        </TouchableOpacity>
      ))}
    </View>
  );
});

const ProductDescription = memo(() => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>상품설명서</Text>
    <TouchableOpacity style={styles.agreementSection}>
      <View style={styles.agreementHeader}>
        <Text style={styles.agreementTitle}>전월세보증금 대출 상품설명서</Text>
        <IconButton icon="chevron-right" size={20} iconColor={Colors.light.textSecondary} />
      </View>
    </TouchableOpacity>
  </View>
));

const ConfirmationMessage = memo(() => (
  <View style={styles.infoSection}>
    <Text style={styles.infoTitle}>동의서 확인</Text>
    <Text style={styles.infoText}>
      • 본인은 대출상품에 대한 주요내용과 비용에 대한 설명을 충분히 확인했습니다{'\n'}
      • 하나금융그룹의 특별한 금리 혜택{'\n'}
      • 온라인으로 간편하게 신청 가능{'\n'}
      • 빠른 승인과 자동이체 서비스
    </Text>
  </View>
));

const AgreementButton = memo<{ onPress: () => void; disabled: boolean }>(({ onPress, disabled }) => (
  <View style={styles.bottomSection}>
    <TouchableOpacity style={[styles.agreeButton, disabled && styles.agreeButtonDisabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.agreeButtonText}>네, 동의합니다</Text>
    </TouchableOpacity>
  </View>
));

const AGREEMENT_DATA = {
  required: [
    { id: 'personal-info-inquiry', text: '개인(신용)정보 조회 동의' },
    { id: 'personal-info-collection-jeonse', text: '개인(신용)정보 수집·이용·제공 동의(전월세보증금대출)' },
    { id: 'personal-info-collection-public', text: '개인(신용)정보 수집·이용·제공 동의(대출 공공마이데이터)' },
    { id: 'molit-personal-info', text: '[국토교통부] 개인(신용)정보 수집·이용·제공 동의' },
    { id: 'molit-third-party', text: '[국토교통부] 개인(신용)정보 제3자 제공 동의' },
    { id: 'hf-personal-info', text: '[주택금융공사] 개인(신용)정보 수집·이용·조회·제공 동의' },
    { id: 'hf-lease-notice', text: '[주택금융공사] 임대차계약 체결 주의사항 설명' },
    { id: 'sbi-contract', text: '[서울보증보험] 계약체결 및 이행을 위한 필수 동의' },
    { id: 'sbi-third-party', text: '[서울보증보험] 개인(신용)정보 제3자 제공 동의' },
    { id: 'kftc-danal', text: '[금융결제원, 다날] 개인(신용)정보 제3자 제공 동의' }
  ],
  optional: [
    { id: 'hf-optional', text: '[주택금융공사] 개인(신용)정보 수집·이용·제공 동의(선택)' }
  ]
};

const INITIAL_REQUIRED_AGREEMENTS = new Array(AGREEMENT_DATA.required.length).fill(false);
const INITIAL_OPTIONAL_AGREEMENTS = new Array(AGREEMENT_DATA.optional.length).fill(false);

export default function LoanConsentScreen() {
  const router = useRouter();
  const requiredAgreementItems = useMemo(() => AGREEMENT_DATA.required, []);
  const optionalAgreementItems = useMemo(() => AGREEMENT_DATA.optional, []);
  const [requiredAgreements, setRequiredAgreements] = useState<boolean[]>(INITIAL_REQUIRED_AGREEMENTS);
  const [optionalAgreements, setOptionalAgreements] = useState<boolean[]>(INITIAL_OPTIONAL_AGREEMENTS);
  const allRequiredAgreed = useMemo(() => requiredAgreements.every(agreed => agreed), [requiredAgreements]);
  
  const handleAgree = useCallback(() => {
    if (!allRequiredAgreed) { alert('필수 동의 항목에 모두 동의해주세요.'); return; }
    router.push('/jeonse-loan-process');
  }, [allRequiredAgreed, router]);
  
  const handleRequiredAgreementChange = useCallback((index: number) => {
    setRequiredAgreements(prev => { 
      const newAgreements = [...prev]; 
      newAgreements[index] = !newAgreements[index]; 
      return newAgreements; 
    });
  }, []);
  
  const handleAllRequiredAgreementChange = useCallback(() => {
    const newValue = !allRequiredAgreed;
    setRequiredAgreements(INITIAL_REQUIRED_AGREEMENTS.map(() => newValue));
  }, [allRequiredAgreed]);
  
  const handleOptionalAgreementChange = useCallback((index: number) => {
    setOptionalAgreements(prev => { 
      const newAgreements = [...prev]; 
      newAgreements[index] = !newAgreements[index]; 
      return newAgreements; 
    });
  }, []);
  
  const handleAllOptionalAgreementChange = useCallback(() => {
    const newValue = !optionalAgreements.every(agreed => agreed);
    setOptionalAgreements(INITIAL_OPTIONAL_AGREEMENTS.map(() => newValue));
  }, [optionalAgreements]);
  
  const handleBack = useCallback(() => router.back(), [router]);
  
  return (
    <View style={styles.container}>
      <HanaHeader title="전월세보증금 대출" subtitle="대출 신청을 위한 동의서" leftIcon="arrow-left" onLeftPress={handleBack} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>동의 안내</Text>
          <Text style={styles.instruction}>전월세보증금 대출 신청을 위해 동의해주세요.</Text>
        </View>
        <ProductDescription />
        <AgreementSection title="필수동의" agreements={requiredAgreements} onAgreementChange={handleRequiredAgreementChange} onAllAgreementChange={handleAllRequiredAgreementChange} items={requiredAgreementItems} isRequired={true} />
        <View style={styles.optionalSectionSpacer}>
          <AgreementSection title="선택동의" agreements={optionalAgreements} onAgreementChange={handleOptionalAgreementChange} onAllAgreementChange={handleAllOptionalAgreementChange} items={optionalAgreementItems} />
        </View>
        <ConfirmationMessage />
      </ScrollView>
      <AgreementButton onPress={handleAgree} disabled={!allRequiredAgreed} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scrollView: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { padding: 20, paddingBottom: 120 },
  section: { marginBottom: 16 },
  optionalSectionSpacer: { marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text, marginBottom: 12 },
  instruction: { fontSize: 15, color: Colors.light.text, lineHeight: 20, marginBottom: 6 },
  agreementSection: { marginBottom: 2 },
  agreementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: -8 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 18, height: 18, borderRadius: 3, borderWidth: 2, borderColor: Colors.light.border, alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: Colors.light.background },
  checkboxChecked: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  checkText: { color: Colors.light.surface, fontSize: 12, fontWeight: 'bold' },
  agreementTitle: { fontSize: 16, fontWeight: '400', color: Colors.light.text },
  agreementItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingLeft: 28, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  agreementItemContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  checkIcon: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.light.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkIconUnchecked: { backgroundColor: Colors.light.background, borderWidth: 2, borderColor: Colors.light.border },
  agreementItemText: { flex: 1, fontSize: 13, color: Colors.light.text, lineHeight: 18 },
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
  bottomSection: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: Colors.light.background, borderTopWidth: 1, borderTopColor: Colors.light.border },
  agreeButton: { backgroundColor: Colors.light.primary, paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  agreeButtonDisabled: { backgroundColor: Colors.light.border },
  agreeButtonText: { color: Colors.light.surface, fontSize: 16, fontWeight: '600' },
});
