import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { RouteKey } from '../routes';
import { ROUTE_LABELS, ROUTE_PATHS } from '../routes';
import type { SaveStatus } from '../hooks/useLocalStore';
import {
  CloseIcon,
  GridIcon,
  HomeIcon,
  MenuIcon,
  NoteIcon,
  RepeatIcon,
  SettingsIcon,
  WalletIcon,
} from './Icons';
import { SaveStatusBadge } from './SaveStatusBadge';

interface WarningItem {
  id: string;
  message: string;
  onDismiss: () => void;
}

interface Props {
  active: RouteKey;
  children: ReactNode;
  status: SaveStatus;
  warnings: WarningItem[];
}

const NAV_ITEMS = [
  { key: 'home' as const, icon: HomeIcon },
  { key: 'routines' as const, icon: RepeatIcon },
  { key: 'notes' as const, icon: NoteIcon },
  { key: 'apps' as const, icon: GridIcon },
  { key: 'ledger' as const, icon: WalletIcon },
  { key: 'settings' as const, icon: SettingsIcon },
];

const MOBILE_ITEMS = NAV_ITEMS.slice(0, 5);

function NavLink({
  route,
  active,
  compact = false,
  onClick,
}: {
  route: RouteKey;
  active: RouteKey;
  compact?: boolean;
  onClick?: () => void;
}) {
  const item = NAV_ITEMS.find((nav) => nav.key === route);
  const Icon = item?.icon ?? HomeIcon;
  return (
    <a
      href={`#${ROUTE_PATHS[route]}`}
      className={`nav-link${active === route ? ' active' : ''}${compact ? ' compact' : ''}`}
      aria-current={active === route ? 'page' : undefined}
      onClick={onClick}
    >
      <Icon />
      <span>{compact ? ROUTE_LABELS[route].replace('개인 ', '') : ROUTE_LABELS[route]}</span>
    </a>
  );
}

export function Layout({ active, children, status, warnings }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [active]);

  useEffect(() => {
    document.title = `${ROUTE_LABELS[active]} · 나의 생활 허브`;
  }, [active]);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="주 메뉴">
        <a className="brand" href="#/">
          <span className="brand-mark" aria-hidden="true">생</span>
          <span>
            <strong>나의 생활 허브</strong>
            <small>로컬 테스트 버전</small>
          </span>
        </a>
        <nav className="side-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.key} route={item.key} active={active} />
          ))}
        </nav>
        <div className="sidebar-note">
          <strong>서버 없이 이 브라우저에만 저장</strong>
          <p>PC와 휴대폰은 자동으로 동기화되지 않습니다. 개인 백업 파일은 직접 보관하세요.</p>
        </div>
      </aside>

      <div className="main-column">
        <header className="mobile-header">
          <button
            type="button"
            className="icon-button"
            aria-label="메뉴 열기"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </button>
          <a className="mobile-brand" href="#/">
            나의 생활 허브
          </a>
          <a
            className="icon-button"
            href={`#${ROUTE_PATHS.settings}`}
            aria-label="설정 및 백업"
          >
            <SettingsIcon />
          </a>
        </header>

        <div className="topbar">
          <div className="test-banner">
            <span className="dot" aria-hidden="true" />
            테스트 버전 · 실제 개인정보·회사정보를 입력하지 마세요
          </div>
          <SaveStatusBadge status={status} />
        </div>

        <main className="content">
          {warnings.map((warning) => (
            <div className="alert alert-warning" role="alert" key={warning.id}>
              <p>{warning.message}</p>
              <button
                type="button"
                className="icon-button small"
                aria-label="경고 닫기"
                onClick={warning.onDismiss}
              >
                <CloseIcon />
              </button>
            </div>
          ))}
          {children}
        </main>

        <footer className="site-footer">
          <p>
            이 사이트는 로컬 테스트 버전입니다. 로그인, 서버 DB, 자동 동기화, 외부 인증,
            배포 기능이 없습니다.
          </p>
          <p>브라우저 저장소는 암호화된 금고가 아닙니다. 민감한 정보는 저장하지 마세요.</p>
        </footer>
      </div>

      <nav className="bottom-nav" aria-label="빠른 메뉴">
        {MOBILE_ITEMS.map((item) => (
          <NavLink key={item.key} route={item.key} active={active} compact />
        ))}
      </nav>

      {drawerOpen ? (
        <div className="drawer-overlay" role="presentation" onClick={() => setDrawerOpen(false)}>
          <div
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="전체 메뉴"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-head">
              <strong>전체 메뉴</strong>
              <button
                type="button"
                className="icon-button"
                aria-label="메뉴 닫기"
                onClick={() => setDrawerOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <nav>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.key}
                  route={item.key}
                  active={active}
                  onClick={() => setDrawerOpen(false)}
                />
              ))}
            </nav>
            <div className="sidebar-note">
              <strong>데이터 저장 위치</strong>
              <p>이 브라우저의 localStorage에만 저장됩니다. 정기적으로 JSON 백업을 내려받으세요.</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
