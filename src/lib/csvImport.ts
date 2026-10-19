import type { AppCategory, AppItem, AppStatus, SnsItem, SnsStatus } from '../types/hub';
import { createId } from './id';
import type { CsvFieldDefinition, CsvMapping } from './csv';
import {
  cellValue,
  isSafeHttpUrl,
  looksCompanyRelated,
  normalizeDateText,
  normalizeNameForCompare,
  normalizeUrlForCompare,
  parseIntegerText,
  splitTags,
} from './csv';

export const APP_CSV_FIELDS: CsvFieldDefinition[] = [
  { key: 'name', label: '이름', aliases: ['제목', 'title', '앱 이름', 'app name'], required: true },
  { key: 'url', label: '실행 주소', aliases: ['주소', '링크', 'url', 'link', '북마크 주소'] },
  { key: 'purpose', label: '용도', aliases: ['설명', 'purpose', 'description'] },
  { key: 'service', label: '제작 서비스', aliases: ['서비스', 'service', 'platform'] },
  { key: 'category', label: '구분', aliases: ['분류', 'category', 'type'] },
  { key: 'status', label: '상태', aliases: ['status', '운영 상태'] },
  { key: 'note', label: '메모', aliases: ['note', '비고', 'memo'] },
  { key: 'tags', label: '태그', aliases: ['tags', 'tag', '키워드'] },
  { key: 'monthlyCost', label: '월 비용', aliases: ['비용', 'monthly cost', 'price'] },
  { key: 'renewalDay', label: '갱신일', aliases: ['renewal day', '결제일'] },
  { key: 'lastModified', label: '최근 수정일', aliases: ['수정일', 'last modified', 'updated'] },
  { key: 'editUrl', label: '편집 주소', aliases: ['edit url', '관리 주소'] },
];

export const SNS_CSV_FIELDS: CsvFieldDefinition[] = [
  { key: 'platform', label: '플랫폼', aliases: ['platform', '서비스'], required: true },
  { key: 'channelName', label: '채널명', aliases: ['채널', '이름', 'channel', 'name'], required: true },
  { key: 'url', label: '주소', aliases: ['링크', 'url', 'link'] },
  { key: 'status', label: '운영 상태', aliases: ['상태', 'status'] },
  { key: 'lastPosted', label: '최근 게시일', aliases: ['last posted', '게시일'] },
  { key: 'note', label: '메모', aliases: ['note', '비고', 'memo'] },
];

export type AppImportDraft = Omit<AppItem, 'id' | 'createdAt' | 'updatedAt' | 'isDemo'>;

export interface AppImportPreview {
  rowNumber: number;
  name: string;
  url: string;
  categoryText: string;
  note: string;
  draft: AppImportDraft | null;
  errors: string[];
  warnings: string[];
  duplicate: boolean;
  duplicateOf: string | null;
  company: boolean;
  defaultSelected: boolean;
}

export type SnsImportDraft = Omit<SnsItem, 'id' | 'createdAt' | 'updatedAt' | 'isDemo'>;

export interface SnsImportPreview {
  rowNumber: number;
  platform: string;
  channelName: string;
  url: string;
  statusText: string;
  note: string;
  draft: SnsImportDraft | null;
  errors: string[];
  warnings: string[];
  duplicate: boolean;
  duplicateOf: string | null;
  company: boolean;
  defaultSelected: boolean;
}

function toAppCategory(raw: string): { value: AppCategory; recognized: boolean } {
  const normalized = raw.trim().toLowerCase();
  if (normalized === '') return { value: 'review', recognized: false };
  if (['내가 만든 앱', '내 앱', '내앱', 'mine', 'my app', '직접 제작'].includes(normalized)) {
    return { value: 'mine', recognized: true };
  }
  if (['공유받은 앱', '공유 앱', '공유', 'shared', 'shared app'].includes(normalized)) {
    return { value: 'shared', recognized: true };
  }
  if (['외부 도구', '외부', 'external', 'tool', 'saaS'].includes(normalized)) {
    return { value: 'external', recognized: true };
  }
  if (['확인 필요', '미확인', '검토', 'review', 'unknown', '기타'].includes(normalized)) {
    return { value: 'review', recognized: true };
  }
  return { value: 'review', recognized: false };
}

