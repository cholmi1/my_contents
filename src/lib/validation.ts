import type {
  AppCategory,
  AppItem,
  AppStatus,
  ChecklistItem,
  HubData,
  HubMeta,
  MemoItem,
  Priority,
  RoutineItem,
  ScheduleItem,
  SnsItem,
  SnsStatus,
} from '../types/hub';
import type {
  BalanceSnapshot,
  LedgerAccount,
  LedgerData,
  LedgerMeta,
  LedgerTransaction,
  TransactionType,
} from '../types/ledger';
import { isISODate } from './date';

export type ValidationResult<T> =
  | { ok: true; data: T; warnings: string[] }
  | { ok: false; errors: string[] };

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function isDateTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function isTime(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value));
}

function isHttpUrl(value: string): boolean {
  if (value === '') return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function fail(errors: string[], path: string, message: string): void {
  if (errors.length < 30) errors.push(`${path}: ${message}`);
}

function readMeta(value: unknown, errors: string[], path: string): HubMeta {
  if (!isRecord(value)) {
    fail(errors, path, '메타 정보가 올바르지 않습니다.');
    return { lastBackupAt: null };
  }
  if (!(value.lastBackupAt === null || isDateTime(value.lastBackupAt))) {
    fail(errors, `${path}.lastBackupAt`, '날짜 형식이 올바르지 않습니다.');
  }
  return {
    lastBackupAt: value.lastBackupAt === null ? null : (value.lastBackupAt as string),
  };
}

function readLedgerMeta(value: unknown, errors: string[], path: string): LedgerMeta {
  if (!isRecord(value)) {
    fail(errors, path, '메타 정보가 올바르지 않습니다.');
    return { lastBackupAt: null };
  }
  if (!(value.lastBackupAt === null || isDateTime(value.lastBackupAt))) {
    fail(errors, `${path}.lastBackupAt`, '날짜 형식이 올바르지 않습니다.');
  }
  return {
    lastBackupAt: value.lastBackupAt === null ? null : (value.lastBackupAt as string),
  };
}

function readSchedule(value: unknown, index: number, errors: string[]): ScheduleItem | null {
  const path = `일정[${index}]`;
  if (!isRecord(value)) {
    fail(errors, path, '객체가 아닙니다.');
    return null;
  }
  if (!isString(value.id) || value.id === '') fail(errors, `${path}.id`, '필수 값이 없습니다.');
  if (!isString(value.title)) fail(errors, `${path}.title`, '제목이 필요합니다.');
  if (!isString(value.date) || !isISODate(value.date)) {
    fail(errors, `${path}.date`, '날짜는 YYYY-MM-DD 형식이어야 합니다.');
  }
  if (!isTime(value.startTime)) fail(errors, `${path}.startTime`, '시각 형식이 올바르지 않습니다.');
  if (!isTime(value.endTime)) fail(errors, `${path}.endTime`, '시각 형식이 올바르지 않습니다.');
  if (!isString(value.note)) fail(errors, `${path}.note`, '메모가 문자열이어야 합니다.');
  if (typeof value.isDemo !== 'boolean') fail(errors, `${path}.isDemo`, '불리언이어야 합니다.');
  return {
    id: value.id as string,
    title: value.title as string,
    date: value.date as string,
    startTime: (value.startTime as string | null) ?? null,
    endTime: (value.endTime as string | null) ?? null,
    note: (value.note as string) ?? '',
    isDemo: Boolean(value.isDemo),
  };
}

function readChecklist(value: unknown, index: number, errors: string[]): ChecklistItem | null {
  const path = `체크리스트[${index}]`;
  if (!isRecord(value)) {
    fail(errors, path, '객체가 아닙니다.');
    return null;
  }
  if (!isString(value.id) || value.id === '') fail(errors, `${path}.id`, '필수 값이 없습니다.');
  if (!isString(value.title)) fail(errors, `${path}.title`, '제목이 필요합니다.');
  if (!isString(value.date) || !isISODate(value.date)) {
    fail(errors, `${path}.date`, '날짜 형식이 올바르지 않습니다.');
  }
  if (!isBoolean(value.done)) fail(errors, `${path}.done`, '완료 여부가 불리언이어야 합니다.');
  if (!isDateTime(value.createdAt)) fail(errors, `${path}.createdAt`, '생성 시각이 올바르지 않습니다.');
  return {
    id: value.id as string,
    title: value.title as string,
    date: value.date as string,
    done: Boolean(value.done),
    createdAt: value.createdAt as string,
    isDemo: Boolean(value.isDemo),
  };
}

function readMemo(value: unknown, index: number, errors: string[]): MemoItem | null {
  const path = `메모[${index}]`;
  if (!isRecord(value)) {
    fail(errors, path, '객체가 아닙니다.');
    return null;
  }
  if (!isString(value.id) || value.id === '') fail(errors, `${path}.id`, '필수 값이 없습니다.');
  if (value.kind !== 'memo' && value.kind !== 'todo') fail(errors, `${path}.kind`, '종류가 올바르지 않습니다.');
  if (!isString(value.title)) fail(errors, `${path}.title`, '제목이 필요합니다.');
  if (!isString(value.body)) fail(errors, `${path}.body`, '본문이 문자열이어야 합니다.');
  if (!isDateTime(value.createdAt)) fail(errors, `${path}.createdAt`, '생성 시각이 올바르지 않습니다.');
  if (!isDateTime(value.updatedAt)) fail(errors, `${path}.updatedAt`, '수정 시각이 올바르지 않습니다.');
  if (!(value.dueDate === null || (isString(value.dueDate) && isISODate(value.dueDate)))) {
    fail(errors, `${path}.dueDate`, '기한 날짜가 올바르지 않습니다.');
  }
  if (
    !(
      value.priority === null ||
      value.priority === 'low' ||
      value.priority === 'normal' ||
      value.priority === 'high'
    )
  ) {
    fail(errors, `${path}.priority`, '우선순위가 올바르지 않습니다.');
  }
  if (!isBoolean(value.completed)) fail(errors, `${path}.completed`, '완료 여부가 불리언이어야 합니다.');
  if (!(value.completedAt === null || isDateTime(value.completedAt))) {
    fail(errors, `${path}.completedAt`, '완료 시각이 올바르지 않습니다.');
  }
  return {
    id: value.id as string,
    kind: value.kind as 'memo' | 'todo',
    title: value.title as string,
    body: value.body as string,
    createdAt: value.createdAt as string,
    updatedAt: value.updatedAt as string,
    dueDate: (value.dueDate as string | null) ?? null,
    priority: (value.priority as Priority | null) ?? null,
    completed: Boolean(value.completed),
    completedAt: (value.completedAt as string | null) ?? null,
    isDemo: Boolean(value.isDemo),
  };
}

function readRoutine(value: unknown, index: number, errors: string[]): RoutineItem | null {
  const path = `반복 업무[${index}]`;
  if (!isRecord(value)) {
    fail(errors, path, '객체가 아닙니다.');
    return null;
  }
  if (!isString(value.id) || value.id === '') fail(errors, `${path}.id`, '필수 값이 없습니다.');
  if (!isString(value.title)) fail(errors, `${path}.title`, '제목이 필요합니다.');
  if (value.cycle !== 'daily' && value.cycle !== 'weekly' && value.cycle !== 'monthly') {
    fail(errors, `${path}.cycle`, '반복 주기가 올바르지 않습니다.');
  }
  if (!(value.weekday === null || (isInteger(value.weekday) && value.weekday >= 0 && value.weekday <= 6))) {
    fail(errors, `${path}.weekday`, '요일이 올바르지 않습니다.');
  }
  if (!(value.dayOfMonth === null || (isInteger(value.dayOfMonth) && value.dayOfMonth >= 1 && value.dayOfMonth <= 31))) {
    fail(errors, `${path}.dayOfMonth`, '날짜가 올바르지 않습니다.');
  }
  if (!isTime(value.time)) fail(errors, `${path}.time`, '시각이 올바르지 않습니다.');
  if (value.status !== 'current' && value.status !== 'upcoming') {
    fail(errors, `${path}.status`, '진행 상태가 올바르지 않습니다.');
  }
  if (!isBoolean(value.enabled)) fail(errors, `${path}.enabled`, '활성 여부가 불리언이어야 합니다.');
  const completions: Record<string, true> = {};
  if (!isRecord(value.completions)) {
    fail(errors, `${path}.completions`, '회차 완료 정보가 객체여야 합니다.');
  } else {
    Object.entries(value.completions).forEach(([date, done]) => {
      if (!isISODate(date) || done !== true) {
        fail(errors, `${path}.completions`, '회차 완료 정보에 잘못된 값이 있습니다.');
      } else {
        completions[date] = true;
      }
    });
  }
  if (!isString(value.note)) fail(errors, `${path}.note`, '메모가 문자열이어야 합니다.');
  if (!isDateTime(value.createdAt)) fail(errors, `${path}.createdAt`, '생성 시각이 올바르지 않습니다.');
  return {
    id: value.id as string,
    title: value.title as string,
    cycle: value.cycle as RoutineItem['cycle'],
    weekday: (value.weekday as number | null) ?? null,
    dayOfMonth: (value.dayOfMonth as number | null) ?? null,
    time: (value.time as string | null) ?? null,
    status: value.status as RoutineItem['status'],
    enabled: Boolean(value.enabled),
    completions,
    note: (value.note as string) ?? '',
    createdAt: value.createdAt as string,
    isDemo: Boolean(value.isDemo),
  };
}

const APP_CATEGORIES: AppCategory[] = ['mine', 'shared', 'external', 'review'];
const APP_STATUSES: AppStatus[] = ['active', 'archived', 'stopped'];
const SNS_STATUSES: SnsStatus[] = ['active', 'paused', 'closed'];

function readApp(value: unknown, index: number, errors: string[]): AppItem | null {
  const path = `앱[${index}]`;
  if (!isRecord(value)) {
    fail(errors, path, '객체가 아닙니다.');
    return null;
  }
  if (!isString(value.id) || value.id === '') fail(errors, `${path}.id`, '필수 값이 없습니다.');
  if (!isString(value.name) || value.name.trim() === '') {
    fail(errors, `${path}.name`, '이름이 필요합니다.');
  }
  ['purpose', 'service', 'url', 'editUrl', 'note'].forEach((key) => {
    if (!isString(value[key])) fail(errors, `${path}.${key}`, '문자열이어야 합니다.');
  });
  if (isString(value.url) && !isHttpUrl(value.url)) {
    fail(errors, `${path}.url`, 'http 또는 https 주소만 허용합니다.');
  }
  if (isString(value.editUrl) && !isHttpUrl(value.editUrl)) {
    fail(errors, `${path}.editUrl`, 'http 또는 https 주소만 허용합니다.');
  }
  if (!APP_CATEGORIES.includes(value.category as AppCategory)) {
    fail(errors, `${path}.category`, '구분이 올바르지 않습니다.');
  }
  if (!APP_STATUSES.includes(value.status as AppStatus)) {
    fail(errors, `${path}.status`, '상태가 올바르지 않습니다.');
  }
  if (!(value.monthlyCost === null || (isInteger(value.monthlyCost) && value.monthlyCost >= 0))) {
    fail(errors, `${path}.monthlyCost`, '월 비용은 0 이상의 정수여야 합니다.');
  }
  if (!(value.renewalDay === null || (isInteger(value.renewalDay) && value.renewalDay >= 1 && value.renewalDay <= 31))) {
    fail(errors, `${path}.renewalDay`, '갱신일은 1~31 사이여야 합니다.');
  }
  if (!(value.lastModified === null || (isString(value.lastModified) && isISODate(value.lastModified)))) {
    fail(errors, `${path}.lastModified`, '최근 수정일이 올바르지 않습니다.');
  }
  if (!Array.isArray(value.tags) || value.tags.some((tag) => typeof tag !== 'string')) {
    fail(errors, `${path}.tags`, '태그는 문자열 배열이어야 합니다.');
  }
  if (!isDateTime(value.createdAt)) fail(errors, `${path}.createdAt`, '생성 시각이 올바르지 않습니다.');
  if (!isDateTime(value.updatedAt)) fail(errors, `${path}.updatedAt`, '수정 시각이 올바르지 않습니다.');
  return {
    id: value.id as string,
    name: value.name as string,
    purpose: (value.purpose as string) ?? '',
    service: (value.service as string) ?? '',
    url: (value.url as string) ?? '',
    editUrl: (value.editUrl as string) ?? '',
    category: value.category as AppCategory,
    status: value.status as AppStatus,
    monthlyCost: (value.monthlyCost as number | null) ?? null,
    renewalDay: (value.renewalDay as number | null) ?? null,
    lastModified: (value.lastModified as string | null) ?? null,
    note: (value.note as string) ?? '',
    tags: Array.isArray(value.tags) ? (value.tags as string[]) : [],
    createdAt: value.createdAt as string,
    updatedAt: value.updatedAt as string,
    isDemo: Boolean(value.isDemo),
  };
}

function readSns(value: unknown, index: number, errors: string[]): SnsItem | null {
  const path = `SNS[${index}]`;
  if (!isRecord(value)) {
    fail(errors, path, '객체가 아닙니다.');
    return null;
  }
  if (!isString(value.id) || value.id === '') fail(errors, `${path}.id`, '필수 값이 없습니다.');
  if (!isString(value.platform)) fail(errors, `${path}.platform`, '플랫폼이 필요합니다.');
  if (!isString(value.channelName)) fail(errors, `${path}.channelName`, '채널명이 필요합니다.');
  if (!isString(value.url)) fail(errors, `${path}.url`, '주소가 문자열이어야 합니다.');
  if (isString(value.url) && !isHttpUrl(value.url)) {
    fail(errors, `${path}.url`, 'http 또는 https 주소만 허용합니다.');
  }
  if (!SNS_STATUSES.includes(value.status as SnsStatus)) {
    fail(errors, `${path}.status`, '상태가 올바르지 않습니다.');
  }
  if (!(value.lastPosted === null || (isString(value.lastPosted) && isISODate(value.lastPosted)))) {
    fail(errors, `${path}.lastPosted`, '최근 게시일이 올바르지 않습니다.');
  }
  if (!isString(value.note)) fail(errors, `${path}.note`, '메모가 문자열이어야 합니다.');
  if (!isDateTime(value.createdAt)) fail(errors, `${path}.createdAt`, '생성 시각이 올바르지 않습니다.');
  if (!isDateTime(value.updatedAt)) fail(errors, `${path}.updatedAt`, '수정 시각이 올바르지 않습니다.');
  return {
    id: value.id as string,
    platform: value.platform as string,
    channelName: value.channelName as string,
    url: value.url as string,
    status: value.status as SnsStatus,
    lastPosted: (value.lastPosted as string | null) ?? null,
    note: (value.note as string) ?? '',
    createdAt: value.createdAt as string,
    updatedAt: value.updatedAt as string,
    isDemo: Boolean(value.isDemo),
  };
}

export function validateHub(input: unknown): ValidationResult<HubData> {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ['데이터가 객체가 아닙니다.'] };
  if (input.schemaVersion !== 1) errors.push('지원하지 않는 hub schemaVersion입니다. (1만 지원)');
  const meta = readMeta(input.meta, errors, 'meta');
  const arrays: Record<string, unknown> = {
    schedules: input.schedules,
    checklist: input.checklist,
    memos: input.memos,
    routines: input.routines,
    apps: input.apps,
    sns: input.sns,
  };
  Object.entries(arrays).forEach(([key, value]) => {
    if (!Array.isArray(value)) errors.push(`${key}: 배열이 아닙니다.`);
  });
  if (errors.length > 0) return { ok: false, errors };

  const schedules = (input.schedules as unknown[])
    .map((item, index) => readSchedule(item, index, errors))
    .filter((item): item is ScheduleItem => item !== null);
  const checklist = (input.checklist as unknown[])
    .map((item, index) => readChecklist(item, index, errors))
    .filter((item): item is ChecklistItem => item !== null);
  const memos = (input.memos as unknown[])
    .map((item, index) => readMemo(item, index, errors))
    .filter((item): item is MemoItem => item !== null);
  const routines = (input.routines as unknown[])
    .map((item, index) => readRoutine(item, index, errors))
    .filter((item): item is RoutineItem => item !== null);
  const apps = (input.apps as unknown[])
    .map((item, index) => readApp(item, index, errors))
    .filter((item): item is AppItem => item !== null);
  const sns = (input.sns as unknown[])
    .map((item, index) => readSns(item, index, errors))
    .filter((item): item is SnsItem => item !== null);

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    warnings,
    data: { schemaVersion: 1, meta, schedules, checklist, memos, routines, apps, sns },
  };
}

