import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { LocalStore } from '../hooks/useLocalStore';
import type {
  AppCategory,
  AppItem,
  AppStatus,
  HubData,
  SnsItem,
  SnsStatus,
} from '../types/hub';
import {
  APP_CATEGORY_LABELS,
  APP_STATUS_LABELS,
  SNS_STATUS_LABELS,
} from '../types/hub';
import { autoMapCsv, isSafeHttpUrl, parseCsv, parseIntegerText } from '../lib/csv';
import type { CsvMapping, ParsedCsv } from '../lib/csv';
import {
  APP_CSV_FIELDS,
  SNS_CSV_FIELDS,
  appPreviewToItem,
  buildAppPreviews,
  buildSnsPreviews,
  snsPreviewToItem,
} from '../lib/csvImport';
import type { AppImportPreview, SnsImportPreview } from '../lib/csvImport';
import { APPS_CSV_SAMPLE, SNS_CSV_SAMPLE } from '../data/csvSamples';
import { createId } from '../lib/id';
import { downloadText } from '../lib/storage';
import { Badge } from '../components/Badge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { ExternalLink } from '../components/ExternalLink';
import { FormField } from '../components/FormField';
import { Modal } from '../components/Modal';
import { DownloadIcon, PlusIcon, UploadIcon } from '../components/Icons';

interface Props {
  store: LocalStore<HubData>;
}

type Tab = 'apps' | 'sns';

interface AppFormState {
  name: string;
  purpose: string;
  service: string;
  url: string;
  editUrl: string;
  category: AppCategory;
  status: AppStatus;
  monthlyCost: string;
  renewalDay: string;
  lastModified: string;
  note: string;
  tags: string;
}

interface SnsFormState {
  platform: string;
  channelName: string;
  url: string;
  status: SnsStatus;
  lastPosted: string;
  note: string;
}

const EMPTY_APP_FORM: AppFormState = {
  name: '',
  purpose: '',
  service: '',
  url: '',
  editUrl: '',
  category: 'review',
  status: 'active',
  monthlyCost: '',
  renewalDay: '',
  lastModified: '',
  note: '',
  tags: '',
};

const EMPTY_SNS_FORM: SnsFormState = {
  platform: '',
  channelName: '',
  url: '',
  status: 'active',
  lastPosted: '',
  note: '',
};

const CATEGORY_TONE: Record<AppCategory, 'green' | 'blue' | 'neutral' | 'amber'> = {
  mine: 'green',
  shared: 'blue',
  external: 'neutral',
  review: 'amber',
};

const STATUS_TONE: Record<AppStatus, 'green' | 'amber' | 'red'> = {
  active: 'green',
  archived: 'amber',
  stopped: 'red',
};

const SNS_TONE: Record<SnsStatus, 'green' | 'amber' | 'red'> = {
  active: 'green',
  paused: 'amber',
  closed: 'red',
};

