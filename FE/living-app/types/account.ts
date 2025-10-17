export interface Account {
  accountNumber: string;
  accountType: string;
  accountName: string;
  bankCode: string;
  bankName: string;
  balance: number;
  currency: string;
  status: string;
  lastTransactionDate: string;
}

export interface AccountResponse {
  success: boolean;
  message: string;
  userCi: string;
  accounts: Account[];
  totalCount: number;
}
