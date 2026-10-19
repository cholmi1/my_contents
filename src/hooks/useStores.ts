import { useCallback, useMemo } from 'react';
import type { HubData } from '../types/hub';
import type { LedgerData } from '../types/ledger';
import { loadHub, loadLedger, replaceStoredHub, replaceStoredLedger, saveHub, saveLedger } from '../lib/storage';
import { useLocalStore } from './useLocalStore';

export function useHubStore() {
  const loaded = useMemo(() => loadHub(), []);
  const save = useCallback((data: HubData) => saveHub(data), []);
  const replace = useCallback((data: HubData) => replaceStoredHub(data), []);
  return useLocalStore<HubData>(loaded, save, replace, '허브');
}

export function useLedgerStore() {
  const loaded = useMemo(() => loadLedger(), []);
  const save = useCallback((data: LedgerData) => saveLedger(data), []);
  const replace = useCallback((data: LedgerData) => replaceStoredLedger(data), []);
  return useLocalStore<LedgerData>(loaded, save, replace, '가계부');
}
