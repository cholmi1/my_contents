import type { ISODate, ISODateTime } from './hub';

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface LedgerAccount {
  id: string;
  alias: string;
  createdAt: ISODateTime;
}

export interface BalanceSnapshot {
  id: string;
  accountId: string;
  date: ISODate;
  balance: number;
  note: string;
  createdAt: ISODateTime;
}

export interface LedgerTransaction {
  id: string;
  date: ISODate;
  accountId: string;
  type: TransactionType;
  category: string;
  amount: number;
  memo: string;
  toAccountId: string | null;
  createdAt: ISODateTime;
}

export interface LedgerMeta {
  lastBackupAt: ISODateTime | null;
}

export interface LedgerData {
  schemaVersion: 1;
  meta: LedgerMeta;
  accounts: LedgerAccount[];
  balances: BalanceSnapshot[];
  transactions: LedgerTransaction[];
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: '수입',
  expense: '지출',
  transfer: '이체',
};
