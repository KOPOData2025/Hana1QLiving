import { HanaHeader } from '@/components/HanaHeader';
import { Colors } from '@/constants/Colors';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { smsAPI } from '../services/smsApi';

// 타입 정의
type ApplicationStep = 'authentication' | 'addressVerification' | 'documentUpload' | 'reviewProgress' | 'confirmation';

interface LoanApplicationData {
  address: string;
  addressCorrect: boolean;
  newAddress?: string;
  selectedLoanProduct?: string; // 선택한 대출 상품명
  documents: Record<string, { uploaded: boolean; fileName?: string; uri?: string; type?: string; size?: number }>;
}

// 상수 정의
const APPLICATION_STEPS = {
  authentication: { title: '실명정보 확인', subtitle: '본인인증을 진행해주세요' },
  addressVerification: { title: '주소 확인', subtitle: '' },
  documentUpload: { title: '서류 제출', subtitle: '필요한 서류를 제출해주세요' },
  reviewProgress: { title: '', subtitle: '' },
  confirmation: { title: '신청 완료', subtitle: '대출 신청이 완료되었습니다' }
} as const;

const REQUIRED_DOCUMENTS = [
  { id: 'leaseContract', title: '임대차계약서(확정일자 또는 신고필증 포함)', subtitle: '임대차계약서를 첨부해주세요', required: true },
  { id: 'residentCopy', title: '주민등록등본', subtitle: '주민등록등본을 첨부해주세요', required: true },
  { id: 'incomeProof', title: '소득증빙서류', subtitle: '소득증빙서류를 첨부해주세요', required: true },
  { id: 'bankbook', title: '통장사본', subtitle: '통장사본을 첨부해주세요', required: true }
];

const getInitialApplicationData = (userAddress?: string): LoanApplicationData => ({
  address: userAddress || '주소 정보를 불러오는 중...',
  addressCorrect: true,
  newAddress: '',
  documents: {}
});

// 유틸리티 함수
const formatPhoneNumber = (text: string): string => {
  const cleaned = text.replace(/[^0-9]/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
};

const validatePhoneNumber = (number: string): boolean => /^\d{3}-\d{3,4}-\d{4}$/.test(number);

// 공통 컴포넌트
const ActionButton = React.memo(({
  title,
  onPress,
  disabled = false,
  secondary = false
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) => (
  <TouchableOpacity
    style={[
      styles.actionButton,
      secondary && styles.actionButtonSecondary,
      disabled && styles.actionButtonDisabled
    ]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={[
      styles.actionButtonText,
      secondary && styles.actionButtonTextSecondary,
      disabled && styles.actionButtonTextDisabled
    ]}>
      {title}
    </Text>
  </TouchableOpacity>
));

// 공통 컴포넌트
const SectionHeader = React.memo<{ title: string; subtitle?: string; description?: string }>(({ title, subtitle, description }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    {description && <Text style={styles.sectionDescription}>{description}</Text>}
  </View>
));

// 인증 방법 선택 컴포넌트
const AuthenticationMethodSelection = React.memo(({ onSelect }: { onSelect: (method: string) => void }) => (
  <View style={styles.section}>
    <SectionHeader title="본인인증 방법을 선택해주세요" subtitle="안전한 인증을 위해 본인명의 휴대폰으로 인증을 진행합니다" />
    
    <View style={styles.authenticationOptions}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => onSelect('phone')}
      >
        <Text style={styles.actionButtonText}>휴대폰 인증</Text>
        <Text style={styles.actionButtonSubtext}>본인명의 휴대폰으로 인증</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => onSelect('resident')}
      >
        <Text style={styles.actionButtonText}>주민등록번호 인증</Text>
        <Text style={styles.actionButtonSubtext}>주민등록번호로 인증</Text>
      </TouchableOpacity>
    </View>
  </View>
));

// 주민등록번호 입력 모달
const ResidentNumberModal = React.memo(({
  visible,
  onClose,
  onSuccess
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [residentNumberFront, setResidentNumberFront] = useState('');
  const [residentNumberBack, setResidentNumberBack] = useState('');
  const [isValid, setIsValid] = useState(false);

  const handleFrontChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 6) {
      setResidentNumberFront(cleaned);
      checkValidity(cleaned, residentNumberBack);
    }
  };

  const handleBackChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 7) {
      setResidentNumberBack(cleaned);
      checkValidity(residentNumberFront, cleaned);
    }
  };

  const checkValidity = (front: string, back: string) => {
    setIsValid(front.length === 6 && back.length === 7);
  };

  const handleConfirm = () => {
    if (isValid) {
      onSuccess();
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTitle}>주민등록번호 입력</Text>
          </View>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Text style={styles.modalCloseText}>닫기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <Text style={styles.inputLabel}>주민등록번호를 입력해주세요</Text>

          <View style={styles.residentInputContainer}>
            <TextInput
              style={styles.residentInputFront}
              value={residentNumberFront}
              onChangeText={handleFrontChange}
              placeholder="000000"
              keyboardType="numeric"
              maxLength={6}
            />
            <Text style={styles.residentSeparator}>-</Text>
            <TextInput
              style={styles.residentInputBack}
              value={residentNumberBack}
              onChangeText={handleBackChange}
              placeholder="0000000"
              keyboardType="numeric"
              maxLength={7}
              secureTextEntry={true}
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmButton, !isValid && styles.modalConfirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!isValid}
              activeOpacity={0.7}
            >
              <Text style={styles.modalConfirmText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
});

