import { describe, expect, it } from 'vitest';
import { createSampleHub, createSampleLedger } from '../data/samples';
import { createBackupEnvelope, parseHubBackup, parseLedgerBackup } from './backup';
import { validateHub, validateLedger } from './validation';

describe('백업 형식 검증', () => {
  it('허브 백업을 내보내고 다시 가져올 수 있다', () => {
    const data = createSampleHub('2026-10-19');
    const text = JSON.stringify(createBackupEnvelope('hub', data, '2026-10-19T00:00:00.000Z'));
    const result = parseHubBackup(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.schemaVersion).toBe(1);
    expect(result.data.memos).toHaveLength(data.memos.length);
    expect(result.data.routines).toHaveLength(data.routines.length);
  });

  it('가계부 백업을 내보내고 다시 가져올 수 있다', () => {
    const data = createSampleLedger('2026-10-19');
    const text = JSON.stringify(
      createBackupEnvelope('ledger', data, '2026-10-19T00:00:00.000Z'),
    );
    const result = parseLedgerBackup(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.accounts).toHaveLength(2);
    expect(result.data.balances).toHaveLength(2);
  });

  it('JSON이 아니면 오류를 반환한다', () => {
    const result = parseHubBackup('{not json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('JSON');
  });

  it('다른 영역의 백업 파일을 거부한다', () => {
    const text = JSON.stringify(
      createBackupEnvelope('ledger', createSampleLedger('2026-10-19')),
    );
    const result = parseHubBackup(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('가계부');
  });

  it('지원하지 않는 schemaVersion을 거부한다', () => {
    const envelope = createBackupEnvelope('hub', createSampleHub('2026-10-19'));
    const broken = { ...envelope, schemaVersion: 99 };
    const result = parseHubBackup(JSON.stringify(broken));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('schemaVersion');
  });

  it('필수 배열이 빠지면 허브 검증에 실패한다', () => {
    const data = createSampleHub('2026-10-19') as unknown as Record<string, unknown>;
    delete data.memos;
    const result = validateHub(data);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('memos');
  });

  it('잘못된 URL이 든 허브 데이터를 거부한다', () => {
    const data = createSampleHub('2026-10-19');
    data.apps[0].url = 'javascript:alert(1)';
    const result = validateHub(data);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('http');
  });

  it('존재하지 않는 계좌를 가리키는 거래를 거부한다', () => {
    const data = createSampleLedger('2026-10-19');
    data.transactions[0].accountId = 'missing-account';
    const result = validateLedger(data);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('존재하지 않는 계좌');
  });

  it('이체 입금 계좌가 출금 계좌와 같으면 거부한다', () => {
    const data = createSampleLedger('2026-10-19');
    data.transactions.push({
      id: 'transfer-1',
      date: '2026-10-19',
      accountId: data.accounts[0].id,
      type: 'transfer',
      category: '이체',
      amount: 10000,
      memo: '',
      toAccountId: data.accounts[0].id,
      createdAt: '2026-10-19T00:00:00.000Z',
    });
    const result = validateLedger(data);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('같습니다');
  });
});
