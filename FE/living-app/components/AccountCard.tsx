import { Colors } from '@/constants/Colors';
import { Account } from '@/types/account';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';

interface AccountCardProps {
  account: Account;
  onPress: (account: Account) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({ account, onPress }) => {
  const formatBalance = (balance: number) => {
    return balance.toLocaleString('ko-KR') + '원';
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(account)}
      activeOpacity={0.7}
    >
      <View style={styles.topSection}>
        <View style={styles.header}>
          <View style={styles.leftSection}>
            <Text style={styles.label}>내 자산</Text>
            <Text style={styles.accountNumber}>{account.accountNumber}</Text>
          </View>
          <Text style={styles.bankName}>{account.bankName}</Text>
        </View>

        <View style={styles.balanceSection}>
          <Text style={styles.balance}>{formatBalance(account.balance)}</Text>
          <Image
            source={require('@/assets/images/money_icon.png')}
            style={styles.moneyIcon}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.linkButton} activeOpacity={0.6}>
        <Text style={styles.linkButtonText}>+ 자산 연결</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#009178',
    borderRadius: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  topSection: {
    padding: 24,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  leftSection: {
    flex: 1,
  },
  label: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  accountNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  bankName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  balance: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  moneyIcon: {
    width: 80,
    height: 80,
    marginRight: -24,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 24,
  },
  linkButton: {
    padding: 20,
    alignItems: 'center',
  },
  linkButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