// 휴대폰 인증 모달
const PhoneAuthenticationModal = React.memo(({
  visible,
  onClose,
  onSuccess
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: (phoneNumber: string) => void;
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
    setIsValid(validatePhoneNumber(formatted));
  };

  const handleSendCode = async () => {
    if (!isValid || isSending) return;

    setIsSending(true);
    try {
      const response = await smsAPI.sendVerificationCode(phoneNumber);

      if (response.success) {
        Alert.alert('알림', response.message);
        onSuccess(phoneNumber);
      } else {
        Alert.alert('오류', response.message);
      }
    } catch (error) {
      Alert.alert('오류', '인증번호 발송 중 오류가 발생했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTitle}>휴대폰 인증</Text>
          </View>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Text style={styles.modalCloseText}>닫기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <Text style={styles.inputLabel}>휴대폰 번호를 입력해주세요</Text>

          <View style={styles.inputGroup}>
            <TextInput
              style={styles.phoneNumberInput}
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              placeholder="휴대폰 번호 입력"
              keyboardType="numeric"
              maxLength={13}
              returnKeyType="done"
              blurOnSubmit={true}
            />
          </View>

          <TouchableOpacity
            style={[styles.wideSendCodeButton, !isValid && styles.actionButtonDisabled]}
            onPress={handleSendCode}
            disabled={!isValid}
            activeOpacity={0.7}
          >
            <Text style={styles.wideSendCodeButtonText}>인증번호 전송</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// 인증번호 확인 모달
const VerificationCodeModal = React.memo(({
  visible,
  phoneNumber,
  onClose,
  onSuccess
}: {
  visible: boolean;
  phoneNumber: string;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [timer, setTimer] = useState(180);
  const [isValid, setIsValid] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  React.useEffect(() => {
    if (visible && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [visible, timer]);

  const handleCodeChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 6) {
      setVerificationCode(cleaned);
      setIsValid(cleaned.length === 6);
    }
  };

  const handleResend = async () => {
    if (isResending) return;

    setIsResending(true);
    try {
      const response = await smsAPI.sendVerificationCode(phoneNumber);

      if (response.success) {
        Alert.alert('알림', '인증번호가 재전송되었습니다.');
        setTimer(180);
        setVerificationCode('');
        setIsValid(false);
      } else {
        Alert.alert('오류', response.message);
      }
    } catch (error) {
      Alert.alert('오류', '인증번호 재전송 중 오류가 발생했습니다.');
    } finally {
      setIsResending(false);
    }
  };

  const handleConfirm = async () => {
    if (!isValid || isVerifying) return;

    setIsVerifying(true);
    try {
      const response = await smsAPI.verifyCode(phoneNumber, verificationCode);

      if (response.success) {
        Alert.alert('알림', response.message);
        onSuccess();
      } else {
        Alert.alert('오류', response.message);
      }
    } catch (error) {
      Alert.alert('오류', '인증번호 검증 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTitle}>인증번호 입력</Text>
          </View>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Text style={styles.modalCloseText}>닫기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <View style={styles.codeSentInfo}>
            <View style={styles.codeSentRow}>
              <Text style={styles.codeSentText}>{phoneNumber}로 인증번호를 보내드렸습니다</Text>
              <TouchableOpacity style={styles.resendButton} onPress={handleResend}>
                <Text style={styles.resendButtonText}>재전송</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={styles.phoneNumberInput}
              value={verificationCode}
              onChangeText={handleCodeChange}
              placeholder="인증번호 6자리 입력"
              keyboardType="numeric"
              maxLength={6}
              returnKeyType="done"
              blurOnSubmit={true}
            />
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatTime(timer)}</Text>
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmButton, !isValid && styles.modalConfirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!isValid}
              activeOpacity={0.7}
            >
              <Text style={styles.modalConfirmText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
});

// 주소 확인 컴포넌트
const AddressVerificationSection = React.memo(({ applicationData, setApplicationData, onComplete }: {
  applicationData: LoanApplicationData;
  setApplicationData: React.Dispatch<React.SetStateAction<LoanApplicationData>>;
  onComplete: () => void;
}) => {
  const [address, setAddress] = useState(applicationData.address);
  const [isCorrect, setIsCorrect] = useState(applicationData.addressCorrect);
  const [newAddress, setNewAddress] = useState(applicationData.newAddress || '');

  const handleAddressConfirm = useCallback(() => {
    if (isCorrect || newAddress.trim()) {
      setApplicationData(prev => ({
        ...prev,
        addressCorrect: isCorrect,
        newAddress: !isCorrect ? newAddress : ''
      }));
      onComplete();
    }
  }, [isCorrect, newAddress, onComplete, setApplicationData]);

  return (
    <View style={styles.addressSection}>
      <View style={styles.addressIntro}>
        <Text style={styles.addressIntroText}>주민등록등본 제출을 위해 등본상{'\n'}집주소가 맞는지 확인해주세요</Text>
        <Text style={styles.addressIntroSubtext}>아래 주소가 아니라면 다른 주소를 입력해주세요</Text>
      </View>
      
      <View style={styles.addressCard}>
        <Text style={styles.addressCardTitle}>등본상 주소</Text>
        <Text style={styles.addressText}>{address}</Text>
      </View>
      
      <View style={styles.addressQuestion}>
        <Text style={styles.addressQuestionText}>위 주소가 맞나요?</Text>
        <View style={styles.addressButtons}>
          <TouchableOpacity
            style={[styles.addressButton, isCorrect && styles.addressButtonSelected]}
            onPress={() => setIsCorrect(true)}
          >
            <Text style={[styles.addressButtonText, isCorrect && styles.addressButtonTextSelected]}>
              맞습니다
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addressButton, !isCorrect && styles.addressButtonSelected]}
            onPress={() => setIsCorrect(false)}
          >
            <Text style={[styles.addressButtonText, !isCorrect && styles.addressButtonTextSelected]}>
              다릅니다
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {!isCorrect && (
        <View style={styles.newAddressSection}>
          <Text style={styles.newAddressTitle}>새로운 주소를 입력해주세요</Text>
          <TextInput
            style={styles.newAddressInput}
            value={newAddress}
            onChangeText={setNewAddress}
            placeholder="새로운 주소를 입력해주세요"
            multiline
            numberOfLines={3}
          />
        </View>
      )}
      
      <ActionButton title="다음" onPress={handleAddressConfirm} />
    </View>
  );
});

// API 호출 함수
const submitLoanApplication = async (applicationData: LoanApplicationData) => {
  try {

    const formData = new FormData();
    
    // 주소 정보와 선택한 대출 상품 추가
    formData.append('address', applicationData.address);
    formData.append('selectedLoanProduct', applicationData.selectedLoanProduct || '전월세보증금 대출');
    
    // 서류 파일들 추가
    Object.keys(applicationData.documents).forEach((docId) => {
      const doc = applicationData.documents[docId];
      if (doc.uploaded && doc.uri) {
        formData.append(`documents[${docId}]`, {
          uri: doc.uri,
          type: doc.type || 'application/pdf',
          name: doc.fileName || `${docId}.pdf`
        } as any);
      }
    });
    
    // ENV_CONFIG import 추가 필요
    const { ENV_CONFIG } = require('../src/config/environment');
    const apiUrl = `${ENV_CONFIG.API_BASE_URL_DEV}/api/loan/application`;
    
    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      return responseData;
      
    } catch (fetchError) {
      throw fetchError;
    }
  } catch (error) {
    throw error;
  }
};

// 서류 업로드 컴포넌트
const DocumentUploadSection = React.memo(({ applicationData, setApplicationData, onComplete }: { 
  applicationData: LoanApplicationData;
  setApplicationData: React.Dispatch<React.SetStateAction<LoanApplicationData>>;
  onComplete: () => void;
}) => {
  const [documents, setDocuments] = useState<Record<string, { uploaded: boolean; fileName?: string; uri?: string; type?: string; size?: number }>>({});

  const handleDocumentUpload = async (docId: string) => {
    Alert.alert(
      '파일 선택',
      '업로드할 파일 형식을 선택해주세요',
      [
        { text: '사진 촬영', onPress: () => openCamera(docId) },
        { text: '갤러리', onPress: () => openGallery(docId) },
        { text: '파일 선택', onPress: () => openDocumentPicker(docId) },
        { text: '취소', style: 'cancel' }
      ]
    );
  };

  const openCamera = async (docId: string) => {
    try {
      // 카메라 접근 권한 확인
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        Alert.alert(
          '권한 필요',
          '카메라 접근 권한이 필요합니다. 설정에서 권한을 허용해주세요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        base64: false,
        quality: 1
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        updateDocument(docId, asset.uri, asset.fileName || `${docId}_camera.jpg`, 'image/jpeg', asset.fileSize);
      }
    } catch (error) {
      Alert.alert(
        '카메라 오류',
        '카메라를 사용할 수 없습니다. 다시 시도해주세요.',
        [{ text: '확인' }]
      );
    }
  };

  const openGallery = async (docId: string) => {
    try {
      // 갤러리 접근 권한 확인
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        Alert.alert(
          '권한 필요',
          '갤러리 접근 권한이 필요합니다. 설정에서 권한을 허용해주세요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        base64: false,
        quality: 1
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        updateDocument(docId, asset.uri, asset.fileName || `${docId}_gallery.jpg`, 'image/jpeg', asset.fileSize);
      }
    } catch (error) {
      Alert.alert(
        '갤러리 오류',
        '갤러리에서 이미지를 선택할 수 없습니다. 다시 시도해주세요.',
        [{ text: '확인' }]
      );
    }
  };

  const openDocumentPicker = async (docId: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.size && asset.size > 10 * 1024 * 1024) {
          Alert.alert('오류', '파일 크기는 10MB 이하만 업로드 가능합니다.');
          return;
        }
        updateDocument(docId, asset.uri, asset.name, asset.mimeType || 'application/pdf', asset.size);
      }
    } catch (error) {
      Alert.alert('오류', '파일 선택 중 오류가 발생했습니다.');
    }
  };

  const updateDocument = (docId: string, uri: string, fileName: string, type: string, size?: number) => {
    const newDoc = { uploaded: true, fileName, uri, type, size };
    setDocuments(prev => ({ ...prev, [docId]: newDoc }));
    setApplicationData(prev => ({
      ...prev,
      documents: { ...prev.documents, [docId]: newDoc }
    }));
  };

  const handleSubmit = async () => {
    const allUploaded = REQUIRED_DOCUMENTS.every(doc => documents[doc.id]?.uploaded);
    if (!allUploaded) {
      Alert.alert('알림', '모든 필수 서류를 업로드해주세요.');
      return;
    }

    try {
      Alert.alert('알림', '대출 신청을 제출하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        {
          text: '제출',
          onPress: async () => {
            try {
              const response = await submitLoanApplication({ ...applicationData, documents });
              if (response.success) {
                Alert.alert('성공', response.message || '대출 신청이 성공적으로 제출되었습니다.', [
                  { text: '확인', onPress: onComplete }
                ]);
              } else {
                Alert.alert('오류', response.message || '대출 신청 처리 중 오류가 발생했습니다.');
              }
            } catch (error: any) {
              const errorMessage = error?.response?.data?.message || '대출 신청 제출 중 오류가 발생했습니다. 다시 시도해주세요.';
              Alert.alert('오류', errorMessage);
            }
          }
        }
      ]);
    } catch (error) {
      Alert.alert('오류', '대출 신청 처리 중 오류가 발생했습니다.');
    }
  };

  const allUploaded = REQUIRED_DOCUMENTS.every(doc => documents[doc.id]?.uploaded);

  return (
    <View style={styles.documentSection}>
      <View style={styles.documentContent}>
        <View style={styles.documentInfo}>
          <Text style={styles.documentInfoText}>아래 서류들을 준비하여 첨부해주세요</Text>
        </View>
        
        {REQUIRED_DOCUMENTS.map((doc) => (
          <View key={doc.id} style={styles.documentItem}>
            <View style={styles.documentHeaderRow}>
              <View style={styles.documentTextContainer}>
                <Text style={styles.documentTitle}>{doc.title}</Text>
                  {!documents[doc.id]?.uploaded && (
                <Text style={styles.documentSubtitle}>{doc.subtitle}</Text>
                  )}
                  {documents[doc.id]?.fileName && (
                    <Text style={styles.documentFileName}>파일: {documents[doc.id].fileName}</Text>
                  )}
              </View>
              
              <TouchableOpacity
                style={[
                  styles.submitButtonSmall,
                  documents[doc.id]?.uploaded && styles.submitButtonSubmitted
                ]}
                onPress={() => handleDocumentUpload(doc.id)}
              >
                <Text style={[
                  styles.submitButtonTextSmall,
                  documents[doc.id]?.uploaded && styles.submitButtonTextSubmitted
                ]}>
                  {documents[doc.id]?.uploaded ? '완료' : '첨부하기'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        
        <View style={styles.documentNotice}>
          <Text style={styles.documentNoticeText}>
            • 모든 서류는 PDF 또는 이미지 파일로 업로드 가능합니다{'\n'}
            • 파일 크기는 10MB 이하로 제한됩니다{'\n'}
            • 원본 이미지 품질이 유지됩니다{'\n'}
            • 업로드된 서류는 안전하게 보관됩니다
          </Text>
        </View>
      </View>
      
      <ActionButton title="제출하기" onPress={handleSubmit} disabled={!allUploaded} />
    </View>
  );
});

// 서류제출 완료 컴포넌트
const ReviewProgressSection = React.memo(({ onComplete }: { onComplete: () => void }) => {
  return (
    <View style={styles.reviewProgressSection}>
      <View style={styles.reviewProgressIcon}>
        <Text style={styles.reviewProgressIconText}>✓</Text>
      </View>
      
      <Text style={styles.reviewProgressTitle}>서류제출 완료</Text>
      
      <View style={styles.reviewProgressContent}>
        <Text style={styles.reviewProgressText}>
          하나은행에서 서류를 확인 후 <Text style={styles.reviewProgressHighlight}>3영업일 이내</Text>에 심사결과를 알려드리겠습니다.
        </Text>
        <Text style={styles.reviewProgressText}>
          단, 기혼자의 경우 배우자 정보제공 동의가 이루어지지 않으면 서류심사에 시간이 더 소요될 수 있습니다.
        </Text>
      </View>
      
      <ActionButton title="확인" onPress={onComplete} />
    </View>
  );
});

// 신청 완료 컴포넌트
const ApplicationConfirmation = React.memo(({ onComplete }: { onComplete: () => void }) => (
  <View style={styles.confirmationSection}>
    <View style={styles.confirmationIcon}>
      <Text style={styles.confirmationIconText}>✅</Text>
    </View>
    <Text style={styles.confirmationTitle}>대출 신청이 완료되었습니다</Text>
    <Text style={styles.confirmationSubtitle}>신청하신 내용으로 심사가 진행됩니다</Text>
    <View style={styles.confirmationInfo}>
      <Text style={styles.confirmationInfoText}>• 심사 기간: 3-5일</Text>
      <Text style={styles.confirmationInfoText}>• 문의: 1588-9600</Text>
    </View>
    <ActionButton title="확인" onPress={onComplete} />
  </View>
));

// 메인 컴포넌트
export default function LoanApplicationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const selectedLoanProduct = params.selectedLoanProduct as string;

  const [currentStep, setCurrentStep] = useState<ApplicationStep>('authentication');
  const [applicationData, setApplicationData] = useState<LoanApplicationData>({
    ...getInitialApplicationData(user?.beforeAddress),
    selectedLoanProduct: selectedLoanProduct || '전월세보증금 대출'
  });

  // 모달 상태
  const [modalState, setModalState] = useState({
    resident: false,
    phone: false,
    verification: false
  });

  // 휴대폰 번호 저장
  const [verifiedPhoneNumber, setVerifiedPhoneNumber] = useState('');

  // 사용자 주소 정보 업데이트
  useEffect(() => {
    if (user?.beforeAddress) {
      setApplicationData(prev => ({
        ...prev,
        address: user.beforeAddress
      }));
    }
  }, [user]);

  // 이벤트 핸들러들
  const handleAuthenticationSelect = useCallback((method: string) => {
    if (method === 'phone') {
      setModalState(prev => ({ ...prev, resident: true }));
    } else {
      setCurrentStep('addressVerification');
    }
  }, []);

  const handleResidentSuccess = useCallback(() => {
    setModalState(prev => ({ ...prev, resident: false, phone: true }));
  }, []);

  const handleResidentClose = useCallback(() => {
    setModalState(prev => ({ ...prev, resident: false }));
  }, []);

  const handlePhoneAuthSuccess = useCallback((phoneNumber: string) => {
    setVerifiedPhoneNumber(phoneNumber);
    setModalState(prev => ({ ...prev, phone: false, verification: true }));
  }, []);

  const handlePhoneAuthClose = useCallback(() => {
    setModalState(prev => ({ ...prev, phone: false }));
  }, []);

  const handleVerificationSuccess = useCallback(() => {
    setModalState(prev => ({ ...prev, verification: false }));
    setCurrentStep('addressVerification');
  }, []);

  const handleAddressVerificationComplete = useCallback(() => {
    setCurrentStep('documentUpload');
  }, []);

  const handleDocumentComplete = useCallback(() => {
    setCurrentStep('reviewProgress');
  }, []);

  const handleConfirmationComplete = useCallback(() => {
    router.back();
  }, [router]);

  // 현재 단계 렌더링
  const renderCurrentStep = () => {
    const stepComponents = {
      authentication: <AuthenticationMethodSelection onSelect={handleAuthenticationSelect} />,
      addressVerification: <AddressVerificationSection applicationData={applicationData} setApplicationData={setApplicationData} onComplete={handleAddressVerificationComplete} />,
      documentUpload: <DocumentUploadSection applicationData={applicationData} setApplicationData={setApplicationData} onComplete={handleDocumentComplete} />,
      reviewProgress: <ReviewProgressSection onComplete={() => router.push('/')} />,
      confirmation: <ApplicationConfirmation onComplete={handleConfirmationComplete} />
    };
    
    return stepComponents[currentStep];
  };

  // 모달 렌더링
  const modals = (
    <>
      <ResidentNumberModal
        visible={modalState.resident}
        onClose={handleResidentClose}
        onSuccess={handleResidentSuccess}
      />
      <PhoneAuthenticationModal
        visible={modalState.phone}
        onClose={handlePhoneAuthClose}
        onSuccess={handlePhoneAuthSuccess}
      />
      <VerificationCodeModal
        visible={modalState.verification}
        phoneNumber={verifiedPhoneNumber}
        onClose={() => setModalState(prev => ({ ...prev, verification: false }))}
        onSuccess={handleVerificationSuccess}
      />
    </>
  );

  return (
    <View style={styles.container}>
      <HanaHeader 
        title={APPLICATION_STEPS[currentStep].title} 
        subtitle={APPLICATION_STEPS[currentStep].subtitle} 
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      <View style={styles.scrollView}>
        {renderCurrentStep()}
      </View>
      {modals}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scrollView: { flex: 1, padding: 20 },
  section: { padding: 20 },
  sectionHeader: { marginBottom: 24, alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text, marginBottom: 12, textAlign: 'center' },
  sectionSubtitle: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center', lineHeight: 20 },
  sectionDescription: { fontSize: 13, color: Colors.light.textSecondary, textAlign: 'center', marginTop: 0, lineHeight: 18 },
  authenticationSection: { gap: 24 },
  authenticationIntro: { alignItems: 'center', marginBottom: 32 },
  authenticationIntroText: { fontSize: 20, fontWeight: '700', color: Colors.light.text, textAlign: 'center', marginBottom: 12, lineHeight: 28 },
  authenticationIntroSubtext: { fontSize: 16, color: Colors.light.textSecondary, textAlign: 'center', lineHeight: 22 },
  authenticationOptions: { gap: 16 },
  authenticationOption: { backgroundColor: Colors.light.surface, borderRadius: 12, padding: 24, borderWidth: 1, borderColor: Colors.light.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  authenticationOptionText: { fontSize: 18, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  authenticationOptionSubtext: { fontSize: 14, color: Colors.light.textSecondary, lineHeight: 20 },
  documentSection: { gap: 24 },
  documentContent: { gap: 16 },
  documentInfo: { backgroundColor: Colors.light.background, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: Colors.light.border },
  documentInfoText: { fontSize: 14, color: Colors.light.textSecondary, lineHeight: 20, textAlign: 'center' },
  documentItem: { backgroundColor: Colors.light.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.light.border, gap: 12 },
  documentHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  documentTextContainer: { flex: 1, gap: 4 },
  documentTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text, lineHeight: 22 },
  documentSubtitle: { fontSize: 14, color: Colors.light.textSecondary, lineHeight: 20 },
  documentFileName: { fontSize: 12, color: Colors.light.primary, lineHeight: 16, marginTop: 4 },
  submitButtonSmall: { backgroundColor: Colors.light.primary, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center', height: 28, justifyContent: 'center' },
  submitButtonSubmitted: { backgroundColor: Colors.light.textSecondary, borderWidth: 1, borderColor: Colors.light.textSecondary },
  submitButtonTextSmall: { color: Colors.light.surface, fontSize: 12, fontWeight: '600' },
  submitButtonTextSubmitted: { color: Colors.light.surface, fontSize: 14, fontWeight: '600' },
  documentNotice: { backgroundColor: Colors.light.background, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: Colors.light.border },
  documentNoticeText: { fontSize: 13, color: Colors.light.textSecondary, lineHeight: 18, marginBottom: 4 },
  addressSection: { gap: 20 },
  addressIntro: { alignItems: 'center', marginBottom: 24 },
  addressIntroText: { fontSize: 18, fontWeight: '600', color: Colors.light.text, textAlign: 'center', marginBottom: 8 },
  addressIntroSubtext: { fontSize: 16, color: Colors.light.textSecondary, textAlign: 'center', lineHeight: 22 },
  addressCard: { backgroundColor: Colors.light.surface, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: Colors.light.border },
  addressCardTitle: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: 12 },
  addressText: { fontSize: 16, color: Colors.light.text, lineHeight: 22 },
  addressQuestion: { alignItems: 'center', marginBottom: 24 },
  addressQuestionText: { fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: 16 },
  addressButtons: { flexDirection: 'row', gap: 12 },
  addressButton: { flex: 1, backgroundColor: Colors.light.surface, borderWidth: 1, borderColor: Colors.light.border, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  addressButtonSelected: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  addressButtonText: { fontSize: 14, color: Colors.light.text, fontWeight: '600' },
  addressButtonTextSelected: { color: Colors.light.surface, fontWeight: '600' },
  newAddressSection: { marginBottom: 24 },
  newAddressTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: 12 },
  newAddressInput: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: Colors.light.text, backgroundColor: Colors.light.surface, minHeight: 80, textAlignVertical: 'top' },
  confirmationSection: { alignItems: 'center', gap: 24, marginTop: 60 },
  confirmationIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.light.success, alignItems: 'center', justifyContent: 'center' },
  confirmationIconText: { fontSize: 40 },
  confirmationTitle: { fontSize: 24, fontWeight: '700', color: Colors.light.text, textAlign: 'center' },
  confirmationSubtitle: { fontSize: 16, color: Colors.light.textSecondary, textAlign: 'center', lineHeight: 22 },
  confirmationInfo: { backgroundColor: Colors.light.surface, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: Colors.light.border, width: '100%' },
  confirmationInfoText: { fontSize: 14, color: Colors.light.textSecondary, lineHeight: 20, marginBottom: 8 },
  actionButton: { backgroundColor: Colors.light.primary, paddingVertical: 16, borderRadius: 8, alignItems: 'center', width: '100%', shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  actionButtonSecondary: { backgroundColor: Colors.light.surface, borderWidth: 1, borderColor: Colors.light.border },
  actionButtonDisabled: { backgroundColor: Colors.light.textTertiary, opacity: 0.5, shadowOpacity: 0 },
  actionButtonText: { fontSize: 16, color: Colors.light.surface, fontWeight: '600', letterSpacing: 0.5 },
  actionButtonSubtext: { fontSize: 14, color: Colors.light.surface, fontWeight: '400', marginTop: 4, opacity: 0.9 },
  actionButtonTextSecondary: { color: Colors.light.text, fontWeight: '600' },
  actionButtonTextDisabled: { color: Colors.light.textSecondary, fontWeight: '600' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end', zIndex: 1000 },
  modalContainer: { backgroundColor: Colors.light.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30, height: '70%', marginHorizontal: 0, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: Colors.light.border, position: 'relative' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.light.text, textAlign: 'center', flex: 1 },
  modalContent: { padding: 24, gap: 16 },
  modalButtons: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 0, flexDirection: 'row', gap: 12 },
  modalCancelButton: { flex: 1, backgroundColor: Colors.light.surface, borderWidth: 1, borderColor: Colors.light.border, paddingVertical: 12, borderRadius: 8, alignItems: 'center', zIndex: 10 },
  modalCancelText: { fontSize: 16, color: Colors.light.text, fontWeight: '600' },
  modalConfirmButton: { flex: 1, backgroundColor: Colors.light.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalConfirmButtonDisabled: { backgroundColor: Colors.light.textTertiary, opacity: 0.5 },
  modalConfirmText: { fontSize: 16, color: Colors.light.surface, fontWeight: '600' },
  modalCloseButton: { position: 'absolute', right: 24, top: 22, zIndex: 10 },
  modalCloseText: { fontSize: 16, color: Colors.light.primary, fontWeight: '600' },
  modalTitleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 },
  inputGroup: { gap: 12, alignItems: 'center' },
  inputLabel: { fontSize: 16, fontWeight: '600', color: Colors.light.text, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  codeSentInfo: { alignItems: 'flex-start', marginBottom: 10 },
  codeSentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  codeSentText: { fontSize: 14, color: Colors.light.text, textAlign: 'left', lineHeight: 20, flex: 1 },
  resendButton: { backgroundColor: Colors.light.background, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.light.border },
  resendButtonText: { fontSize: 14, color: Colors.light.textSecondary },
  phoneNumberInput: { width: '100%', borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: Colors.light.text, backgroundColor: Colors.light.surface, textAlign: 'center' },
  timerContainer: { position: 'absolute', right: 12, top: '50%', transform: [{ translateY: -10 }], backgroundColor: 'transparent' },
  timerText: { fontSize: 16, color: Colors.light.primary, fontWeight: '600' },
  wideSendCodeButton: { backgroundColor: Colors.light.primary, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', width: '100%', shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  wideSendCodeButtonText: { fontSize: 16, color: Colors.light.surface, fontWeight: '600', letterSpacing: 0.5 },
  residentInputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0, borderWidth: 2, borderColor: Colors.light.primary, borderRadius: 12, backgroundColor: Colors.light.surface, shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, overflow: 'hidden' },
  residentInputFront: { width: 120, borderWidth: 0, paddingHorizontal: 16, paddingVertical: 12, fontSize: 18, color: Colors.light.text, textAlign: 'center', backgroundColor: 'transparent' },
  residentSeparator: { fontSize: 20, fontWeight: '600', color: Colors.light.primary, paddingHorizontal: 8, paddingVertical: 12, backgroundColor: 'transparent' },
  residentInputBack: { width: 140, borderWidth: 0, paddingHorizontal: 16, paddingVertical: 12, fontSize: 18, color: Colors.light.text, textAlign: 'center', backgroundColor: 'transparent' },
  reviewProgressSection: { gap: 24, alignItems: 'center', marginTop: 60 },
  reviewProgressIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.light.success, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  reviewProgressIconText: { fontSize: 40, color: Colors.light.surface, fontWeight: 'bold' },
  reviewProgressTitle: { fontSize: 24, fontWeight: '700', color: Colors.light.text, textAlign: 'center', marginBottom: 32 },
  reviewProgressContent: { gap: 16, paddingHorizontal: 20, marginBottom: 32 },
  reviewProgressText: { fontSize: 16, color: Colors.light.text, textAlign: 'center', lineHeight: 24 },
  reviewProgressHighlight: { color: Colors.light.primary, fontWeight: '600' }
});
