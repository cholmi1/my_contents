import type { BalanceSnapshot, LedgerTransaction } from '../types/ledger';

export interface MonthlyTotals {
  income: number;
  expense: number;
  net: number;
  transferCount: number;
}

export function calculateMonthlyTotals(transactions: LedgerTransaction[]): MonthlyTotals {
  let income = 0;
  let expense = 0;
  let transferCount = 0;
  transactions.forEach((transaction) => {
    if (transaction.type === 'income') income += transaction.amount;
    else if (transaction.type === 'expense') expense += transaction.amount;
    else transferCount += 1;
  });
  return { income, expense, net: income - expense, transferCount };
}

export function transactionsInMonth(
  transactions: LedgerTransaction[],
  month: string,
): LedgerTransaction[] {
  return transactions
    .filter((transaction) => transaction.date.slice(0, 7) === month)
    .sort((a, b) => {
      if (a.date === b.date) return b.createdAt.localeCompare(a.createdAt);
      return b.date.localeCompare(a.date);
    });
}

export function latestBalancesByAccount(
  balances: BalanceSnapshot[],
): Map<string, BalanceSnapshot> {
  const map = new Map<string, BalanceSnapshot>();
  const sorted = [...balances].sort((a, b) => {
    if (a.date === b.date) return a.createdAt.localeCompare(b.createdAt);
    return a.date.localeCompare(b.date);
  });
  sorted.forEach((snapshot) => map.set(snapshot.accountId, snapshot));
  return map;
}