function readAccount(value: unknown, index: number, errors: string[]): LedgerAccount | null {
  const path = `계좌[${index}]`;
  if (!isRecord(value)) {
    fail(errors, path, '객체가 아닙니다.');
    return null;
  }
  if (!isString(value.id) || value.id === '') fail(errors, `${path}.id`, '필수 값이 없습니다.');
  if (!isString(value.alias) || value.alias.trim() === '') {
    fail(errors, `${path}.alias`, '계좌 별칭이 필요합니다.');
  }
  if (!isDateTime(value.createdAt)) fail(errors, `${path}.createdAt`, '생성 시각이 올바르지 않습니다.');
  return {
    id: value.id as string,
    alias: value.alias as string,
    createdAt: value.createdAt as string,
  };
}

function readBalance(value: unknown, index: number, errors: string[]): BalanceSnapshot | null {
  const path = `잔액 기록[${index}]`;
  if (!isRecord(value)) {
    fail(errors, path, '객체가 아닙니다.');
    return null;
  }
  if (!isString(value.id) || value.id === '') fail(errors, `${path}.id`, '필수 값이 없습니다.');
  if (!isString(value.accountId) || value.accountId === '') {
    fail(errors, `${path}.accountId`, '계좌가 필요합니다.');
  }
  if (!isString(value.date) || !isISODate(value.date)) {
    fail(errors, `${path}.date`, '기준일이 올바르지 않습니다.');
  }
  if (!isInteger(value.balance)) fail(errors, `${path}.balance`, '잔액은 원 단위 정수여야 합니다.');
  if (!isString(value.note)) fail(errors, `${path}.note`, '메모가 문자열이어야 합니다.');
  if (!isDateTime(value.createdAt)) fail(errors, `${path}.createdAt`, '생성 시각이 올바르지 않습니다.');
  return {
    id: value.id as string,
    accountId: value.accountId as string,
    date: value.date as string,
    balance: value.balance as number,
    note: (value.note as string) ?? '',
    createdAt: value.createdAt as string,
  };
}