function toAppStatus(raw: string): { value: AppStatus; recognized: boolean } {
  const normalized = raw.trim().toLowerCase();
  if (normalized === '') return { value: 'active', recognized: false };
  if (['사용 중', '사용중', 'active', '현재 사용'].includes(normalized)) {
    return { value: 'active', recognized: true };
  }
  if (['보관', '보관 중', 'archived', 'archive'].includes(normalized)) {
    return { value: 'archived', recognized: true };
  }
  if (['중단', '종료', 'stopped', 'inactive', '중지'].includes(normalized)) {
    return { value: 'stopped', recognized: true };
  }
  return { value: 'active', recognized: false };
}

function toSnsStatus(raw: string): { value: SnsStatus; recognized: boolean } {
  const normalized = raw.trim().toLowerCase();
  if (normalized === '') return { value: 'active', recognized: false };
  if (['운영 중', '운영중', 'active', '사용 중'].includes(normalized)) {
    return { value: 'active', recognized: true };
  }
  if (['휴식 중', '휴식', '일시 중지', 'paused', 'pause'].includes(normalized)) {
    return { value: 'paused', recognized: true };
  }
  if (['종료', 'closed', '중단'].includes(normalized)) {
    return { value: 'closed', recognized: true };
  }
  return { value: 'active', recognized: false };
}

export function buildAppPreviews(
  rows: string[][],
  mapping: CsvMapping,
  existing: AppItem[],
): AppImportPreview[] {
  return rows.map((row, index) => {
    const name = cellValue(row, mapping, 'name');
    const url = cellValue(row, mapping, 'url');
    const purpose = cellValue(row, mapping, 'purpose');
    const service = cellValue(row, mapping, 'service');
    const categoryText = cellValue(row, mapping, 'category');
    const statusText = cellValue(row, mapping, 'status');
    const note = cellValue(row, mapping, 'note');
    const tagsText = cellValue(row, mapping, 'tags');
    const monthlyCostText = cellValue(row, mapping, 'monthlyCost');
    const renewalDayText = cellValue(row, mapping, 'renewalDay');
    const lastModifiedText = cellValue(row, mapping, 'lastModified');
    const editUrl = cellValue(row, mapping, 'editUrl');

    const errors: string[] = [];
    const warnings: string[] = [];

    if (name === '') errors.push('이름이 비어 있습니다.');
    if (url && !isSafeHttpUrl(url)) errors.push('실행 주소는 http 또는 https만 허용합니다.');
    if (editUrl && !isSafeHttpUrl(editUrl)) errors.push('편집 주소는 http 또는 https만 허용합니다.');
    if (name.length > 120) errors.push('이름이 120자를 넘습니다.');

    let monthlyCost: number | null = null;
    if (monthlyCostText !== '') {
      const parsed = parseIntegerText(monthlyCostText);
      if (parsed === null || parsed < 0) {
        errors.push('월 비용은 0 이상의 원 단위 정수여야 합니다.');
      } else {
        monthlyCost = parsed;
      }
    }

    let renewalDay: number | null = null;
    if (renewalDayText !== '') {
      const parsed = parseIntegerText(renewalDayText);
      if (parsed === null || parsed < 1 || parsed > 31) {
        errors.push('갱신일은 1~31 사이의 정수여야 합니다.');
      } else {
        renewalDay = parsed;
      }
    }

    let lastModified: string | null = null;
    if (lastModifiedText !== '') {
      lastModified = normalizeDateText(lastModifiedText);
      if (lastModified === null) errors.push('최근 수정일을 날짜로 읽을 수 없습니다.');
    }

    const category = toAppCategory(categoryText);
    if (categoryText !== '' && !category.recognized) {
      warnings.push(`구분 "${categoryText}"을(를) 확인 필요로 가져옵니다.`);
    }
    const status = toAppStatus(statusText);
    if (statusText !== '' && !status.recognized) {
      warnings.push(`상태 "${statusText}"을(를) 사용 중으로 가져옵니다.`);
    } else if (statusText === '') {
      warnings.push('상태가 비어 있어 사용 중으로 가져옵니다.');
    }

    const duplicateOf = findDuplicateApp(name, url, existing);
    const company = looksCompanyRelated([
      name,
      url,
      categoryText,
      note,
      tagsText,
    ]);

    const draft: AppImportDraft | null =
      errors.length === 0
        ? {
            name,
            purpose,
            service,
            url,
            editUrl,
            category: category.value,
            status: status.value,
            monthlyCost,
            renewalDay,
            lastModified,
            note,
            tags: splitTags(tagsText),
          }
        : null;

    return {
      rowNumber: index + 2,
      name,
      url,
      categoryText,
      note,
      draft,
      errors,
      warnings,
      duplicate: duplicateOf !== null,
      duplicateOf,
      company,
      defaultSelected: errors.length === 0 && duplicateOf === null && !company,
    };
  });
}

