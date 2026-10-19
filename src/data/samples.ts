import type { HubData } from '../types/hub';
import type { LedgerData } from '../types/ledger';
import { addDays, kstToday } from '../lib/date';
import { createId } from '../lib/id';

// All examples are fictional. Each call returns fresh records and unique IDs so
// the Settings page can append samples without colliding with existing records.
export function createEmptyHub(): HubData {
  return {
    schemaVersion: 1,
    meta: { lastBackupAt: null },
    schedules: [], checklist: [], memos: [], routines: [], apps: [], sns: [],
  };
}

export function createEmptyLedger(): LedgerData {
  return {
    schemaVersion: 1,
    meta: { lastBackupAt: null },
    accounts: [], balances: [], transactions: [],
  };
}

export function createSampleHub(today = kstToday()): HubData {
  const createdAt = `${today}T00:00:00.000Z`;
  return {
    ...createEmptyHub(),
    schedules: [{
      id: createId('schedule'), title: '산책하기', date: today,
      startTime: '18:00', endTime: '18:30', note: '가상 일정 예시', isDemo: true,
    }],
    checklist: [{
      id: createId('checklist'), title: '오늘 계획 확인', date: today,
      done: false, createdAt, isDemo: true,
    }],
    memos: [{
      id: createId('memo'), kind: 'memo', title: '가상 메모', body: '생각을 자유롭게 기록하세요.',
      createdAt, updatedAt: createdAt, dueDate: null, priority: null,
      completed: false, completedAt: null, isDemo: true,
    }],
    routines: [
      {
        id: createId('routine'), title: '물 2L 마시기', cycle: 'daily',
        weekday: null, dayOfMonth: null, time: null, status: 'current',
        enabled: true, completions: {}, note: '가상 반복 업무', createdAt, isDemo: true,
      },
      {
        id: createId('routine'), title: '요가 수업 듣기', cycle: 'weekly',
        weekday: null, dayOfMonth: null, time: null, status: 'upcoming',
        enabled: true, completions: {}, note: '수업 요일을 설정하세요.', createdAt, isDemo: true,
      },
    ],
    apps: [{
      id: createId('app'), name: '생활 위키', purpose: '생활 정보 정리', service: 'Notion',
      url: 'https://example.com/life-wiki', editUrl: '', category: 'external', status: 'active',
      monthlyCost: 11000, renewalDay: 15, lastModified: today, note: '가상 앱 예시',
      tags: ['정리'], createdAt, updatedAt: createdAt, isDemo: true,
    }],
    sns: [{
      id: createId('sns'), platform: '블로그', channelName: '가상 독서 노트',
      url: 'https://example.com/blog/reading', status: 'paused', lastPosted: null,
      note: '가상 채널 예시', createdAt, updatedAt: createdAt, isDemo: true,
    }],
  };
}

export function createSampleLedger(today = kstToday()): LedgerData {
  const createdAt = `${today}T00:00:00.000Z`;
  const accountId = createId('account');
  const savingsId = createId('account');
  const previousMonthEnd = addDays(`${today.slice(0, 7)}-01`, -1);
  return {
    ...createEmptyLedger(),
    accounts: [
      { id: accountId, alias: '생활비 통장', createdAt },
      { id: savingsId, alias: '비상금 통장', createdAt },
    ],
    balances: [
      { id: createId('balance'), accountId, date: today, balance: 1250000, note: '가상 잔액', createdAt },
      { id: createId('balance'), accountId: savingsId, date: today, balance: 3000000, note: '가상 잔액', createdAt },
    ],
    transactions: [{
      id: createId('transaction'), date: previousMonthEnd, accountId, type: 'expense',
      category: '식비', amount: 12000, memo: '가상 거래 예시', toAccountId: null, createdAt,
    }],
  };
}

export function createSampleLedgerAddition(today = kstToday()): LedgerData {
  const sample = createSampleLedger(today);
  return {
    ...sample,
    accounts: sample.accounts.slice(0, 1),
    balances: sample.balances.slice(0, 1),
  };
}