function readTransaction(value: unknown, index: number, errors: string[]): LedgerTransaction | null {
  const path = `거래[${index}]`;
  if (!isRecord(value)) {
    fail(errors, path, '객체가 아닙니다.');
    return null;
  }
  const type = value.type as TransactionType;
  if (!isString(value.id) || value.id === '') fail(errors, `${path}.id`, '필수 값이 없습니다.');
  if (!isString(value.date) || !isISODate(value.date)) {
    fail(errors, `${path}.date`, '날짜가 올바르지 않습니다.');
  }
  if (!isString(value.accountId) || value.accountId === '') {
    fail(errors, `${path}.accountId`, '계좌가 필요합니다.');
  }
  if (type !== 'income' && type !== 'expense' && type !== 'transfer') {
    fail(errors, `${path}.type`, '거래 유형이 올바르지 않습니다.');
  }
  if (!isString(value.category)) fail(errors, `${path}.category`, '분류가 문자열이어야 합니다.');
  if (!isInteger(value.amount) || value.amount <= 0) {
    fail(errors, `${path}.amount`, '금액은 0보다 큰 원 단위 정수여야 합니다.');
  }
  if (!isString(value.memo)) fail(errors, `${path}.memo`, '메모가 문자열이어야 합니다.');
  if (!(value.toAccountId === null || isString(value.toAccountId))) {
    fail(errors, `${path}.toAccountId`, '입금 계좌가 올바르지 않습니다.');
  }
  if (type === 'transfer') {
    if (!isString(value.toAccountId) || value.toAccountId === '') {
      fail(errors, `${path}.toAccountId`, '이체는 입금 계좌가 필요합니다.');
    } else if (value.toAccountId === value.accountId) {
      fail(errors, `${path}.toAccountId`, '출금 계좌와 입금 계좌가 같습니다.');
    }
  }
  if (!isDateTime(value.createdAt)) fail(errors, `${path}.createdAt`, '생성 시각이 올바르지 않습니다.');
  return {
    id: value.id as string,
    date: value.date as string,
    accountId: value.accountId as string,
    type,
    category: value.category as string,
    amount: value.amount as number,
    memo: (value.memo as string) ?? '',
    toAccountId: (value.toAccountId as string | null) ?? null,
    createdAt: value.createdAt as string,
  };
}

