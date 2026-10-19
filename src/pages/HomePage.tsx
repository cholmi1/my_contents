import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { LocalStore } from '../hooks/useLocalStore';
import type { HubData } from '../types/hub';
import { useToday } from '../hooks/useToday';
import { formatKoreanDate } from '../lib/date';
import { createId } from '../lib/id';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { ExternalLink } from '../components/ExternalLink';
import { PlusIcon } from '../components/Icons';

interface Props {
  store: LocalStore<HubData>;
}

export function HomePage({ store }: Props) {
  const today = useToday();
  const [checkText, setCheckText] = useState('');
  const [memoText, setMemoText] = useState('');
  const [checkError, setCheckError] = useState('');
  const [memoError, setMemoError] = useState('');
  const [memoNotice, setMemoNotice] = useState('');

  const schedules = useMemo(
    () =>
      store.data.schedules
        .filter((item) => item.date === today)
        .sort((a, b) => {
          if (a.startTime === b.startTime) return a.title.localeCompare(b.title);
          if (a.startTime === null) return 1;
          if (b.startTime === null) return -1;
          return a.startTime.localeCompare(b.startTime);
        }),
    [store.data.schedules, today],
  );

  const checklist = useMemo(
    () =>
      store.data.checklist
        .filter((item) => item.date === today)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [store.data.checklist, today],
  );

  const completedCount = checklist.filter((item) => item.done).length;

  function addChecklist(event: FormEvent) {
    event.preventDefault();
    const title = checkText.trim();
    if (!title) {
      setCheckError('체크리스트 내용을 입력하세요.');
      return;
    }
    setCheckError('');
    store.update(
      (current) => ({
        ...current,
        checklist: [
          ...current.checklist,
          {
            id: createId('check'),
            title,
            date: today,
            done: false,
            createdAt: new Date().toISOString(),
            isDemo: false,
          },
        ],
      }),
      '체크리스트 저장됨',
    );
    setCheckText('');
  }

  function toggleChecklist(id: string, done: boolean) {
    store.update(
      (current) => ({
        ...current,
        checklist: current.checklist.map((item) => (item.id === id ? { ...item, done } : item)),
      }),
      '체크리스트 저장됨',
    );
  }

  function deleteChecklist(id: string) {
    store.update(
      (current) => ({
        ...current,
        checklist: current.checklist.filter((item) => item.id !== id),
      }),
      '체크리스트 삭제됨',
    );
  }

  function saveQuickMemo(event: FormEvent) {
    event.preventDefault();
    const body = memoText.trim();
    if (!body) {
      setMemoError('빠른 메모 내용을 입력하세요.');
      return;
    }
    setMemoError('');
    const now = new Date().toISOString();
    const firstLine = body.split('\n')[0].trim();
    const title = firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine;
    store.update(
      (current) => ({
        ...current,
        memos: [
          {
            id: createId('memo'),
            kind: 'memo',
            title: title || '빠른 메모',
            body,
            createdAt: now,
            updatedAt: now,
            dueDate: null,
            priority: null,
            completed: false,
            completedAt: null,
            isDemo: false,
          },
          ...current.memos,
        ],
      }),
      '빠른 메모 저장됨',
    );
    setMemoText('');
    setMemoNotice('메모·할 일 메뉴에 저장되었습니다.');
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">오늘의 생활</p>
          <h1>
            <span className="date-line">
              {formatKoreanDate(today)}
              <span className="timezone">한국 시간 기준</span>
            </span>
          </h1>
          <p>오늘 일정, 체크리스트, 빠른 메모, 바로가기를 한곳에서 확인합니다.</p>
        </div>
      </header>

      <section className="card" aria-labelledby="home-schedule-title">
        <div className="card-head">
          <div>
            <h2 id="home-schedule-title" className="section-title">
              <span className="section-number">1</span>
              오늘 일정
            </h2>
            <p>Google Calendar 연동 전까지 아래 일정은 가상 데이터입니다.</p>
          </div>
          <Badge tone="demo">테스트 데이터</Badge>
        </div>

        {schedules.length === 0 ? (
          <EmptyState title="오늘 등록된 가상 일정이 없습니다.">
            실제 Google Calendar 연결은 아직 되지 않았습니다. 원본 캘린더에서 일정을 확인하세요.
          </EmptyState>
        ) : (
          <ul className="schedule-list">
            {schedules.map((item) => (
              <li className="schedule-row" key={item.id}>
                <div className="schedule-time">
                  {item.startTime ?? '시각 미정'}
                  {item.endTime ? <div className="tiny muted">~ {item.endTime}</div> : null}
                </div>
                <div className="schedule-body">
                  <div className="schedule-title">
                    {item.title}
                    {item.isDemo ? <Badge tone="demo">테스트 데이터</Badge> : null}
                  </div>
                  {item.note ? <p className="schedule-note">{item.note}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="calendar-status">
          <span>
            <strong>Google Calendar:</strong> 아직 연결되지 않음 · 읽기 전용 연결 예정
          </span>
          <ExternalLink
            href="https://calendar.google.com"
            className="button small secondary"
            label="Google Calendar 원본을 새 탭에서 열기"
          >
            원본 캘린더 열기
          </ExternalLink>
        </div>
      </section>

      <section className="card" aria-labelledby="home-checklist-title">
        <div className="card-head">
          <div>
            <h2 id="home-checklist-title" className="section-title">
              <span className="section-number">2</span>
              오늘 체크리스트
            </h2>
            <p>
              {checklist.length === 0
                ? '오늘 할 일을 직접 추가해 보세요.'
                : `${completedCount} / ${checklist.length} 완료`}
            </p>
          </div>
        </div>

        {checklist.length === 0 ? (
          <EmptyState title="오늘 체크리스트가 비어 있습니다.">
            아래 입력란에 오늘 꼭 확인할 일을 적고 추가하세요.
          </EmptyState>
        ) : (
          <ul className="check-list">
            {checklist.map((item) => (
              <li className={`check-row${item.done ? ' done' : ''}`} key={item.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={(event) => toggleChecklist(item.id, event.target.checked)}
                  />
                  <span className="check-text">{item.title}</span>
                  {item.isDemo ? <Badge tone="demo">가상</Badge> : null}
                </label>
                <button
                  type="button"
                  className="button text"
                  onClick={() => deleteChecklist(item.id)}
                  aria-label={`${item.title} 체크리스트 삭제`}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}

        {checkError ? (
          <p className="field-error" role="alert">
            {checkError}
          </p>
        ) : null}
        <form className="inline-form" onSubmit={addChecklist}>
          <label className="sr-only" htmlFor="new-checklist">
            새 체크리스트 항목
          </label>
          <input
            id="new-checklist"
            type="text"
            value={checkText}
            onChange={(event) => setCheckText(event.target.value)}
            placeholder="오늘 체크할 일을 입력하세요"
            maxLength={120}
          />
          <button type="submit" className="button primary">
            <PlusIcon /> 추가
          </button>
        </form>
      </section>

      <section className="card" aria-labelledby="home-memo-title">
        <div className="card-head">
          <div>
            <h2 id="home-memo-title" className="section-title">
              <span className="section-number">3</span>
              빠른 메모
            </h2>
            <p>저장한 메모는 메모·할 일 메뉴에도 표시됩니다.</p>
          </div>
        </div>
        <form className="quick-note-form" onSubmit={saveQuickMemo}>
          <label className="field-label" htmlFor="quick-memo">
            지금 떠오른 생각이나 할 일
          </label>
          <textarea
            id="quick-memo"
            value={memoText}
            onChange={(event) => setMemoText(event.target.value)}
            placeholder="예: 주말에 장보기 목록 정리하기"
            rows={3}
            maxLength={2000}
          />
          <div className="row-between">
            <span className="tiny muted">첫 줄이 메모 제목으로 사용됩니다.</span>
            <button type="submit" className="button primary">
              메모 저장
            </button>
          </div>
          {memoError ? (
            <p className="field-error" role="alert">
              {memoError}
            </p>
          ) : null}
          {memoNotice ? (
            <p className="small" role="status" style={{ color: 'var(--accent-dark)' }}>
              {memoNotice}{' '}
              <a href="#/notes" onClick={() => setMemoNotice('')}>
                메모·할 일에서 보기
              </a>
            </p>
          ) : null}
        </form>
      </section>

      <section className="card" aria-labelledby="home-shortcut-title">
        <div className="card-head">
          <div>
            <h2 id="home-shortcut-title" className="section-title">
              <span className="section-number">4</span>
              바로가기
            </h2>
            <p>외부 링크는 새 탭에서 열립니다. Gmail은 열기만 하며 메일을 읽지 않습니다.</p>
          </div>
        </div>
        <div className="shortcut-grid">
          <a className="shortcut" href="#/ledger">
            <strong>가계부</strong>
            <span>이 사이트의 가계부 테스트로 이동</span>
          </a>
          <ExternalLink
            href="https://mail.google.com"
            className="shortcut"
            label="Gmail을 새 탭에서 열기"
          >
            <strong>Gmail</strong>
            <span>메일 열기 · 읽기/전송 기능 없음</span>
          </ExternalLink>
          <ExternalLink
            href="https://calendar.google.com"
            className="shortcut"
            label="Google Calendar를 새 탭에서 열기"
          >
            <strong>Google Calendar</strong>
            <span>원본 캘린더 열기 · 연동 아님</span>
          </ExternalLink>
        </div>
      </section>
    </div>
  );
}
