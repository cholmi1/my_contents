import type { HubData } from '../types/hub';
import type { LedgerData } from '../types/ledger';
import { addDays, kstToday } from '../lib/date';
import { createId } from '../lib/id';

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

// Fictional examples only. Generate fresh IDs so samples can also be appended.
export function createSampleHub(today = kstToday()): HubData {
  const createdAt = `${today}T00:00:00.000Z`;
  return {
    ...createEmptyHub(),
    schedules: [{
      id: createId('schedule'), title: '가상 독서 모임', date: today,
      startTime: '19:00', endTime: '20:00', note: '테스트용 가상 일정', isDemo: true,
    }],
    checklist: [{
      id: createId('check'), title: '오늘 일정 확인', date: today,
      done: false, createdAt, isDemo: true,
    }],
    memos: [{
      id: createId('memo'), kind: 'memo', title: '가상 아이디어 노트',
      body: '떠오른 생각을 여기에 기록해 보세요.', createdAt, updatedAt: createdAt,
      dueDate: null, priority: null, completed: false, completedAt: null, isDemo: true,
    }],
    routines: [{
      id: createId('routine'), title: '물 2L 마시기', cycle: 'daily', weekday: null,
      dayOfMonth: null, time: null, status: 'current', enabled: true,
      completions: {}, note: '테스트용 가상 반복 업무', createdAt, isDemo: true,
    }, {
      id: createId('routine'), title: '요가 수업 듣기', cycle: 'weekly', weekday: null,
      dayOfMonth: null, time: null, status: 'upcoming', enabled: true,
      completions: {}, note: '요일을 설정해 보세요.', createdAt, isDemo: true,
    }],
    apps: [{
      id: createId('app'), name: '생활 위키', purpose: '생활 정보 정리', service: 'Notion',
      url: 'https://example.com/life-wiki', editUrl: '', category: 'external',
      status: 'active', monthlyCost: 11000, renewalDay: 15, lastModified: today,
      note: '테스트용 가상 앱', tags: ['정리'], createdAt, updatedAt: createdAt, isDemo: true,
    }],
    sns: [{
      id: createId('sns'), platform: '블로그', channelName: '가상 독서 노트',
      url: 'https://example.com/blog/reading', status: 'paused', lastPosted: today,
      note: '테스트용 가상 채널', createdAt, updatedAt: createdAt, isDemo: true,
    }],
  };
}

export function createSampleLedgerAddition(today = kstToday()): LedgerData {
  const createdAt = `${today}T00:00:00.000Z`;
  const accountId = createId('account');
  return {
    ...createEmptyLedger(),
    accounts: [{ id: accountId, alias: '가상 저축 통장', createdAt }],
    balances: [{
      id: createId('balance'), accountId, date: today, balance: 100000,
      note: '테스트용 가상 잔액', createdAt,
    }],
    transactions: [{
      id: createId('transaction'), accountId, date: today, type: 'income',
      category: '가상 수입', amount: 10000, memo: '테스트용 가상 거래',
      toAccountId: null, createdAt,
    }],
  };
}

export function createSampleLedger(today = kstToday()): LedgerData {
  const createdAt = `${today}T00:00:00.000Z`;
  const accounts = ['생활비 통장', '비상금 통장'].map((alias) => ({
    id: createId('account'), alias, createdAt,
  }));
  return {
    ...createEmptyLedger(),
    accounts,
    balances: accounts.map((account, index) => ({
      id: createId('balance'), accountId: account.id, date: today,
      balance: index === 0 ? 1250000 : 3000000, note: '테스트용 가상 잔액', createdAt,
    })),
    transactions: [{
      id: createId('transaction'), accountId: accounts[0].id,
      date: addDays(`${today.slice(0, 7)}-01`, -1), type: 'expense',
      category: '가상 생활비', amount: 5000, memo: '지난달 테스트용 가상 거래',
      toAccountId: null, createdAt,
    }],
  };
}