export function validateLedger(input: unknown): ValidationResult<LedgerData> {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ['데이터가 객체가 아닙니다.'] };
  if (input.schemaVersion !== 1) errors.push('지원하지 않는 가계부 schemaVersion입니다. (1만 지원)');
  const meta = readLedgerMeta(input.meta, errors, 'meta');
  if (!Array.isArray(input.accounts)) errors.push('accounts: 배열이 아닙니다.');
  if (!Array.isArray(input.balances)) errors.push('balances: 배열이 아닙니다.');
  if (!Array.isArray(input.transactions)) errors.push('transactions: 배열이 아닙니다.');
  if (errors.length > 0) return { ok: false, errors };

  const accounts = (input.accounts as unknown[])
    .map((item, index) => readAccount(item, index, errors))
    .filter((item): item is LedgerAccount => item !== null);
  const balances = (input.balances as unknown[])
    .map((item, index) => readBalance(item, index, errors))
    .filter((item): item is BalanceSnapshot => item !== null);
  const transactions = (input.transactions as unknown[])
    .map((item, index) => readTransaction(item, index, errors))
    .filter((item): item is LedgerTransaction => item !== null);

  const accountIds = new Set(accounts.map((account) => account.id));
  balances.forEach((balance, index) => {
    if (!accountIds.has(balance.accountId)) {
      fail(errors, `잔액 기록[${index}].accountId`, '존재하지 않는 계좌를 가리킵니다.');
    }
  });
  transactions.forEach((transaction, index) => {
    if (!accountIds.has(transaction.accountId)) {
      fail(errors, `거래[${index}].accountId`, '존재하지 않는 계좌를 가리킵니다.');
    }
    if (transaction.type === 'transfer' && transaction.toAccountId && !accountIds.has(transaction.toAccountId)) {
      fail(errors, `거래[${index}].toAccountId`, '존재하지 않는 입금 계좌를 가리킵니다.');
    }
  });

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    warnings: [],
    data: { schemaVersion: 1, meta, accounts, balances, transactions },
  };
}

export function summarizeHub(data: HubData): string[] {
  return [
    `일정 ${data.schedules.length}개`,
    `체크리스트 ${data.checklist.length}개`,
    `메모·할 일 ${data.memos.length}개`,
    `반복 업무 ${data.routines.length}개`,
    `앱 ${data.apps.length}개`,
    `SNS ${data.sns.length}개`,
  ];
}

export function summarizeLedger(data: LedgerData): string[] {
  return [
    `계좌 ${data.accounts.length}개`,
    `잔액 기록 ${data.balances.length}개`,
    `거래 ${data.transactions.length}개`,
  ];
}
