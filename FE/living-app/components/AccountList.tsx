import { Colors } from '@/constants/Colors';
import { Account } from '@/types/account';
import React, { useCallback } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { AccountCard } from './AccountCard';

interface AccountListProps {
  accounts: Account[];
  onRefresh: () => void;
  refreshing: boolean;
}

export const AccountList: React.FC<AccountListProps> = ({
  accounts,
  onRefresh,
  refreshing,
}) => {
  const handleAccountPress = useCallback((account: Account) => {
    Alert.alert(
      '계좌 상세 정보',
      `계좌명: ${account.accountName}\n계좌번호: ${account.accountNumber}\n잔액: ${account.balance.toLocaleString('ko-KR')}원\n계좌종류: ${account.accountType}`,
      [{ text: '확인' }]
    );
  }, []);

  if (accounts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>연동된 계좌가 없습니다</Text>
        <Text style={styles.emptySubText}>계좌를 연동하여 서비스를 이용해보세요</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          tintColor={Colors.light.textSecondary}
          colors={[Colors.light.primary]}
          size="small"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {accounts.map((account, index) => (
        <AccountCard
          key={`${account.accountNumber}-${index}`}
          account={account}
          onPress={handleAccountPress}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.light.textTertiary,
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});
