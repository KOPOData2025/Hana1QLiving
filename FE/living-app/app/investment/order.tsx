import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { investmentApi, InvestmentProduct, OrderRequest, OrderResponse } from '@/services/investmentApi';
import { useAuth } from '@/contexts/AuthContext';
import { mobileApi } from '../../services/mobileApi';

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

export default function OrderScreen() {
  const { productId, orderType: initialOrderType, maxQuantity } = useLocalSearchParams<{
    productId: string;
    orderType: 'BUY' | 'SELL';
    maxQuantity?: string;
  }>();
  
  const { user } = useAuth();
  const [product, setProduct] = useState<InvestmentProduct | null>(null);
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>(initialOrderType || 'BUY');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [password, setPassword] = useState('');
  const [estimate, setEstimate] = useState<OrderEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimating, setEstimating] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<LinkedAccount | null>(null);
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  useEffect(() => {
    if (productId) {
      loadProductInfo();
    }
    loadLinkedAccounts();
  }, [productId]);

  const loadLinkedAccounts = async () => {
    try {
      const response = await mobileApi.get('/api/securities-accounts/linked');
      
      // mobileApi는 createRetryableAPI를 통해 순수한 데이터만 반환함
      const accounts = Array.isArray(response) ? response : [];
      setLinkedAccounts(accounts);
      
      // 첫 번째 활성 계좌를 기본 선택
      const activeAccount = accounts.find((account: LinkedAccount) => account.status === 'ACTIVE');
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

  useEffect(() => {
    if (product) {
      setUnitPrice(product.currentPrice.toString());
      calculateEstimate();
    }
  }, [product, quantity, unitPrice]);

  const loadProductInfo = async () => {
    try {
      setLoading(true);
      const response = await investmentApi.getInvestmentProduct(productId);
      if (response.success && response.data) {
        setProduct(response.data);
      } else {
        Alert.alert('오류', '상품 정보를 찾을 수 없습니다.');
        router.back();
      }
    } catch (error) {
      Alert.alert('오류', '상품 정보를 불러오는 중 오류가 발생했습니다.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimate = async () => {
    if (!product || !quantity || !unitPrice || isNaN(Number(quantity)) || isNaN(Number(unitPrice))) {
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
      }
    } catch (error) {
    } finally {
      setEstimating(false);
    }
  };

  const validateOrder = (): boolean => {
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      Alert.alert('입력 오류', '수량을 올바르게 입력해주세요.');
      return false;
    }

    if (!unitPrice || isNaN(Number(unitPrice)) || Number(unitPrice) <= 0) {
      Alert.alert('입력 오류', '단가를 올바르게 입력해주세요.');
      return false;
    }

    if (orderType === 'SELL' && maxQuantity && Number(quantity) > Number(maxQuantity)) {
      Alert.alert('입력 오류', `매도 가능 수량은 최대 ${maxQuantity}주입니다.`);
      return false;
    }

    if (product && Number(quantity) < (product.minInvestment / Number(unitPrice))) {
      const minQuantity = Math.ceil(product.minInvestment / Number(unitPrice));
      Alert.alert('입력 오류', `최소 투자금액은 ${formatCurrency(product.minInvestment)}이므로 최소 ${minQuantity}주 이상 주문해주세요.`);
      return false;
    }

    if (!accountNumber.trim()) {
      Alert.alert('입력 오류', '계좌번호를 입력해주세요.');
      return false;
    }

    // 비밀번호 검증 제거 (Mock 환경에서 고정값 사용)

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
        channel: 'APP',
      };

      const response: OrderResponse = orderType === 'BUY'
        ? await investmentApi.createBuyOrder(orderRequest)
        : await investmentApi.createSellOrder(orderRequest);

      if (response.success) {
        Alert.alert(
          '주문 완료',
          `${orderType === 'BUY' ? '매수' : '매도'} 주문이 성공적으로 처리되었습니다.\n주문번호: ${response.orderId}`,
          [
            {
              text: '확인',
              onPress: () => {
                router.back();
                router.push('/investment/transactions');
              }
            }
          ]
        );
      } else {
        Alert.alert('주문 실패', response.message || '주문 처리 중 오류가 발생했습니다.');
      }
    } catch (error: any) {
      let errorMessage = '주문 처리 중 오류가 발생했습니다.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('주문 실패', errorMessage);
    } finally {
      setOrdering(false);
      setConfirmModalVisible(false);
    }
  };

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return '₩0';
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const getAccountTypeText = (type: string): string => {
    switch (type) {
      case 'NORMAL':
        return '일반계좌';
      case 'ISA':
        return 'ISA계좌';
      case 'PENSION':
        return '연금계좌';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>상품 정보를 불러오는 중...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={64} color={Colors.light.textSecondary} />
        <Text style={styles.errorText}>상품 정보를 찾을 수 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {orderType === 'BUY' ? '매수' : '매도'} 주문
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* 상품 정보 */}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.productName}</Text>
          <Text style={styles.productCode}>{product.productCode}</Text>
          <Text style={styles.currentPrice}>
            현재가: {formatCurrency(product.currentPrice)}
          </Text>
        </View>

        {/* 주문 유형 선택 */}
        <View style={styles.orderTypeSection}>
          <Text style={styles.sectionTitle}>주문 유형</Text>
          <View style={styles.orderTypeButtons}>
            <TouchableOpacity
              style={[
                styles.orderTypeButton,
                orderType === 'BUY' && styles.buyOrderTypeActive,
              ]}
              onPress={() => setOrderType('BUY')}
            >
              <Text style={[
                styles.orderTypeText,
                orderType === 'BUY' && styles.buyOrderTypeTextActive,
              ]}>
                매수
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.orderTypeButton,
                orderType === 'SELL' && styles.sellOrderTypeActive,
              ]}
              onPress={() => setOrderType('SELL')}
            >
              <Text style={[
                styles.orderTypeText,
                orderType === 'SELL' && styles.sellOrderTypeTextActive,
              ]}>
                매도
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 주문 수량 입력 */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>주문 수량</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="수량을 입력하세요"
              keyboardType="numeric"
              placeholderTextColor={Colors.light.textSecondary}
            />
            <Text style={styles.inputUnit}>주</Text>
          </View>
          {maxQuantity && orderType === 'SELL' && (
            <Text style={styles.helperText}>
              매도 가능: {formatNumber(Number(maxQuantity))}주
            </Text>
          )}
        </View>

        {/* 주문 단가 입력 */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>주문 단가</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={unitPrice}
              onChangeText={setUnitPrice}
              placeholder="단가를 입력하세요"
              keyboardType="numeric"
              placeholderTextColor={Colors.light.textSecondary}
            />
            <Text style={styles.inputUnit}>원</Text>
          </View>
          <TouchableOpacity
            style={styles.currentPriceButton}
            onPress={() => setUnitPrice(product.currentPrice.toString())}
          >
            <Text style={styles.currentPriceButtonText}>현재가 적용</Text>
          </TouchableOpacity>
        </View>

        {/* 주문 예상 금액 */}
        {estimate && (
          <View style={styles.estimateSection}>
            <Text style={styles.sectionTitle}>주문 예상</Text>
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
              
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>수수료</Text>
                <Text style={styles.estimateValue}>
                  {formatCurrency(estimate.fees)}
                </Text>
              </View>
              
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>세금</Text>
                <Text style={styles.estimateValue}>
                  {formatCurrency(estimate.tax)}
                </Text>
              </View>
              
              <View style={[styles.estimateRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>
                  {orderType === 'BUY' ? '결제예정금액' : '수취예정금액'}
                </Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(estimate.netAmount)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 계좌 정보 선택 */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>계좌 선택</Text>
          {linkedAccounts.length > 0 ? (
            <>
              <TouchableOpacity
                style={styles.accountSelector}
                onPress={() => setAccountModalVisible(true)}
              >
                <View style={styles.selectedAccountInfo}>
                  {selectedAccount ? (
                    <>
                      <Text style={styles.selectedAccountName}>{selectedAccount.accountName}</Text>
                      <Text style={styles.selectedAccountNumber}>{selectedAccount.accountNumber}</Text>
                    </>
                  ) : (
                    <Text style={styles.accountPlaceholder}>계좌를 선택하세요</Text>
                  )}
                </View>
                <MaterialIcons name="keyboard-arrow-down" size={24} color={Colors.light.textSecondary} />
              </TouchableOpacity>
              
              {/* 비밀번호 입력 필드 제거 (Mock 환경에서 자동 처리) */}
            </>
          ) : (
            <View style={styles.noAccountsContainer}>
              <MaterialIcons name="account-balance" size={48} color={Colors.light.textSecondary} />
              <Text style={styles.noAccountsTitle}>연동된 계좌가 없습니다</Text>
              <Text style={styles.noAccountsSubtitle}>투자를 위해 증권계좌를 먼저 연동해주세요</Text>
              <TouchableOpacity 
                style={styles.linkAccountButton}
                onPress={() => router.push('/investment/account-link')}
              >
                <Text style={styles.linkAccountButtonText}>계좌 연동하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 하단 여백 */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* 주문 버튼 */}
      <View style={styles.orderButtonContainer}>
        <TouchableOpacity
          style={[
            styles.orderButton,
            orderType === 'BUY' ? styles.buyOrderButton : styles.sellOrderButton,
            (!quantity || !unitPrice || !selectedAccount || !estimate || linkedAccounts.length === 0) && styles.disabledOrderButton
          ]}
          onPress={() => setConfirmModalVisible(true)}
          disabled={!quantity || !unitPrice || !selectedAccount || !estimate || ordering || linkedAccounts.length === 0}
        >
          <Text style={styles.orderButtonText}>
            {orderType === 'BUY' ? '매수' : '매도'} 주문하기
          </Text>
        </TouchableOpacity>
      </View>

      {/* 주문 확인 모달 */}
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
              <Text style={styles.confirmProduct}>{product.productName}</Text>
              
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>주문유형</Text>
                <Text style={styles.confirmValue}>
                  {orderType === 'BUY' ? '매수' : '매도'}
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
                    {orderType === 'BUY' ? '결제예정금액' : '수취예정금액'}
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
                  orderType === 'BUY' ? styles.buyConfirmButton : styles.sellConfirmButton
                ]}
                onPress={handleOrderSubmit}
                disabled={ordering}
              >
                {ordering ? (
                  <ActivityIndicator size="small" color={Colors.light.background} />
                ) : (
                  <Text style={styles.confirmButtonText}>주문하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 계좌 선택 모달 */}
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
              {linkedAccounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.accountOption,
                    selectedAccount?.id === account.id && styles.selectedAccountOption
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
                    <Text style={styles.accountOptionType}>{getAccountTypeText(account.accountType)}</Text>
                  </View>
                  {selectedAccount?.id === account.id && (
                    <MaterialIcons name="check" size={24} color={Colors.light.primary} />
                  )}
                </TouchableOpacity>
              ))}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: Colors.light.text,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.light.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  productInfo: {
    backgroundColor: Colors.light.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  productCode: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
  },
  orderTypeSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  orderTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  orderTypeButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: Colors.light.surface,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  buyOrderTypeActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  sellOrderTypeActive: {
    backgroundColor: '#4DABF7',
    borderColor: '#4DABF7',
  },
  orderTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  buyOrderTypeTextActive: {
    color: Colors.light.background,
  },
  sellOrderTypeTextActive: {
    color: Colors.light.background,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: Colors.light.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
  },
  inputUnit: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginLeft: 8,
  },
  helperText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  currentPriceButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  currentPriceButtonText: {
    fontSize: 12,
    color: Colors.light.background,
    fontWeight: '600',
  },
  estimateSection: {
    marginBottom: 24,
  },
  estimateCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    position: 'relative',
  },
  estimatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  estimateLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  estimateValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  bottomSpacing: {
    height: 100,
  },
  orderButtonContainer: {
    padding: 20,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  orderButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buyOrderButton: {
    backgroundColor: '#FF6B6B',
  },
  sellOrderButton: {
    backgroundColor: '#4DABF7',
  },
  disabledOrderButton: {
    backgroundColor: Colors.light.textSecondary,
  },
  orderButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 40,
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmDetails: {
    marginBottom: 24,
  },
  confirmProduct: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  confirmLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  confirmValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  totalConfirmRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    marginTop: 8,
    paddingTop: 16,
  },
  totalConfirmLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  totalConfirmValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: Colors.light.surface,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buyConfirmButton: {
    backgroundColor: '#FF6B6B',
  },
  sellConfirmButton: {
    backgroundColor: '#4DABF7',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
  // 계좌 선택 관련 스타일
  accountSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  selectedAccountInfo: {
    flex: 1,
  },
  selectedAccountName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  selectedAccountNumber: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  accountPlaceholder: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  noAccountsContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  noAccountsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 12,
    marginBottom: 4,
  },
  noAccountsSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  linkAccountButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  linkAccountButtonText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600',
  },
  // 계좌 선택 모달 스타일
  accountModalContent: {
    backgroundColor: Colors.light.background,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    maxHeight: '80%',
  },
  accountList: {
    maxHeight: 300,
    marginVertical: 16,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  selectedAccountOption: {
    borderColor: Colors.light.primary,
    backgroundColor: '#f0f8f0',
  },
  accountOptionInfo: {
    flex: 1,
  },
  accountOptionName: {
    fontSize: 16,
    fontWeight: '600',
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
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
});