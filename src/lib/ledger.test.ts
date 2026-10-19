import { describe, expect, it } from 'vitest';
import type { BalanceSnapshot, LedgerTransaction } from '../types/ledger';
import { calculateMonthlyTotals, latestBalancesByAccount, transactionsInMonth } from './ledger';

function transaction(overrides: Partial<LedgerTransaction> = {}): LedgerTransaction {
  return {
    id: 'tx',
    date: '2026-10-19',
    accountId: 'a',
    type: 'expense',
    category: '식비',
    amount: 1000,
    memo: '',
    toAccountId: null,
    createdAt: '2026-10-19T00:00:00.000Z',
    ...overrides,
  };
}

function snapshot(overrides: Partial<BalanceSnapshot> = {}): BalanceSnapshot {
  return {
    id: 'balance',
    accountId: 'a',
    date: '2026-10-01',
    balance: 100000,
    note: '',
    createdAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('가계부 집계', () => {
  it('수입 100,000원, 지출 30,000원, 이체 20,000원이면 이체를 제외한다', () => {
    const totals = calculateMonthlyTotals([
      transaction({ id: 'income', type: 'income', amount: 100000 }),
      transaction({ id: 'expense', type: 'expense', amount: 30000 }),
      transaction({
        id: 'transfer',
        type: 'transfer',
        amount: 20000,
        toAccountId: 'b',
      }),
    ]);
    expect(totals.income).toBe(100000);
    expect(totals.expense).toBe(30000);
    expect(totals.net).toBe(70000);
    expect(totals.transferCount).toBe(1);
  });

  it('월 필터는 해당 월 거래만 남기고 최신순으로 정렬한다', () => {
    const result = transactionsInMonth(
      [
        transaction({ id: 'a', date: '2026-10-01' }),
        transaction({ id: 'b', date: '2026-10-20' }),
        transaction({ id: 'c', date: '2026-09-30' }),
      ],
      '2026-10',
    );
    expect(result.map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('계좌별 최근 스냅샷은 기준일이 늦은 기록을 선택한다', () => {
    const map = latestBalancesByAccount([
      snapshot({ id: 'old', date: '2026-09-01', balance: 100 }),
      snapshot({ id: 'new', date: '2026-10-01', balance: 200 }),
      snapshot({ id: 'other', accountId: 'b', balance: 300 }),
    ]);
    expect(map.get('a')?.balance).toBe(200);
    expect(map.get('a')?.id).toBe('new');
    expect(map.get('b')?.balance).toBe(300);
  });

  it('거래 입력은 잔액 스냅샷 배열을 변경하지 않는다', () => {
    const balances = [snapshot()];
    const before = JSON.stringify(balances);
    const transactions = [transaction({ amount: 5000 })];
    calculateMonthlyTotals(transactions);
    expect(JSON.stringify(balances)).toBe(before);
    expect(balances[0].balance).toBe(100000);
  });
});
