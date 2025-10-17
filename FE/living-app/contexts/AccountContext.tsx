import React, { createContext, ReactNode, useContext, useState } from 'react';

interface Account {
  id: string;
  bankName: string;
  accountNumber: string;
  balance: number;
  isPrimary: boolean;
  bankLogo?: string;
}

interface AccountContextType {
  accounts: Account[];
  isAccountLinked: boolean;
  addAccount: (account: Account) => void;
  removeAccount: (accountId: string) => void;
  setPrimaryAccount: (accountId: string) => void;
  setAccountLinked: (linked: boolean) => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};

interface AccountProviderProps {
  children: ReactNode;
}

export const AccountProvider: React.FC<AccountProviderProps> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isAccountLinked, setIsAccountLinked] = useState(false);

  const addAccount = (account: Account) => {
    setAccounts(prev => [...prev, account]);
    setIsAccountLinked(true);
  };

  const removeAccount = (accountId: string) => {
    setAccounts(prev => prev.filter(acc => acc.id !== accountId));
    if (accounts.length <= 1) {
      setIsAccountLinked(false);
    }
  };

  const setPrimaryAccount = (accountId: string) => {
    setAccounts(prev => 
      prev.map(acc => ({
        ...acc,
        isPrimary: acc.id === accountId
      }))
    );
  };

  const setAccountLinked = (linked: boolean) => {
    setIsAccountLinked(linked);
  };

  return (
    <AccountContext.Provider value={{
      accounts,
      isAccountLinked,
      addAccount,
      removeAccount,
      setPrimaryAccount,
      setAccountLinked
    }}>
      {children}
    </AccountContext.Provider>
  );
};
