import { useCallback, useEffect, useRef, useState } from 'react';
import type { LoadResult, SaveResult } from '../lib/storage';

export interface SaveStatus {
  tone: 'idle' | 'saved' | 'error';
  message: string;
  at: number;
}

export interface LocalStore<T> {
  data: T;
  warning: string | null;
  saveStatus: SaveStatus;
  update: (mutator: (current: T) => T, successMessage?: string) => SaveResult;
  replace: (candidate: T, successMessage?: string) => SaveResult;
  clearWarning: () => void;
}

export function useLocalStore<T>(
  loaded: LoadResult<T>,
  save: (data: T) => SaveResult,
  replaceStored: (data: T) => SaveResult,
  label: string,
): LocalStore<T> {
  const [data, setData] = useState<T>(loaded.data);
  const [warning, setWarning] = useState<string | null>(loaded.warning);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    tone: 'idle',
    message: '',
    at: 0,
  });
  const dataRef = useRef<T>(loaded.data);

  useEffect(() => {
    if (saveStatus.tone !== 'saved') return;
    const timer = window.setTimeout(() => {
      setSaveStatus((current) =>
        current.tone === 'saved' ? { ...current, tone: 'idle', message: '' } : current,
      );
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [saveStatus]);

  const update = useCallback(
    (mutator: (current: T) => T, successMessage = `${label} 저장됨`) => {
      const next = mutator(dataRef.current);
      dataRef.current = next;
      setData(next);
      const result = save(next);
      if (result.ok) {
        setSaveStatus({ tone: 'saved', message: successMessage, at: Date.now() });
      } else {
        setSaveStatus({
          tone: 'error',
          message: `${result.error ?? '저장에 실패했습니다.'} 변경 내용은 현재 화면에만 있습니다.`,
          at: Date.now(),
        });
      }
      return result;
    },
    [label, save],
  );

  const replace = useCallback(
    (candidate: T, successMessage = `${label} 가져오기 완료`) => {
      const result = replaceStored(candidate);
      if (result.ok) {
        dataRef.current = candidate;
        setData(candidate);
        setSaveStatus({ tone: 'saved', message: successMessage, at: Date.now() });
      } else {
        setSaveStatus({
          tone: 'error',
          message: result.error ?? '가져오기에 실패해 기존 데이터를 유지했습니다.',
          at: Date.now(),
        });
      }
      return result;
    },
    [label, replaceStored],
  );

  return {
    data,
    warning,
    saveStatus,
    update,
    replace,
    clearWarning: () => setWarning(null),
  };
}