function findDuplicateApp(name: string, url: string, existing: AppItem[]): string | null {
  const normalizedUrl = normalizeUrlForCompare(url);
  const normalizedName = normalizeNameForCompare(name);
  for (const app of existing) {
    if (normalizedUrl && normalizeUrlForCompare(app.url) === normalizedUrl) {
      return app.name;
    }
    if (normalizedName && normalizeNameForCompare(app.name) === normalizedName) {
      return app.name;
    }
  }
  return null;
}

export function buildSnsPreviews(
  rows: string[][],
  mapping: CsvMapping,
  existing: SnsItem[],
): SnsImportPreview[] {
  return rows.map((row, index) => {
    const platform = cellValue(row, mapping, 'platform');
    const channelName = cellValue(row, mapping, 'channelName');
    const url = cellValue(row, mapping, 'url');
    const statusText = cellValue(row, mapping, 'status');
    const lastPostedText = cellValue(row, mapping, 'lastPosted');
    const note = cellValue(row, mapping, 'note');

    const errors: string[] = [];
    const warnings: string[] = [];
    if (platform === '') errors.push('플랫폼이 비어 있습니다.');
    if (channelName === '') errors.push('채널명이 비어 있습니다.');
    if (url && !isSafeHttpUrl(url)) errors.push('주소는 http 또는 https만 허용합니다.');
    if (channelName.length > 120) errors.push('채널명이 120자를 넘습니다.');

    let lastPosted: string | null = null;
    if (lastPostedText !== '') {
      lastPosted = normalizeDateText(lastPostedText);
      if (lastPosted === null) errors.push('최근 게시일을 날짜로 읽을 수 없습니다.');
    }

    const status = toSnsStatus(statusText);
    if (statusText !== '' && !status.recognized) {
      warnings.push(`운영 상태 "${statusText}"을(를) 운영 중으로 가져옵니다.`);
    } else if (statusText === '') {
      warnings.push('운영 상태가 비어 있어 운영 중으로 가져옵니다.');
    }

    const duplicateOf = findDuplicateSns(platform, channelName, url, existing);
    const company = looksCompanyRelated([platform, channelName, url, note]);

    const draft: SnsImportDraft | null =
      errors.length === 0
        ? {
            platform,
            channelName,
            url,
            status: status.value,
            lastPosted,
            note,
          }
        : null;

    return {
      rowNumber: index + 2,
      platform,
      channelName,
      url,
      statusText,
      note,
      draft,
      errors,
      warnings,
      duplicate: duplicateOf !== null,
      duplicateOf,
      company,
      defaultSelected: errors.length === 0 && duplicateOf === null && !company,
    };
  });
}

function findDuplicateSns(
  platform: string,
  channelName: string,
  url: string,
  existing: SnsItem[],
): string | null {
  const normalizedUrl = normalizeUrlForCompare(url);
  const normalizedName = normalizeNameForCompare(`${platform}::${channelName}`);
  for (const sns of existing) {
    if (normalizedUrl && normalizeUrlForCompare(sns.url) === normalizedUrl) {
      return `${sns.platform} / ${sns.channelName}`;
    }
    if (normalizedUrl === '' && normalizeNameForCompare(`${sns.platform}::${sns.channelName}`) === normalizedName) {
      return `${sns.platform} / ${sns.channelName}`;
    }
  }
  return null;
}

export function appPreviewToItem(draft: AppImportDraft, now = new Date().toISOString()): AppItem {
  return {
    ...draft,
    id: createId('app'),
    createdAt: now,
    updatedAt: now,
    isDemo: false,
  };
}

export function snsPreviewToItem(draft: SnsImportDraft, now = new Date().toISOString()): SnsItem {
  return {
    ...draft,
    id: createId('sns'),
    createdAt: now,
    updatedAt: now,
    isDemo: false,
  };
}
