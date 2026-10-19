export type ISODate = string;
export type ISODateTime = string;

export interface ScheduleItem {
  id: string;
  title: string;
  date: ISODate;
  startTime: string | null;
  endTime: string | null;
  note: string;
  isDemo: boolean;
}

export interface ChecklistItem {
  id: string;
  title: string;
  date: ISODate;
  done: boolean;
  createdAt: ISODateTime;
  isDemo: boolean;
}

export type MemoKind = 'memo' | 'todo';
export type Priority = 'low' | 'normal' | 'high';

export interface MemoItem {
  id: string;
  kind: MemoKind;
  title: string;
  body: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  dueDate: ISODate | null;
  priority: Priority | null;
  completed: boolean;
  completedAt: ISODateTime | null;
  isDemo: boolean;
}

export type RoutineCycle = 'daily' | 'weekly' | 'monthly';
export type RoutineStatus = 'current' | 'upcoming';

export interface RoutineItem {
  id: string;
  title: string;
  cycle: RoutineCycle;
  weekday: number | null;
  dayOfMonth: number | null;
  time: string | null;
  status: RoutineStatus;
  enabled: boolean;
  completions: Record<ISODate, true>;
  note: string;
  createdAt: ISODateTime;
  isDemo: boolean;
}

export type AppCategory = 'mine' | 'shared' | 'external' | 'review';
export type AppStatus = 'active' | 'archived' | 'stopped';

export interface AppItem {
  id: string;
  name: string;
  purpose: string;
  service: string;
  url: string;
  editUrl: string;
  category: AppCategory;
  status: AppStatus;
  monthlyCost: number | null;
  renewalDay: number | null;
  lastModified: ISODate | null;
  note: string;
  tags: string[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  isDemo: boolean;
}

export type SnsStatus = 'active' | 'paused' | 'closed';

export interface SnsItem {
  id: string;
  platform: string;
  channelName: string;
  url: string;
  status: SnsStatus;
  lastPosted: ISODate | null;
  note: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  isDemo: boolean;
}

export interface HubMeta {
  lastBackupAt: ISODateTime | null;
}

export interface HubData {
  schemaVersion: 1;
  meta: HubMeta;
  schedules: ScheduleItem[];
  checklist: ChecklistItem[];
  memos: MemoItem[];
  routines: RoutineItem[];
  apps: AppItem[];
  sns: SnsItem[];
}

export const APP_CATEGORY_LABELS: Record<AppCategory, string> = {
  mine: '내가 만든 앱',
  shared: '공유받은 앱',
  external: '외부 도구',
  review: '확인 필요',
};

export const APP_STATUS_LABELS: Record<AppStatus, string> = {
  active: '사용 중',
  archived: '보관',
  stopped: '중단',
};

export const SNS_STATUS_LABELS: Record<SnsStatus, string> = {
  active: '운영 중',
  paused: '휴식 중',
  closed: '종료',
};

export const ROUTINE_CYCLE_LABELS: Record<RoutineCycle, string> = {
  daily: '매일',
  weekly: '매주',
  monthly: '매월',
};

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
