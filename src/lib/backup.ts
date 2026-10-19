import type { HubData } from '../types/hub';
import type { LedgerData } from '../types/ledger';
import { validateHub, validateLedger } from './validation';

export type BackupKind = 'hub' | 'ledger';

export interface BackupEnvelope<T> {
  app: 'personal-hub';
  kind: BackupKind;
  schemaVersion: 1;
  exportedAt: string;
  data: T;
}

export type BackupParseResult<T> =
  | { ok: true; data: T; exportedAt: string; warnings: string[] }
  | { ok: false; errors: string[] };

export function createBackupEnvelope<T>(
  kind: BackupKind,
  data: T,
  exportedAt = new Date().toISOString(),
): BackupEnvelope<T> {
  return {
    app: 'personal-hub',
    kind,
    schemaVersion: 1,
    exportedAt,
    data,
  };
}

export function parseHubBackup(text: string): BackupParseResult<HubData> {
  return parseBackup(text, 'hub', validateHub);
}

export function parseLedgerBackup(text: string): BackupParseResult<LedgerData> {
  return parseBackup(text, 'ledger', validateLedger);
}

function parseBackup<T>(
  text: string,
  expectedKind: BackupKind,
  validate: (value: unknown) => { ok: true; data: T; warnings: string[] } | { ok: false; errors: string[] },
): BackupParseResult<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      errors: ['JSON 문법을 읽을 수 없습니다. 파일이 손상되었거나 JSON이 아닙니다.'],
    };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, errors: ['백업 파일의 최상위 값이 객체가 아닙니다.'] };
  }
  const envelope = parsed as Record<string, unknown>;
  const errors: string[] = [];
  if (envelope.app !== 'personal-hub') {
    errors.push('이 사이트에서 만든 백업 파일이 아닙니다. (app 값 불일치)');
  }
  if (envelope.kind !== expectedKind) {
    errors.push(
      envelope.kind === 'hub'
        ? '허브 백업 파일입니다. 가계부 영역에는 가져올 수 없습니다.'
        : envelope.kind === 'ledger'
          ? '가계부 백업 파일입니다. 허브 영역에는 가져올 수 없습니다.'
          : '백업 종류(kind)가 올바르지 않습니다.',
    );
  }
  if (envelope.schemaVersion !== 1) {
    errors.push('지원하지 않는 백업 schemaVersion입니다. 현재 버전은 1입니다.');
  }
  if (typeof envelope.exportedAt !== 'string' || Number.isNaN(new Date(envelope.exportedAt).getTime())) {
    errors.push('내보낸 시각(exportedAt)이 올바르지 않습니다.');
  }
  if (errors.length > 0) return { ok: false, errors };
  const result = validate(envelope.data);
  if (!result.ok) {
    return {
      ok: false,
      errors: ['백업 내부 데이터 검증에 실패했습니다.', ...result.errors],
    };
  }
  return {
    ok: true,
    data: result.data,
    exportedAt: envelope.exportedAt as string,
    warnings: result.warnings,
  };
}

export function backupFileName(kind: BackupKind, now = new Date()): string {
  const stamp = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(now)
    .replace(/[^\d]/g, '')
    .slice(0, 14);
  return `personal-hub-${kind}-${stamp}.json`;
}