function won(value: number | null): string {
  if (value === null) return '비용 미입력';
  if (value === 0) return '무료';
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`;
}

function formatShortDate(value: string | null): string {
  if (!value) return '날짜 미입력';
  return value.replaceAll('-', '.');
}

export function AppsPage({ store }: Props) {
  const [tab, setTab] = useState<Tab>('apps');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AppCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AppStatus>('all');
  const [snsStatusFilter, setSnsStatusFilter] = useState<'all' | SnsStatus>('all');

  const [appModalOpen, setAppModalOpen] = useState(false);
  const [appEditing, setAppEditing] = useState<AppItem | null>(null);
  const [appForm, setAppForm] = useState<AppFormState>(EMPTY_APP_FORM);
  const [appError, setAppError] = useState('');

  const [snsModalOpen, setSnsModalOpen] = useState(false);
  const [snsEditing, setSnsEditing] = useState<SnsItem | null>(null);
  const [snsForm, setSnsForm] = useState<SnsFormState>(EMPTY_SNS_FORM);
  const [snsError, setSnsError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<
    { kind: 'app'; item: AppItem } | { kind: 'sns'; item: SnsItem } | null
  >(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importTab, setImportTab] = useState<Tab>('apps');
  const [fileName, setFileName] = useState('');
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<CsvMapping>({});
  const [appPreview, setAppPreview] = useState<AppImportPreview[]>([]);
  const [snsPreview, setSnsPreview] = useState<SnsImportPreview[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importError, setImportError] = useState('');
  const [importNotice, setImportNotice] = useState('');

  const apps = useMemo(() => {
    const query = search.trim().toLowerCase();
    return store.data.apps.filter((app) => {
      if (categoryFilter !== 'all' && app.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && app.status !== statusFilter) return false;
      if (!query) return true;
      return [app.name, app.purpose, app.service, app.note, app.tags.join(' '), app.url]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [store.data.apps, search, categoryFilter, statusFilter]);

  const snsList = useMemo(() => {
    const query = search.trim().toLowerCase();
    return store.data.sns.filter((sns) => {
      if (snsStatusFilter !== 'all' && sns.status !== snsStatusFilter) return false;
      if (!query) return true;
      return [sns.platform, sns.channelName, sns.note, sns.url]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [store.data.sns, search, snsStatusFilter]);

  const importFields = importTab === 'apps' ? APP_CSV_FIELDS : SNS_CSV_FIELDS;
  const importPreview = importTab === 'apps' ? appPreview : snsPreview;
  const selectableCount = importPreview.filter((row) => row.errors.length === 0).length;
  const errorCount = importPreview.filter((row) => row.errors.length > 0).length;
  const duplicateCount = importPreview.filter((row) => row.duplicate).length;
  const companyCount = importPreview.filter((row) => row.company).length;

  function openAppCreate() {
    setAppEditing(null);
    setAppForm({ ...EMPTY_APP_FORM });
    setAppError('');
    setAppModalOpen(true);
  }

  function openAppEdit(app: AppItem) {
    setAppEditing(app);
    setAppForm({
      name: app.name,
      purpose: app.purpose,
      service: app.service,
      url: app.url,
      editUrl: app.editUrl,
      category: app.category,
      status: app.status,
      monthlyCost: app.monthlyCost === null ? '' : String(app.monthlyCost),
      renewalDay: app.renewalDay === null ? '' : String(app.renewalDay),
      lastModified: app.lastModified ?? '',
      note: app.note,
      tags: app.tags.join(', '),
    });
    setAppError('');
    setAppModalOpen(true);
  }

  function saveApp(event: FormEvent) {
    event.preventDefault();
    const name = appForm.name.trim();
    if (!name) {
      setAppError('앱 이름을 입력하세요.');
      return;
    }
    if (appForm.url.trim() && !isSafeHttpUrl(appForm.url.trim())) {
      setAppError('실행 주소는 http 또는 https로 시작해야 합니다.');
      return;
    }
    if (appForm.editUrl.trim() && !isSafeHttpUrl(appForm.editUrl.trim())) {
      setAppError('편집 주소는 http 또는 https로 시작해야 합니다.');
      return;
    }
    let monthlyCost: number | null = null;
    if (appForm.monthlyCost.trim() !== '') {
      const parsed = parseIntegerText(appForm.monthlyCost);
      if (parsed === null || parsed < 0) {
        setAppError('월 비용은 0 이상의 원 단위 정수로 입력하세요.');
        return;
      }
      monthlyCost = parsed;
    }
    let renewalDay: number | null = null;
    if (appForm.renewalDay.trim() !== '') {
      const parsed = parseIntegerText(appForm.renewalDay);
      if (parsed === null || parsed < 1 || parsed > 31) {
        setAppError('갱신일은 1~31 사이의 정수로 입력하세요.');
        return;
      }
      renewalDay = parsed;
    }
    const now = new Date().toISOString();
    const item: AppItem = {
      id: appEditing?.id ?? createId('app'),
      name,
      purpose: appForm.purpose.trim(),
      service: appForm.service.trim(),
      url: appForm.url.trim(),
      editUrl: appForm.editUrl.trim(),
      category: appForm.category,
      status: appForm.status,
      monthlyCost,
      renewalDay,
      lastModified: appForm.lastModified || null,
      note: appForm.note.trim(),
      tags: appForm.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20),
      createdAt: appEditing?.createdAt ?? now,
      updatedAt: now,
      isDemo: appEditing?.isDemo ?? false,
    };
    store.update(
      (current) => ({
        ...current,
        apps: appEditing
          ? current.apps.map((app) => (app.id === appEditing.id ? item : app))
          : [...current.apps, item],
      }),
      appEditing ? '앱 수정됨' : '앱 추가됨',
    );
    setAppModalOpen(false);
  }

  function openSnsCreate() {
    setSnsEditing(null);
    setSnsForm({ ...EMPTY_SNS_FORM });
    setSnsError('');
    setSnsModalOpen(true);
  }

  function openSnsEdit(sns: SnsItem) {
    setSnsEditing(sns);
    setSnsForm({
      platform: sns.platform,
      channelName: sns.channelName,
      url: sns.url,
      status: sns.status,
      lastPosted: sns.lastPosted ?? '',
      note: sns.note,
    });
    setSnsError('');
    setSnsModalOpen(true);
  }

  function saveSns(event: FormEvent) {
    event.preventDefault();
    if (!snsForm.platform.trim()) {
      setSnsError('플랫폼을 입력하세요.');
      return;
    }
    if (!snsForm.channelName.trim()) {
      setSnsError('채널명을 입력하세요.');
      return;
    }
    if (snsForm.url.trim() && !isSafeHttpUrl(snsForm.url.trim())) {
      setSnsError('주소는 http 또는 https로 시작해야 합니다.');
      return;
    }
    const now = new Date().toISOString();
    const item: SnsItem = {
      id: snsEditing?.id ?? createId('sns'),
      platform: snsForm.platform.trim(),
      channelName: snsForm.channelName.trim(),
      url: snsForm.url.trim(),
      status: snsForm.status,
      lastPosted: snsForm.lastPosted || null,
      note: snsForm.note.trim(),
      createdAt: snsEditing?.createdAt ?? now,
      updatedAt: now,
      isDemo: snsEditing?.isDemo ?? false,
    };
    store.update(
      (current) => ({
        ...current,
        sns: snsEditing
          ? current.sns.map((sns) => (sns.id === snsEditing.id ? item : sns))
          : [...current.sns, item],
      }),
      snsEditing ? 'SNS 수정됨' : 'SNS 추가됨',
    );
    setSnsModalOpen(false);
  }

  function deleteItem() {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'app') {
      store.update(
        (current) => ({
          ...current,
          apps: current.apps.filter((app) => app.id !== deleteTarget.item.id),
        }),
        '앱 삭제됨',
      );
    } else {
      store.update(
        (current) => ({
          ...current,
          sns: current.sns.filter((sns) => sns.id !== deleteTarget.item.id),
        }),
        'SNS 삭제됨',
      );
    }
    setDeleteTarget(null);
  }

  function openImport() {
    setImportTab(tab);
    setFileName('');
    setParsedCsv(null);
    setMapping({});
    setAppPreview([]);
    setSnsPreview([]);
    setSelectedRows(new Set());
    setImportError('');
    setImportNotice('');
    setImportOpen(true);
  }

  function buildPreview(parsed: ParsedCsv, nextMapping: CsvMapping, target: Tab) {
    if (target === 'apps') {
      const previews = buildAppPreviews(parsed.rows, nextMapping, store.data.apps);
      setAppPreview(previews);
      setSnsPreview([]);
      setSelectedRows(
        new Set(previews.filter((row) => row.defaultSelected).map((row) => row.rowNumber)),
      );
    } else {
      const previews = buildSnsPreviews(parsed.rows, nextMapping, store.data.sns);
      setSnsPreview(previews);
      setAppPreview([]);
      setSelectedRows(
        new Set(previews.filter((row) => row.defaultSelected).map((row) => row.rowNumber)),
      );
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportNotice('');
    if (file.size > 5 * 1024 * 1024) {
      setImportError('CSV 파일은 5MB 이하만 가져올 수 있습니다.');
      return;
    }
    try {
      const text = await file.text();
      const result = parseCsv(text);
      if (!result.ok) {
        setImportError(result.error);
        setParsedCsv(null);
        setAppPreview([]);
        setSnsPreview([]);
        setSelectedRows(new Set());
        return;
      }
      const nextMapping = autoMapCsv(
        result.csv.headers,
        importTab === 'apps' ? APP_CSV_FIELDS : SNS_CSV_FIELDS,
      );
      setFileName(file.name);
      setParsedCsv(result.csv);
      setMapping(nextMapping);
      buildPreview(result.csv, nextMapping, importTab);
    } catch {
      setImportError('파일을 읽지 못했습니다. 다른 CSV 파일을 선택하세요.');
    }
  }

  function changeMapping(key: string, value: string) {
    if (!parsedCsv) return;
    const next: CsvMapping = { ...mapping, [key]: value === '' ? null : Number(value) };
    setMapping(next);
    buildPreview(parsedCsv, next, importTab);
  }

  function toggleRow(rowNumber: number) {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  }

  function selectAllSelectable() {
    setSelectedRows(
      new Set(importPreview.filter((row) => row.errors.length === 0).map((row) => row.rowNumber)),
    );
  }

  function selectDefault() {
    setSelectedRows(
      new Set(importPreview.filter((row) => row.defaultSelected).map((row) => row.rowNumber)),
    );
  }

  function importSelected() {
    if (importTab === 'apps') {
      const drafts = appPreview.filter(
        (row) => selectedRows.has(row.rowNumber) && row.draft !== null,
      );
      if (drafts.length === 0) {
        setImportError('가져올 항목을 하나 이상 선택하세요.');
        return;
      }
      const now = new Date().toISOString();
      const items = drafts.map((row) => appPreviewToItem(row.draft!, now));
      store.update(
        (current) => ({ ...current, apps: [...current.apps, ...items] }),
        `CSV에서 앱 ${items.length}개 가져옴`,
      );
      setImportNotice(`앱 ${items.length}개를 가져왔습니다. 원본 CSV는 수정되지 않았습니다.`);
    } else {
      const drafts = snsPreview.filter(
        (row) => selectedRows.has(row.rowNumber) && row.draft !== null,
      );
      if (drafts.length === 0) {
        setImportError('가져올 항목을 하나 이상 선택하세요.');
        return;
      }
      const now = new Date().toISOString();
      const items = drafts.map((row) => snsPreviewToItem(row.draft!, now));
      store.update(
        (current) => ({ ...current, sns: [...current.sns, ...items] }),
        `CSV에서 SNS ${items.length}개 가져옴`,
      );
      setImportNotice(`SNS ${items.length}개를 가져왔습니다. 원본 CSV는 수정되지 않았습니다.`);
    }
    setParsedCsv(null);
    setFileName('');
    setAppPreview([]);
    setSnsPreview([]);
    setSelectedRows(new Set());
    setImportError('');
    window.setTimeout(() => setImportOpen(false), 900);
  }

  function closeImport() {
    setImportOpen(false);
    setParsedCsv(null);
    setImportError('');
    setImportNotice('');
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">도구와 채널</p>
          <h1>내 앱·SNS</h1>
          <p>
            내가 만든 앱, 공유받은 앱, 외부 도구와 운영 중인 SNS 채널을 정리합니다. 회사 관련
            항목은 가져오기에서 기본 제외됩니다.
          </p>
        </div>
        <div className="actions">
          <button type="button" className="button secondary" onClick={openImport}>
            <UploadIcon /> CSV 가져오기
          </button>
          {tab === 'apps' ? (
            <button type="button" className="button primary" onClick={openAppCreate}>
              <PlusIcon /> 앱 추가
            </button>
          ) : (
            <button type="button" className="button primary" onClick={openSnsCreate}>
              <PlusIcon /> SNS 추가
            </button>
          )}
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label="앱과 SNS 구분">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'apps'}
          onClick={() => setTab('apps')}
        >
          내 앱 ({store.data.apps.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'sns'}
          onClick={() => setTab('sns')}
        >
          SNS ({store.data.sns.length})
        </button>
      </div>

      <section className="filter-bar" aria-label="검색과 필터">
        <FormField label="검색" htmlFor="app-search" className="grow">
          <input
            id="app-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={tab === 'apps' ? '이름, 용도, 태그 검색' : '플랫폼, 채널명 검색'}
          />
        </FormField>
        {tab === 'apps' ? (
          <>
            <FormField label="구분" htmlFor="app-category-filter">
              <select
                id="app-category-filter"
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value as 'all' | AppCategory)
                }
              >
                <option value="all">전체 구분</option>
                {Object.entries(APP_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="상태" htmlFor="app-status-filter">
              <select
                id="app-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | AppStatus)}
              >
                <option value="all">전체 상태</option>
                {Object.entries(APP_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
          </>
        ) : (
          <FormField label="상태" htmlFor="sns-status-filter">
            <select
              id="sns-status-filter"
              value={snsStatusFilter}
              onChange={(event) =>
                setSnsStatusFilter(event.target.value as 'all' | SnsStatus)
              }
            >
              <option value="all">전체 상태</option>
              {Object.entries(SNS_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
        )}
      </section>

      {tab === 'apps' ? (
        apps.length === 0 ? (
          <EmptyState
            title="조건에 맞는 앱이 없습니다."
            action={
              <button type="button" className="button primary" onClick={openAppCreate}>
                앱 직접 추가하기
              </button>
            }
          >
            직접 추가하거나 CSV 가져오기로 가상 예시를 확인해 보세요.
          </EmptyState>
        ) : (
          <div className="entity-grid">
            {apps.map((app) => (
              <article className="entity-card" key={app.id}>
                <div className="entity-head">
                  <div style={{ minWidth: 0 }}>
                    <div className="entity-title">
                      {app.name}
                      <Badge tone={CATEGORY_TONE[app.category]}>
                        {APP_CATEGORY_LABELS[app.category]}
                      </Badge>
                      <Badge tone={STATUS_TONE[app.status]}>
                        {APP_STATUS_LABELS[app.status]}
                      </Badge>
                      {app.isDemo ? <Badge tone="demo">가상</Badge> : null}
                    </div>
                    <p className="entity-sub">
                      {app.service || '제작 서비스 미입력'} · {app.purpose || '용도 미입력'}
                    </p>
                  </div>
                </div>
                <div className="entity-meta">
                  <span>{won(app.monthlyCost)}</span>
                  {app.renewalDay ? <span>· 갱신일 {app.renewalDay}일</span> : null}
                  <span>· 최근 수정 {formatShortDate(app.lastModified)}</span>
                </div>
                {app.note ? <p className="entity-note">{app.note}</p> : null}
                <div className="entity-meta">
                  {app.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="row-between" style={{ marginTop: 12 }}>
                  <div className="row" style={{ gap: 12 }}>
                    {app.url ? (
                      <ExternalLink href={app.url} className="app-link">
                        실행 주소 열기
                      </ExternalLink>
                    ) : (
                      <span className="tiny muted">실행 주소 없음</span>
                    )}
                    {app.editUrl ? (
                      <ExternalLink href={app.editUrl} className="app-link">
                        편집 주소 열기
                      </ExternalLink>
                    ) : null}
                  </div>
                  <div className="routine-actions">
                    <button
                      type="button"
                      className="button small ghost"
                      onClick={() => openAppEdit(app)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="button small danger-outline"
                      onClick={() => setDeleteTarget({ kind: 'app', item: app })}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )
      ) : snsList.length === 0 ? (
        <EmptyState
          title="조건에 맞는 SNS 채널이 없습니다."
          action={
            <button type="button" className="button primary" onClick={openSnsCreate}>
              SNS 직접 추가하기
            </button>
          }
        >
          플랫폼과 채널명만으로도 등록할 수 있습니다. 주소는 선택 사항입니다.
        </EmptyState>
      ) : (
        <div className="entity-grid">
          {snsList.map((sns) => (
            <article className="entity-card" key={sns.id}>
              <div className="entity-head">
                <div style={{ minWidth: 0 }}>
                  <div className="entity-title">
                    {sns.channelName}
                    <Badge tone={SNS_TONE[sns.status]}>{SNS_STATUS_LABELS[sns.status]}</Badge>
                    {sns.isDemo ? <Badge tone="demo">가상</Badge> : null}
                  </div>
                  <p className="entity-sub">{sns.platform}</p>
                </div>
              </div>
              <div className="entity-meta">
                <span>최근 게시 {formatShortDate(sns.lastPosted)}</span>
              </div>
              {sns.note ? <p className="entity-note">{sns.note}</p> : null}
              <div className="row-between" style={{ marginTop: 12 }}>
                {sns.url ? (
                  <ExternalLink href={sns.url} className="app-link">
                    채널 주소 열기
                  </ExternalLink>
                ) : (
                  <span className="tiny muted">주소 없음</span>
                )}
                <div className="routine-actions">
                  <button
                    type="button"
                    className="button small ghost"
                    onClick={() => openSnsEdit(sns)}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    className="button small danger-outline"
                    onClick={() => setDeleteTarget({ kind: 'sns', item: sns })}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        title={appEditing ? '앱 수정' : '앱 추가'}
        description="주소는 http 또는 https만 허용합니다. 주소가 없어도 저장할 수 있습니다."
        open={appModalOpen}
        onClose={() => setAppModalOpen(false)}
        wide
      >
        <form className="stack" onSubmit={saveApp}>
          <div className="form-grid">
            <FormField label="이름" htmlFor="app-name" required error={appError}>
              <input
                id="app-name"
                type="text"
                value={appForm.name}
                onChange={(event) => setAppForm({ ...appForm, name: event.target.value })}
                maxLength={120}
              />
            </FormField>
            <FormField label="제작 서비스" htmlFor="app-service">
              <input
                id="app-service"
                type="text"
                value={appForm.service}
                onChange={(event) => setAppForm({ ...appForm, service: event.target.value })}
                placeholder="예: Vite + React, Notion"
                maxLength={120}
              />
            </FormField>
            <FormField label="용도" htmlFor="app-purpose" className="span-2">
              <input
                id="app-purpose"
                type="text"
                value={appForm.purpose}
                onChange={(event) => setAppForm({ ...appForm, purpose: event.target.value })}
                maxLength={200}
              />
            </FormField>
            <FormField label="실행 주소" htmlFor="app-url" hint="http:// 또는 https://">
              <input
                id="app-url"
                type="url"
                inputMode="url"
                value={appForm.url}
                onChange={(event) => setAppForm({ ...appForm, url: event.target.value })}
                placeholder="https://example.com"
              />
            </FormField>
            <FormField label="편집 주소" htmlFor="app-edit-url" hint="선택 사항">
              <input
                id="app-edit-url"
                type="url"
                inputMode="url"
                value={appForm.editUrl}
                onChange={(event) => setAppForm({ ...appForm, editUrl: event.target.value })}
                placeholder="https://example.com/edit"
              />
            </FormField>
            <FormField label="구분" htmlFor="app-category">
              <select
                id="app-category"
                value={appForm.category}
                onChange={(event) =>
                  setAppForm({ ...appForm, category: event.target.value as AppCategory })
                }
              >
                {Object.entries(APP_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="상태" htmlFor="app-status">
              <select
                id="app-status"
                value={appForm.status}
                onChange={(event) =>
                  setAppForm({ ...appForm, status: event.target.value as AppStatus })
                }
              >
                {Object.entries(APP_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="월 비용(원)" htmlFor="app-cost" hint="원 단위 정수, 모르면 비워 두세요.">
              <input
                id="app-cost"
                type="text"
                inputMode="numeric"
                value={appForm.monthlyCost}
                onChange={(event) => setAppForm({ ...appForm, monthlyCost: event.target.value })}
                placeholder="예: 11000"
              />
            </FormField>
            <FormField label="갱신일" htmlFor="app-renewal" hint="1~31, 선택 사항">
              <input
                id="app-renewal"
                type="number"
                min={1}
                max={31}
                value={appForm.renewalDay}
                onChange={(event) => setAppForm({ ...appForm, renewalDay: event.target.value })}
              />
            </FormField>
            <FormField label="최근 수정일" htmlFor="app-modified">
              <input
                id="app-modified"
                type="date"
                value={appForm.lastModified}
                onChange={(event) =>
                  setAppForm({ ...appForm, lastModified: event.target.value })
                }
              />
            </FormField>
            <FormField label="태그" htmlFor="app-tags" hint="쉼표로 구분">
              <input
                id="app-tags"
                type="text"
                value={appForm.tags}
                onChange={(event) => setAppForm({ ...appForm, tags: event.target.value })}
                placeholder="예: 여행, 계산"
              />
            </FormField>
            <FormField label="메모" htmlFor="app-note" className="span-2">
              <textarea
                id="app-note"
                value={appForm.note}
                onChange={(event) => setAppForm({ ...appForm, note: event.target.value })}
                rows={3}
                maxLength={1000}
              />
            </FormField>
          </div>
          <div className="modal-actions">
            <button type="button" className="button ghost" onClick={() => setAppModalOpen(false)}>
              취소
            </button>
            <button type="submit" className="button primary">
              {appEditing ? '수정 저장' : '앱 추가'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        title={snsEditing ? 'SNS 수정' : 'SNS 추가'}
        open={snsModalOpen}
        onClose={() => setSnsModalOpen(false)}
      >
        <form className="stack" onSubmit={saveSns}>
          <FormField label="플랫폼" htmlFor="sns-platform" required error={snsError}>
            <input
              id="sns-platform"
              type="text"
              value={snsForm.platform}
              onChange={(event) => setSnsForm({ ...snsForm, platform: event.target.value })}
              placeholder="예: Instagram, 블로그, YouTube"
              maxLength={80}
            />
          </FormField>
          <FormField label="채널명" htmlFor="sns-channel" required>
            <input
              id="sns-channel"
              type="text"
              value={snsForm.channelName}
              onChange={(event) => setSnsForm({ ...snsForm, channelName: event.target.value })}
              maxLength={120}
            />
          </FormField>
          <FormField label="주소" htmlFor="sns-url" hint="http:// 또는 https://, 선택 사항">
            <input
              id="sns-url"
              type="url"
              inputMode="url"
              value={snsForm.url}
              onChange={(event) => setSnsForm({ ...snsForm, url: event.target.value })}
              placeholder="https://example.com/channel"
            />
          </FormField>
          <div className="form-grid">
            <FormField label="운영 상태" htmlFor="sns-status">
              <select
                id="sns-status"
                value={snsForm.status}
                onChange={(event) =>
                  setSnsForm({ ...snsForm, status: event.target.value as SnsStatus })
                }
              >
                {Object.entries(SNS_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="최근 게시일" htmlFor="sns-last-posted">
              <input
                id="sns-last-posted"
                type="date"
                value={snsForm.lastPosted}
                onChange={(event) => setSnsForm({ ...snsForm, lastPosted: event.target.value })}
              />
            </FormField>
          </div>
          <FormField label="메모" htmlFor="sns-note">
            <textarea
              id="sns-note"
              value={snsForm.note}
              onChange={(event) => setSnsForm({ ...snsForm, note: event.target.value })}
              rows={3}
              maxLength={1000}
            />
          </FormField>
          <div className="modal-actions">
            <button type="button" className="button ghost" onClick={() => setSnsModalOpen(false)}>
              취소
            </button>
            <button type="submit" className="button primary">
              {snsEditing ? '수정 저장' : 'SNS 추가'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        title={`${importTab === 'apps' ? '앱' : 'SNS'} CSV 가져오기`}
        description="원본 CSV와 브라우저 북마크는 수정하지 않습니다. 미리보기에서 선택한 항목만 현재 목록에 추가됩니다."
        open={importOpen}
        onClose={closeImport}
        wide
      >
        <div className="import-step">
          <h3>1. CSV 파일 선택</h3>
          <p>쉼표로 구분된 UTF-8 CSV를 지원합니다. 최대 5MB.</p>
          <input
            className="file-input"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            aria-label="CSV 파일 선택"
          />
          {fileName ? <p className="tiny muted" style={{ marginTop: 8 }}>선택한 파일: {fileName}</p> : null}
          <div className="row" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="button small ghost"
              onClick={() =>
                downloadText(
                  `${importTab === 'apps' ? 'apps' : 'sns'}-import-sample.csv`,
                  `\uFEFF${importTab === 'apps' ? APPS_CSV_SAMPLE : SNS_CSV_SAMPLE}`,
                  'text/csv;charset=utf-8',
                )
              }
            >
              <DownloadIcon /> {importTab === 'apps' ? '앱' : 'SNS'} 샘플 CSV 내려받기
            </button>
          </div>
          <div className="hint-box" style={{ marginTop: 10 }}>
            <strong>실제 후보 141개는 포함하지 않았습니다.</strong> 원본 CSV가 제공되지 않아
            데이터를 만들어내지 않았습니다. 전체 141개(내 앱 추정 20, 외부·공유 도구 추정 39,
            확인 필요 59, 회사 관련 제외 후보 16, 서비스 기본 링크·공유 대화 7)는 참고 수치이며,
            이 화면에는 소수의 가상 예시만 있습니다.
          </div>
        </div>

        {parsedCsv ? (
          <>
            <div className="import-step">
              <h3>2. 열 이름 매핑</h3>
              <p>자동으로 추정한 매핑입니다. 다른 열을 쓰려면 직접 바꾸세요.</p>
              <div className="mapping-grid">
                {importFields.map((field) => (
                  <FormField
                    key={field.key}
                    label={`${field.label}${field.required ? ' *' : ''}`}
                    htmlFor={`mapping-${field.key}`}
                  >
                    <select
                      id={`mapping-${field.key}`}
                      value={mapping[field.key] === null || mapping[field.key] === undefined ? '' : String(mapping[field.key])}
                      onChange={(event) => changeMapping(field.key, event.target.value)}
                    >
                      <option value="">사용 안 함</option>
                      {parsedCsv.headers.map((header, index) => (
                        <option key={`${header}-${index}`} value={index}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </FormField>
                ))}
              </div>
            </div>

            <div className="import-step">
              <h3>3. 미리보기와 선택</h3>
              <p>
                오류·중복 후보·회사 관련 제외 후보는 기본 선택에서 빠집니다. 필요한 경우 직접
                선택할 수 있습니다.
              </p>
              <div className="preview-summary">
                <span className="count-chip">전체 {importPreview.length}개</span>
                <span className="count-chip">가져올 수 있음 {selectableCount}개</span>
                <span className="count-chip">중복 후보 {duplicateCount}개</span>
                <span className="count-chip">회사 관련 {companyCount}개</span>
                <span className="count-chip">오류 {errorCount}개</span>
                <span className="count-chip">선택 {selectedRows.size}개</span>
              </div>
              <div className="row" style={{ marginBottom: 8 }}>
                <button type="button" className="button small secondary" onClick={selectDefault}>
                  기본 선택으로 되돌리기
                </button>
                <button type="button" className="button small ghost" onClick={selectAllSelectable}>
                  오류 없는 항목 전체 선택
                </button>
                <button
                  type="button"
                  className="button small ghost"
                  onClick={() => setSelectedRows(new Set())}
                >
                  선택 해제
                </button>
              </div>
              <div className="preview-table-wrap">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>선택</th>
                      <th>행</th>
                      <th>{importTab === 'apps' ? '이름' : '채널'}</th>
                      <th>주소</th>
                      <th>구분/상태</th>
                      <th>확인 사항</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importTab === 'apps'
                      ? appPreview.map((row) => (
                          <tr
                            key={row.rowNumber}
                            className={`${selectedRows.has(row.rowNumber) ? 'selected' : ''}${row.errors.length > 0 ? ' row-error' : ''}`}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedRows.has(row.rowNumber)}
                                disabled={row.errors.length > 0}
                                onChange={() => toggleRow(row.rowNumber)}
                                aria-label={`${row.rowNumber}행 선택`}
                              />
                            </td>
                            <td>{row.rowNumber}</td>
                            <td>
                              <div className="preview-name">{row.name || '(이름 없음)'}</div>
                            </td>
                            <td>
                              <div className="preview-url">{row.url || '주소 없음'}</div>
                            </td>
                            <td>
                              <div className="preview-url">
                                {row.categoryText || '구분 없음'}
                              </div>
                            </td>
                            <td>
                              <div className="row-flags">
                                {row.errors.map((error) => (
                                  <span className="field-error" key={error}>
                                    {error}
                                  </span>
                                ))}
                                {row.duplicate ? (
                                  <Badge tone="amber">중복 후보: {row.duplicateOf}</Badge>
                                ) : null}
                                {row.company ? (
                                  <Badge tone="red">회사 관련 제외 후보</Badge>
                                ) : null}
                                {row.warnings.map((warning) => (
                                  <span className="tiny muted" key={warning}>
                                    {warning}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))
                      : snsPreview.map((row) => (
                          <tr
                            key={row.rowNumber}
                            className={`${selectedRows.has(row.rowNumber) ? 'selected' : ''}${row.errors.length > 0 ? ' row-error' : ''}`}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedRows.has(row.rowNumber)}
                                disabled={row.errors.length > 0}
                                onChange={() => toggleRow(row.rowNumber)}
                                aria-label={`${row.rowNumber}행 선택`}
                              />
                            </td>
                            <td>{row.rowNumber}</td>
                            <td>
                              <div className="preview-name">
                                {row.channelName || '(채널명 없음)'}
                              </div>
                              <div className="preview-url">{row.platform}</div>
                            </td>
                            <td>
                              <div className="preview-url">{row.url || '주소 없음'}</div>
                            </td>
                            <td>
                              <div className="preview-url">
                                {row.statusText || '상태 없음'}
                              </div>
                            </td>
                            <td>
                              <div className="row-flags">
                                {row.errors.map((error) => (
                                  <span className="field-error" key={error}>
                                    {error}
                                  </span>
                                ))}
                                {row.duplicate ? (
                                  <Badge tone="amber">중복 후보: {row.duplicateOf}</Badge>
                                ) : null}
                                {row.company ? (
                                  <Badge tone="red">회사 관련 제외 후보</Badge>
                                ) : null}
                                {row.warnings.map((warning) => (
                                  <span className="tiny muted" key={warning}>
                                    {warning}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
              <div className="hint-box" style={{ marginTop: 10 }}>
                회사 관련 제외 후보는 제목·주소·구분·메모·태그에 ‘회사’, ‘업무’, ‘company’,
                ‘corp’ 같은 표시가 있을 때 기본 선택 해제됩니다. 자동 추정이므로 직접 확인하세요.
              </div>
            </div>
          </>
        ) : null}

        {importError ? (
          <div className="alert alert-error" role="alert">
            {importError}
          </div>
        ) : null}
        {importNotice ? (
          <div className="alert alert-info" role="status">
            {importNotice}
          </div>
        ) : null}

        <div className="import-actions">
          <span className="import-count">
            {importTab === 'apps' ? '앱' : 'SNS'} 목록에 추가 · 선택 {selectedRows.size}개
          </span>
          <div className="button-row">
            <button type="button" className="button ghost" onClick={closeImport}>
              닫기
            </button>
            <button
              type="button"
              className="button primary"
              onClick={importSelected}
              disabled={!parsedCsv || selectedRows.size === 0 || importNotice !== ''}
            >
              선택한 {selectedRows.size}개 가져오기
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.kind === 'sns' ? 'SNS 항목을 삭제할까요?' : '앱 항목을 삭제할까요?'}
        description="삭제한 항목은 되돌릴 수 없습니다. 필요하면 먼저 허브 백업을 내려받으세요."
        confirmLabel="삭제"
        tone="danger"
        onConfirm={deleteItem}
        onClose={() => setDeleteTarget(null)}
      >
        {deleteTarget ? (
          <p>
            <strong>
              {deleteTarget.kind === 'app'
                ? deleteTarget.item.name
                : `${deleteTarget.item.platform} / ${deleteTarget.item.channelName}`}
            </strong>
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
