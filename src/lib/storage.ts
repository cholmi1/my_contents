import type { HubData } from '../types/hub';
import type { LedgerData } from '../types/ledger';
import { createSampleHub, createSampleLedger } from '../data/samples';
import { validateHub, validateLedger } from './validation';

export const HUB_STORAGE_KEY = 'personal-hub.hub.v1';
export const LEDGER_STORAGE_KEY = 'personal-hub.ledger.v1';

export interface LoadResult<T> {
  data: T;
  warning: string | null;
  seeded: boolean;
}

export interface SaveResult {
  ok: boolean;
  error: string | null;
}

function storageAvailable(): boolean {
  try {
    const key = 'personal-hub.storage-test';
    localStorage.setItem(key, 'ok');
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function loadHub(): LoadResult<HubData> {
  if (!storageAvailable()) {
    return {
      data: createSampleHub(),
      warning:
        '브라우저 저장소를 사용할 수 없습니다. 이 화면의 변경 내용은 새로고침하면 사라집니다.',
      seeded: true,
    };
  }
  const raw = localStorage.getItem(HUB_STORAGE_KEY);
  if (raw === null) {
    const data = createSampleHub();
    const saved = saveHub(data);
    return {
      data,
      warning: saved.ok ? null : saved.error,
      seeded: saved.ok,
    };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = validateHub(parsed);
    if (!result.ok) {
      quarantine(HUB_STORAGE_KEY, raw);
      return {
        data: createSampleHub(),
        warning:
          '저장된 허브 데이터가 손상되어 읽을 수 없습니다. 원본 문자열을 별도 키에 보관하고 가상 데이터로 시작합니다.',
        seeded: false,
      };
    }
    return { data: result.data, warning: null, seeded: false };
  } catch {
    quarantine(HUB_STORAGE_KEY, raw);
    return {
      data: createSampleHub(),
      warning:
        '저장된 허브 데이터의 JSON을 읽을 수 없습니다. 원본 문자열을 별도 키에 보관하고 가상 데이터로 시작합니다.',
      seeded: false,
    };
  }
}

export function loadLedger(): LoadResult<LedgerData> {
  if (!storageAvailable()) {
    return {
      data: createSampleLedger(),
      warning:
        '브라우저 저장소를 사용할 수 없습니다. 이 화면의 변경 내용은 새로고침하면 사라집니다.',
      seeded: true,
    };
  }
  const raw = localStorage.getItem(LEDGER_STORAGE_KEY);
  if (raw === null) {
    const data = createSampleLedger();
    const saved = saveLedger(data);
    return {
      data,
      warning: saved.ok ? null : saved.error,
      seeded: saved.ok,
    };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = validateLedger(parsed);
    if (!result.ok) {
      quarantine(LEDGER_STORAGE_KEY, raw);
      return {
        data: createSampleLedger(),
        warning:
          '저장된 가계부 데이터가 손상되어 읽을 수 없습니다. 원본 문자열을 별도 키에 보관하고 가상 데이터로 시작합니다.',
        seeded: false,
      };
    }
    return { data: result.data, warning: null, seeded: false };
  } catch {
    quarantine(LEDGER_STORAGE_KEY, raw);
    return {
      data: createSampleLedger(),
      warning:
        '저장된 가계부 데이터의 JSON을 읽을 수 없습니다. 원본 문자열을 별도 키에 보관하고 가상 데이터로 시작합니다.',
      seeded: false,
    };
  }
}

function quarantine(key: string, raw: string): void {
  try {
    localStorage.setItem(`${key}.corrupt.${Date.now()}`, raw);
  } catch {
    // 원본 보관에 실패해도 현재 키는 덮어쓰지 않습니다.
  }
}

export function saveHub(data: HubData): SaveResult {
  return saveJson(HUB_STORAGE_KEY, data);
}

export function saveLedger(data: LedgerData): SaveResult {
  return saveJson(LEDGER_STORAGE_KEY, data);
}

function saveJson(key: string, data: unknown): SaveResult {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return { ok: true, error: null };
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === 'QuotaExceededError'
        ? '브라우저 저장 공간이 가득 찼습니다. 백업 후 오래된 데이터를 정리하세요.'
        : '브라우저 저장에 실패했습니다. 시크릿 모드인지, 저장 공간이 남아 있는지 확인하세요.';
    return { ok: false, error: message };
  }
}

export function replaceStoredHub(candidate: HubData): SaveResult {
  return replaceStoredJson(HUB_STORAGE_KEY, candidate);
}

export function replaceStoredLedger(candidate: LedgerData): SaveResult {
  return replaceStoredJson(LEDGER_STORAGE_KEY, candidate);
}

function replaceStoredJson(key: string, candidate: unknown): SaveResult {
  const previous = localStorage.getItem(key);
  try {
    localStorage.setItem(key, JSON.stringify(candidate));
    return { ok: true, error: null };
  } catch (error) {
    try {
      if (previous === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, previous);
      }
    } catch {
      // 기존 값을 복원하지 못한 경우에도 아래에서 오류를 알립니다.
    }
    return {
      ok: false,
      error:
        error instanceof DOMException && error.name === 'QuotaExceededError'
          ? '저장 공간이 부족해 가져오기를 취소했습니다. 기존 데이터는 그대로 두었습니다.'
          : '저장에 실패해 가져오기를 취소했습니다. 기존 데이터는 그대로 두었습니다.',
    };
  }
}

export function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(fileName: string, text: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
