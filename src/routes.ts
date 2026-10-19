export type RouteKey = 'home' | 'routines' | 'notes' | 'apps' | 'ledger' | 'settings';

export const ROUTE_PATHS: Record<RouteKey, string> = {
  home: '/',
  routines: '/routines',
  notes: '/notes',
  apps: '/apps',
  ledger: '/ledger',
  settings: '/settings',
};

export const ROUTE_LABELS: Record<RouteKey, string> = {
  home: '홈',
  routines: '개인 반복 업무',
  notes: '메모·할 일',
  apps: '내 앱·SNS',
  ledger: '가계부',
  settings: '설정·백업',
};

export function parseRoute(hash: string): RouteKey {
  const value = hash.replace(/^#/, '') || '/';
  const found = (Object.entries(ROUTE_PATHS) as [RouteKey, string][]).find(
    ([, path]) => path === value,
  );
  return found?.[0] ?? 'home';
}
