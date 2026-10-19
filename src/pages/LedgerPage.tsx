import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { LocalStore } from '../hooks/useLocalStore';
import type {
  LedgerData,
  LedgerTransaction,
  TransactionType,
} from '../types/ledger';
import { TRANSACTION_TYPE_LABELS } from '../types/ledger';
import { useToday } from '../hooks/useToday';
import { formatMonthLabel, isISODate, currentMonthKey } from '../lib/date';
import { parseIntegerText } from '../lib/csv';
import { calculateMonthlyTotals, latestBalancesByAccount, transactionsInMonth } from '../lib/ledger';
import { createId } from '../lib/id';
import { Badge } from '../components/Badge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { FormField } from '../components/FormField';

interface Props {
  store: LocalStore<LedgerData>;
}

interface TransactionFormState {
  date: string;
  accountId: string;
  type: TransactionType;
  category: string;
  amount: string;
  memo: string;
  toAccountId: string;
}

type DeleteTarget =
  | { kind: 'account'; id: string; label: string }
  | { kind: 'balance'; id: string; label: string }
  | { kind: 'transaction'; id: string; label: string };

function formatWon(value: number, hidden: boolean): string {
  if (hidden) return '••••원';
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`;
}

function shortDate(value: string): string {
  return value.replaceAll('-', '.');
}

export function LedgerPage({ store }: Props) {
  const today = useToday();
  const [month, setMonth] = useState(() => currentMonthKey());
  const [hideAmounts, setHideAmounts] = useState(false);
  const [ledgerError, setLedgerError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const [accountAlias, setAccountAlias] = useState('');
  const [accountError, setAccountError] = useState('');

  const [balanceForm, setBalanceForm] = useState({
    accountId: '',
    date: today,
    balance: '',
    note: '',
  });
  const [balanceError, setBalanceError] = useState('');

  const [txForm, setTxForm] = useState<TransactionFormState>({
    date: today,
    accountId: '',
    type: 'expense',
    category: '',
    amount: '',
    memo: '',
    toAccountId: '',
  });
  const [txError, setTxError] = useState('');
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  const latestBalances = useMemo(
    () => latestBalancesByAccount(store.data.balances),
    [store.data.balances],
  );

  const monthTransactions = useMemo(
    () => transactionsInMonth(store.data.transactions, month),
    [store.data.transactions, month],
  );

  const totals = useMemo(
    () => calculateMonthlyTotals(monthTransactions),
    [monthTransactions],
  );

  const accountName = (id: string | null) =>
    store.data.accounts.find((account) => account.id === id)?.alias ?? '알 수 없는 계좌';

  const recentSnapshots = useMemo(
    () =>
      [...store.data.balances]
        .sort((a, b) => {
          if (a.date === b.date) return b.createdAt.localeCompare(a.createdAt);
          return b.date.localeCompare(a.date);
        })
        .slice(0, 8),
    [store.data.balances],
  );

  function addAccount(event: FormEvent) {
    event.preventDefault();
    const alias = accountAlias.trim();
    if (!alias) {
      setAccountError('계좌 별칭을 입력하세요.');
      return;
    }
    if (store.data.accounts.some((account) => account.alias === alias)) {
      setAccountError('같은 별칭의 계좌가 이미 있습니다.');
      return;
    }
    setAccountError('');
    store.update(
      (current) => ({
        ...current,
        accounts: [
          ...current.accounts,
          { id: createId('account'), alias, createdAt: new Date().toISOString() },
        ],
      }),
      '계좌 추가됨',
    );
    setAccountAlias('');
  }

  function addBalance(event: FormEvent) {
    event.preventDefault();
    if (!balanceForm.accountId) {
      setBalanceError('잔액을 기록할 계좌를 선택하세요.');
      return;
    }
    if (!isISODate(balanceForm.date)) {
      setBalanceError('잔액 기준일을 올바르게 입력하세요.');
      return;
    }
    const balance = parseIntegerText(balanceForm.balance);
    if (balance === null) {
      setBalanceError('잔액은 원 단위 정수로 입력하세요. 소수점은 사용할 수 없습니다.');
      return;
    }
    setBalanceError('');
    store.update(
      (current) => ({
        ...current,
        balances: [
          ...current.balances,
          {
            id: createId('balance'),
            accountId: balanceForm.accountId,
            date: balanceForm.date,
            balance,
            note: balanceForm.note.trim(),
            createdAt: new Date().toISOString(),
          },
        ],
      }),
      '잔액 스냅샷 저장됨',
    );
    setBalanceForm({ ...balanceForm, balance: '', note: '' });
  }

  function submitTransaction(event: FormEvent) {
    event.preventDefault();
    if (!isISODate(txForm.date)) {
      setTxError('거래 날짜를 올바르게 입력하세요.');
      return;
    }
    if (!txForm.accountId) {
      setTxError('거래 계좌를 선택하세요.');
      return;
    }
    const amount = parseIntegerText(txForm.amount);
    if (amount === null || amount <= 0) {
      setTxError('금액은 0보다 큰 원 단위 정수로 입력하세요.');
      return;
    }
    if (txForm.type === 'transfer') {
      if (!txForm.toAccountId) {
        setTxError('이체할 입금 계좌를 선택하세요.');
        return;
      }
      if (txForm.toAccountId === txForm.accountId) {
        setTxError('출금 계좌와 입금 계좌가 같습니다.');
        return;
      }
    }
    setTxError('');
    const now = new Date().toISOString();
    const next: LedgerTransaction = {
      id: editingTxId ?? createId('tx'),
      date: txForm.date,
      accountId: txForm.accountId,
      type: txForm.type,
      category: txForm.category.trim(),
      amount,
      memo: txForm.memo.trim(),
      toAccountId: txForm.type === 'transfer' ? txForm.toAccountId : null,
      createdAt: editingTxId
        ? (store.data.transactions.find((item) => item.id === editingTxId)?.createdAt ?? now)
        : now,
    };
    store.update(
      (current) => ({
        ...current,
        transactions: editingTxId
          ? current.transactions.map((transaction) =>
              transaction.id === editingTxId ? next : transaction,
            )
          : [...current.transactions, next],
      }),
      editingTxId ? '거래 수정됨' : '거래 저장됨',
    );
    setEditingTxId(null);
    setTxForm({ ...txForm, category: '', amount: '', memo: '', toAccountId: '' });
  }

  function editTransaction(transaction: LedgerTransaction) {
    setEditingTxId(transaction.id);
    setTxError('');
    setTxForm({
      date: transaction.date,
      accountId: transaction.accountId,
      type: transaction.type,
      category: transaction.category,
      amount: String(transaction.amount),
      memo: transaction.memo,
      toAccountId: transaction.toAccountId ?? '',
    });
    document.getElementById('ledger-form-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cancelEdit() {
    setEditingTxId(null);
    setTxError('');
    setTxForm({
      date: today,
      accountId: '',
      type: 'expense',
      category: '',
      amount: '',
      memo: '',
      toAccountId: '',
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'account') {
      const usedByBalance = store.data.balances.some(
        (balance) => balance.accountId === deleteTarget.id,
      );
      const usedByTransaction = store.data.transactions.some(
        (transaction) =>
          transaction.accountId === deleteTarget.id ||
          transaction.toAccountId === deleteTarget.id,
      );
      if (usedByBalance || usedByTransaction) {
        setLedgerError(
          '이 계좌를 참조하는 잔액 기록이나 거래가 있어 삭제할 수 없습니다. 먼저 관련 기록을 정리하세요.',
        );
        setDeleteTarget(null);
        return;
      }
      store.update(
        (current) => ({
          ...current,
          accounts: current.accounts.filter((account) => account.id !== deleteTarget.id),
        }),
        '계좌 삭제됨',
      );
    } else if (deleteTarget.kind === 'balance') {
      store.update(
        (current) => ({
          ...current,
          balances: current.balances.filter((balance) => balance.id !== deleteTarget.id),
        }),
        '잔액 스냅샷 삭제됨',
      );
    } else {
      store.update(
        (current) => ({
          ...current,
          transactions: current.transactions.filter(
            (transaction) => transaction.id !== deleteTarget.id,
          ),
        }),
        '거래 삭제됨',
      );
      if (editingTxId === deleteTarget.id) cancelEdit();
    }
    setDeleteTarget(null);
  }

  const hasAccounts = store.data.accounts.length > 0;

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">수기 기록</p>
          <h1>가계부 테스트</h1>
          <p>
            계좌 잔액 스냅샷과 수입·지출·이체를 직접 기록합니다. 은행 연동, 송금, 금융 CSV
            가져오기, 카드대금 자동 정산은 이번 버전에서 제공하지 않습니다.
          </p>
        </div>
        <div className="actions">
          <button
            type="button"
            className="button secondary"
            aria-pressed={hideAmounts}
            onClick={() => setHideAmounts((current) => !current)}
          >
            {hideAmounts ? '금액 보이기' : '금액 숨기기'}
          </button>
        </div>
      </header>

      <div className="notice-strip">
        <span>
          계좌번호와 금융 인증정보는 입력받지 않습니다. 별칭만 사용하세요. 수기 잔액은 기준일의
          스냅샷이며 거래를 입력해도 자동으로 바뀌지 않습니다.
        </span>
      </div>

      {ledgerError ? (
        <div className="alert alert-error" role="alert">
          <span>{ledgerError}</span>
          <button type="button" className="button small ghost" onClick={() => setLedgerError('')}>
            닫기
          </button>
        </div>
      ) : null}

      <section className="card" aria-labelledby="ledger-summary-title">
        <div className="card-head">
          <div>
            <h2 id="ledger-summary-title">월별 요약</h2>
            <p>이체는 월 수입·지출 합계에서 제외됩니다. 잔액 증감만으로 소비액을 추정하지 않습니다.</p>
          </div>
          <Badge tone="neutral">{formatMonthLabel(month)}</Badge>
        </div>
        <div className="month-bar">
          <FormField label="조회 월" htmlFor="ledger-month">
            <input
              id="ledger-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </FormField>
          <span className="tiny muted">
            이체 {totals.transferCount}건 · 합계에서 제외
          </span>
        </div>
        <div className="stats-grid">
          <div className="stat income">
            <p className="stat-label">월 수입</p>
            <p className="stat-value money-mask">{formatWon(totals.income, hideAmounts)}</p>
          </div>
          <div className="stat expense">
            <p className="stat-label">월 지출</p>
            <p className="stat-value money-mask">{formatWon(totals.expense, hideAmounts)}</p>
          </div>
          <div className="stat">
            <p className="stat-label">수입 - 지출</p>
            <p className="stat-value money-mask">{formatWon(totals.net, hideAmounts)}</p>
          </div>
          <div className="stat">
            <p className="stat-label">기록된 거래</p>
            <p className="stat-value">{monthTransactions.length}건</p>
          </div>
        </div>
      </section>

      <div className="grid-2">
        <section className="card" aria-labelledby="accounts-title">
          <div className="card-head">
            <div>
              <h2 id="accounts-title">계좌 별칭</h2>
              <p>별칭만 저장합니다. 계좌번호·비밀번호·인증번호는 입력하지 마세요.</p>
            </div>
          </div>
          <form className="inline-form" onSubmit={addAccount}>
            <label className="sr-only" htmlFor="account-alias">
              새 계좌 별칭
            </label>
            <input
              id="account-alias"
              type="text"
              value={accountAlias}
              onChange={(event) => setAccountAlias(event.target.value)}
              placeholder="예: 생활비 통장"
              maxLength={50}
            />
            <button type="submit" className="button primary">
              계좌 추가
            </button>
          </form>
          {accountError ? (
            <p className="field-error" role="alert">
              {accountError}
            </p>
          ) : null}

          {!hasAccounts ? (
            <EmptyState title="아직 계좌 별칭이 없습니다.">
              위 입력란에 별칭을 추가하면 잔액과 거래를 기록할 수 있습니다.
            </EmptyState>
          ) : (
            <ul className="plain-list" style={{ marginTop: 12 }}>
              {store.data.accounts.map((account) => (
                <li
                  key={account.id}
                  className="row-between"
                  style={{ borderBottom: '1px solid var(--line)', minHeight: 46 }}
                >
                  <span className="strong">{account.alias}</span>
                  <button
                    type="button"
                    className="button text"
                    style={{ color: 'var(--red)' }}
                    onClick={() =>
                      setDeleteTarget({ kind: 'account', id: account.id, label: account.alias })
                    }
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="balance-title">
          <div className="card-head">
            <div>
              <h2 id="balance-title">수기 잔액 스냅샷</h2>
              <p>기준일의 잔액을 그대로 기록합니다. 이후 거래 입력으로 자동 변경되지 않습니다.</p>
            </div>
          </div>
          {!hasAccounts ? (
            <EmptyState title="계좌를 먼저 추가하세요.">
              왼쪽 계좌 별칭 입력란에서 계좌를 추가하면 잔액을 기록할 수 있습니다.
            </EmptyState>
          ) : (
            <form className="stack-sm" onSubmit={addBalance}>
              <div className="form-grid">
                <FormField label="계좌" htmlFor="balance-account">
                  <select
                    id="balance-account"
                    value={balanceForm.accountId}
                    onChange={(event) =>
                      setBalanceForm({ ...balanceForm, accountId: event.target.value })
                    }
                  >
                    <option value="">계좌 선택</option>
                    {store.data.accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.alias}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="잔액 기준일" htmlFor="balance-date">
                  <input
                    id="balance-date"
                    type="date"
                    value={balanceForm.date}
                    onChange={(event) =>
                      setBalanceForm({ ...balanceForm, date: event.target.value })
                    }
                  />
                </FormField>
                <FormField label="잔액(원)" htmlFor="balance-amount" hint="원 단위 정수, 음수도 입력 가능">
                  <input
                    id="balance-amount"
                    type="text"
                    inputMode="numeric"
                    value={balanceForm.balance}
                    onChange={(event) =>
                      setBalanceForm({ ...balanceForm, balance: event.target.value })
                    }
                    placeholder="예: 1250000"
                  />
                </FormField>
                <FormField label="메모" htmlFor="balance-note">
                  <input
                    id="balance-note"
                    type="text"
                    value={balanceForm.note}
                    onChange={(event) =>
                      setBalanceForm({ ...balanceForm, note: event.target.value })
                    }
                    maxLength={200}
                  />
                </FormField>
              </div>
              {balanceError ? (
                <p className="field-error" role="alert">
                  {balanceError}
                </p>
              ) : null}
              <div className="row-between">
                <span className="tiny muted">거래와 별도로 저장되는 기준일 스냅샷입니다.</span>
                <button type="submit" className="button primary">
                  잔액 기록
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      <section className="card" aria-labelledby="current-balance-title">
        <div className="card-head">
          <div>
            <h2 id="current-balance-title">계좌별 최근 수기 잔액</h2>
            <p>각 계좌의 기준일이 가장 최근인 스냅샷입니다.</p>
          </div>
        </div>
        {!hasAccounts ? (
          <p className="muted small">계좌를 추가하면 최근 잔액이 표시됩니다.</p>
        ) : (
          <div className="account-balances">
            {store.data.accounts.map((account) => {
              const latest = latestBalances.get(account.id);
              return (
                <div className="balance-card" key={account.id}>
                  <p className="balance-alias">{account.alias}</p>
                  <p className="balance-value money-mask">
                    {latest ? formatWon(latest.balance, hideAmounts) : '잔액 기록 없음'}
                  </p>
                  <p className="balance-date">
                    {latest ? `기준일 ${shortDate(latest.date)}` : '잔액 스냅샷을 추가하세요.'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        {recentSnapshots.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            <p className="small strong" style={{ marginBottom: 6 }}>최근 잔액 기록</p>
            <ul className="plain-list">
              {recentSnapshots.map((snapshot) => (
                <li
                  className="row-between"
                  key={snapshot.id}
                  style={{ borderBottom: '1px solid var(--line)', padding: '7px 0' }}
                >
                  <span className="small">
                    {accountName(snapshot.accountId)} · {shortDate(snapshot.date)} ·{' '}
                    <strong className="money-mask">{formatWon(snapshot.balance, hideAmounts)}</strong>
                    {snapshot.note ? <span className="muted"> · {snapshot.note}</span> : null}
                  </span>
                  <button
                    type="button"
                    className="button text"
                    style={{ color: 'var(--red)' }}
                    onClick={() =>
                      setDeleteTarget({
                        kind: 'balance',
                        id: snapshot.id,
                        label: `${accountName(snapshot.accountId)} ${shortDate(snapshot.date)} 잔액`,
                      })
                    }
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="card" aria-labelledby="ledger-form-title">
        <div className="card-head">
          <div>
            <h2 id="ledger-form-title">{editingTxId ? '거래 수정' : '거래 입력'}</h2>
            <p>수입·지출은 월 합계에 포함되고 이체는 제외됩니다. 금액은 원 단위 정수입니다.</p>
          </div>
          {editingTxId ? (
            <button type="button" className="button small ghost" onClick={cancelEdit}>
              수정 취소
            </button>
          ) : null}
        </div>
        {!hasAccounts ? (
          <EmptyState title="거래를 입력하려면 계좌가 필요합니다.">
            위의 계좌 별칭 입력란에서 계좌를 먼저 추가하세요.
          </EmptyState>
        ) : (
          <form className="stack" onSubmit={submitTransaction}>
            <div className="ledger-form-grid">
              <FormField label="날짜" htmlFor="tx-date">
                <input
                  id="tx-date"
                  type="date"
                  value={txForm.date}
                  onChange={(event) => setTxForm({ ...txForm, date: event.target.value })}
                />
              </FormField>
              <FormField label="유형" htmlFor="tx-type">
                <select
                  id="tx-type"
                  value={txForm.type}
                  onChange={(event) => {
                    const type = event.target.value as TransactionType;
                    setTxForm({
                      ...txForm,
                      type,
                      toAccountId: type === 'transfer' ? txForm.toAccountId : '',
                    });
                  }}
                >
                  {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                label={txForm.type === 'transfer' ? '출금 계좌' : '계좌'}
                htmlFor="tx-account"
              >
                <select
                  id="tx-account"
                  value={txForm.accountId}
                  onChange={(event) => setTxForm({ ...txForm, accountId: event.target.value })}
                >
                  <option value="">계좌 선택</option>
                  {store.data.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.alias}
                    </option>
                  ))}
                </select>
              </FormField>
              {txForm.type === 'transfer' ? (
                <FormField label="입금 계좌" htmlFor="tx-to-account">
                  <select
                    id="tx-to-account"
                    value={txForm.toAccountId}
                    onChange={(event) =>
                      setTxForm({ ...txForm, toAccountId: event.target.value })
                    }
                  >
                    <option value="">계좌 선택</option>
                    {store.data.accounts
                      .filter((account) => account.id !== txForm.accountId)
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.alias}
                        </option>
                      ))}
                  </select>
                </FormField>
              ) : null}
              <FormField label="분류" htmlFor="tx-category" hint="예: 식비, 교통, 급여">
                <input
                  id="tx-category"
                  type="text"
                  value={txForm.category}
                  onChange={(event) => setTxForm({ ...txForm, category: event.target.value })}
                  maxLength={60}
                />
              </FormField>
              <FormField label="금액(원)" htmlFor="tx-amount" hint="0보다 큰 원 단위 정수">
                <input
                  id="tx-amount"
                  type="text"
                  inputMode="numeric"
                  value={txForm.amount}
                  onChange={(event) => setTxForm({ ...txForm, amount: event.target.value })}
                  placeholder="예: 30000"
                />
              </FormField>
              <FormField label="메모" htmlFor="tx-memo" className="span-2">
                <input
                  id="tx-memo"
                  type="text"
                  value={txForm.memo}
                  onChange={(event) => setTxForm({ ...txForm, memo: event.target.value })}
                  maxLength={300}
                />
              </FormField>
            </div>
            {txError ? (
              <p className="field-error" role="alert">
                {txError}
              </p>
            ) : null}
            <div className="row-between">
              <span className="tiny muted">
                계좌 잔액 스냅샷은 거래 저장과 무관하게 유지됩니다.
              </span>
              <button type="submit" className="button primary">
                {editingTxId ? '수정 저장' : '거래 저장'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="card" aria-labelledby="transactions-title">
        <div className="card-head">
          <div>
            <h2 id="transactions-title">{formatMonthLabel(month)} 거래</h2>
            <p>
              수입 {formatWon(totals.income, hideAmounts)} · 지출{' '}
              {formatWon(totals.expense, hideAmounts)} · 이체 {totals.transferCount}건 제외
            </p>
          </div>
          <Badge tone="neutral">{monthTransactions.length}건</Badge>
        </div>
        {monthTransactions.length === 0 ? (
          <EmptyState title="이 달에 기록된 거래가 없습니다.">
            위 거래 입력란에서 수입·지출·이체를 추가하거나 다른 달을 선택하세요.
          </EmptyState>
        ) : (
          <div className="table-scroll">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>유형</th>
                  <th>계좌</th>
                  <th>분류</th>
                  <th>메모</th>
                  <th style={{ textAlign: 'right' }}>금액</th>
                  <th aria-label="작업" />
                </tr>
              </thead>
              <tbody>
                {monthTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="nowrap">{shortDate(transaction.date)}</td>
                    <td>
                      <Badge
                        tone={
                          transaction.type === 'income'
                            ? 'green'
                            : transaction.type === 'expense'
                              ? 'red'
                              : 'blue'
                        }
                      >
                        {TRANSACTION_TYPE_LABELS[transaction.type]}
                      </Badge>
                    </td>
                    <td>
                      {transaction.type === 'transfer'
                        ? `${accountName(transaction.accountId)} → ${accountName(transaction.toAccountId)}`
                        : accountName(transaction.accountId)}
                    </td>
                    <td>{transaction.category || '-'}</td>
                    <td className="memo-cell">{transaction.memo || '-'}</td>
                    <td className={`amount ${transaction.type}`}>
                      {transaction.type === 'expense' ? '-' : transaction.type === 'income' ? '+' : ''}
                      {formatWon(transaction.amount, hideAmounts)}
                    </td>
                    <td className="actions-cell">
                      <button
                        type="button"
                        className="button text"
                        onClick={() => editTransaction(transaction)}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="button text"
                        style={{ color: 'var(--red)' }}
                        onClick={() =>
                          setDeleteTarget({
                            kind: 'transaction',
                            id: transaction.id,
                            label: `${shortDate(transaction.date)} ${TRANSACTION_TYPE_LABELS[transaction.type]} ${formatWon(transaction.amount, false)}`,
                          })
                        }
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="hint-box">
        <strong>이번 버전에서 제외한 기능:</strong> 은행 자동 연동과 송금, 금융 CSV 가져오기,
        카드대금 자동 정산, 은퇴 현금흐름 계산. 이체 시 출금·입금 계좌를 구분해 표시하지만
        월 수입·지출 합계에는 포함하지 않습니다.
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="삭제할까요?"
        description="삭제한 기록은 되돌릴 수 없습니다. 필요하면 먼저 가계부 백업을 내려받으세요."
        confirmLabel="삭제"
        tone="danger"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      >
        {deleteTarget ? <p><strong>{deleteTarget.label}</strong></p> : null}
      </ConfirmDialog>
    </div>
  );
}
