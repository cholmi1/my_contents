import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { LocalStore } from '../hooks/useLocalStore';
import type { HubData, RoutineCycle, RoutineItem, RoutineStatus } from '../types/hub';
import { ROUTINE_CYCLE_LABELS, WEEKDAY_LABELS } from '../types/hub';
import { useToday } from '../hooks/useToday';
import { formatKoreanDate, weekdayLabel, weekdayOf } from '../lib/date';
import { createId } from '../lib/id';
import {
  describeSchedule,
  displayOccurrences,
  isMonthEndAdjusted,
  routineNeedsSetup,
  todayRoutines,
  toggleOccurrence,
  upcomingPreview,
} from '../lib/recurring';
import { Badge } from '../components/Badge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { FormField } from '../components/FormField';
import { Modal } from '../components/Modal';
import { PlusIcon } from '../components/Icons';

interface Props {
  store: LocalStore<HubData>;
}

type Filter = 'all' | 'current' | 'upcoming' | 'setup' | 'disabled';

interface FormState {
  title: string;
  cycle: RoutineCycle;
  weekday: string;
  dayOfMonth: string;
  time: string;
  status: RoutineStatus;
  enabled: boolean;
  note: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  cycle: 'daily',
  weekday: '',
  dayOfMonth: '',
  time: '',
  status: 'current',
  enabled: true,
  note: '',
};

function shortDate(date: string): string {
  return date.slice(5).replace('-', '/');
}

export function RoutinesPage({ store }: Props) {
  const today = useToday();
  const [filter, setFilter] = useState<Filter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<RoutineItem | null>(null);

  const todays = useMemo(() => todayRoutines(store.data.routines, today), [store.data.routines, today]);
  const incompleteToday = todays.filter((routine) => !routine.completions[today]);

  const routines = useMemo(() => {
    const sorted = [...store.data.routines].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'current' ? -1 : 1;
      return a.createdAt.localeCompare(b.createdAt);
    });
    if (filter === 'current') return sorted.filter((item) => item.status === 'current' && item.enabled);
    if (filter === 'upcoming') return sorted.filter((item) => item.status === 'upcoming');
    if (filter === 'setup') return sorted.filter((item) => routineNeedsSetup(item));
    if (filter === 'disabled') return sorted.filter((item) => !item.enabled);
    return sorted;
  }, [store.data.routines, filter]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(routine: RoutineItem) {
    setEditing(routine);
    setForm({
      title: routine.title,
      cycle: routine.cycle,
      weekday: routine.weekday === null ? '' : String(routine.weekday),
      dayOfMonth: routine.dayOfMonth === null ? '' : String(routine.dayOfMonth),
      time: routine.time ?? '',
      status: routine.status,
      enabled: routine.enabled,
      note: routine.note,
    });
    setFormError('');
    setFormOpen(true);
  }

  function saveRoutine(event: FormEvent) {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setFormError('반복 업무 제목을 입력하세요.');
      return;
    }
    const weekday =
      form.cycle === 'weekly' && form.weekday !== '' ? Number(form.weekday) : null;
    const dayOfMonth =
      form.cycle === 'monthly' && form.dayOfMonth !== '' ? Number(form.dayOfMonth) : null;
    if (weekday !== null && (!Number.isInteger(weekday) || weekday < 0 || weekday > 6)) {
      setFormError('요일을 올바르게 선택하세요.');
      return;
    }
    if (
      dayOfMonth !== null &&
      (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31)
    ) {
      setFormError('월 날짜는 1~31 사이로 입력하세요.');
      return;
    }
    const now = new Date().toISOString();
    const next: RoutineItem = {
      id: editing?.id ?? createId('routine'),
      title,
      cycle: form.cycle,
      weekday,
      dayOfMonth,
      time: form.time || null,
      status: form.status,
      enabled: form.enabled,
      completions: editing?.completions ?? {},
      note: form.note.trim(),
      createdAt: editing?.createdAt ?? now,
      isDemo: editing?.isDemo ?? false,
    };

    store.update(
      (current) => ({
        ...current,
        routines: editing
          ? current.routines.map((routine) => (routine.id === editing.id ? next : routine))
          : [...current.routines, next],
      }),
      editing ? '반복 업무 수정됨' : '반복 업무 추가됨',
    );
    setFormOpen(false);
    setEditing(null);
  }

  function toggleEnabled(routine: RoutineItem) {
    store.update(
      (current) => ({
        ...current,
        routines: current.routines.map((item) =>
          item.id === routine.id ? { ...item, enabled: !item.enabled } : item,
        ),
      }),
      '반복 업무 활성 상태 저장됨',
    );
  }

  function setCompletion(routine: RoutineItem, date: string, completed: boolean) {
    store.update(
      (current) => ({
        ...current,
        routines: current.routines.map((item) =>
          item.id === routine.id ? toggleOccurrence(item, date, completed) : item,
        ),
      }),
      '회차 완료 상태 저장됨',
    );
  }

  function deleteRoutine() {
    if (!deleteTarget) return;
    store.update(
      (current) => ({
        ...current,
        routines: current.routines.filter((item) => item.id !== deleteTarget.id),
      }),
      '반복 업무 삭제됨',
    );
    setDeleteTarget(null);
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">매일 조금씩</p>
          <h1>개인 반복 업무</h1>
          <p>
            회사 업무가 아닌 개인 습관과 생활 루틴만 관리합니다. 미정인 요일·날짜·시각은
            임의로 정하지 않고 설정 필요로 표시합니다.
          </p>
        </div>
        <div className="actions">
          <button type="button" className="button primary" onClick={openCreate}>
            <PlusIcon /> 반복 업무 추가
          </button>
        </div>
      </header>

      <section className="card" aria-labelledby="routine-alert-title">
        <div className="card-head">
          <div>
            <h2 id="routine-alert-title" className="section-title">
              사이트 안 알림
            </h2>
            <p>오늘 예정된 실천 중 항목만 표시합니다. 푸시 알림이나 외부 예약 알림은 보내지 않습니다.</p>
          </div>
          <Badge tone={incompleteToday.length > 0 ? 'amber' : 'green'}>
            {incompleteToday.length > 0 ? `${incompleteToday.length}개 남음` : '오늘 완료'}
          </Badge>
        </div>
        {incompleteToday.length === 0 ? (
          <p className="muted small">
            오늘 미완료 반복 업무가 없습니다. 완료한 회차는 해당 날짜에만 기록됩니다.
          </p>
        ) : (
          <ul className="notice-list">
            {incompleteToday.map((routine) => (
              <li className="notice-item" key={routine.id}>
                <span className="notice-bullet" aria-hidden="true" />
                <div style={{ flex: 1 }}>
                  <span className="strong">{routine.title}</span>{' '}
                  <span className="muted small">
                    {routine.time ? `${routine.time} · ` : '시각 미정 · '}
                    {formatKoreanDate(today)}
                  </span>
                </div>
                <button
                  type="button"
                  className="button small secondary"
                  onClick={() => setCompletion(routine, today, true)}
                >
                  오늘 완료
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="row-between">
        <div className="segmented" role="group" aria-label="반복 업무 필터">
          {(
            [
              ['all', '전체'],
              ['current', '실천 중'],
              ['upcoming', '앞으로'],
              ['setup', '설정 필요'],
              ['disabled', '비활성'],
            ] as [Filter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="tiny muted">총 {store.data.routines.length}개</span>
      </div>

      {routines.length === 0 ? (
        <EmptyState
          title="표시할 반복 업무가 없습니다."
          action={
            <button type="button" className="button primary" onClick={openCreate}>
              첫 반복 업무 추가하기
            </button>
          }
        >
          매일·매주·매월 반복할 개인 항목을 추가하면 회차별로 완료를 기록할 수 있습니다.
        </EmptyState>
      ) : (
        <div className="routine-list">
          {routines.map((routine) => {
            const needsSetup = routineNeedsSetup(routine);
            const occurrences =
              routine.enabled && routine.status === 'current' && !needsSetup
                ? displayOccurrences(routine, today)
                : [];
            return (
              <article
                className={`routine-card${routine.enabled ? '' : ' disabled'}`}
                key={routine.id}
                aria-labelledby={`routine-${routine.id}`}
              >
                <div className="routine-head">
                  <div style={{ minWidth: 0 }}>
                    <div className="routine-title" id={`routine-${routine.id}`}>
                      {routine.title}
                      <Badge tone={routine.status === 'current' ? 'green' : 'blue'}>
                        {routine.status === 'current' ? '현재 실천 중' : '앞으로 할 일'}
                      </Badge>
                      {!routine.enabled ? <Badge tone="neutral">비활성</Badge> : null}
                      {needsSetup ? <Badge tone="amber">설정 필요</Badge> : null}
                      {routine.isDemo ? <Badge tone="demo">가상</Badge> : null}
                    </div>
                    <div className="routine-meta">
                      <span>{describeSchedule(routine)}</span>
                      {!needsSetup ? <span>· {upcomingPreview(routine, today)}</span> : null}
                    </div>
                  </div>
                  <div className="routine-actions">
                    <button
                      type="button"
                      className="button small ghost"
                      onClick={() => openEdit(routine)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="button small ghost"
                      onClick={() => toggleEnabled(routine)}
                    >
                      {routine.enabled ? '비활성화' : '활성화'}
                    </button>
                    <button
                      type="button"
                      className="button small danger-outline"
                      onClick={() => setDeleteTarget(routine)}
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {routine.note ? <p className="entity-note">{routine.note}</p> : null}

                {needsSetup ? (
                  <div className="notice-strip warm" style={{ marginTop: 12 }}>
                    <span>
                      {routine.cycle === 'weekly'
                        ? '요일이 아직 정해지지 않았습니다.'
                        : '매월 날짜가 아직 정해지지 않았습니다.'}{' '}
                      수정에서 직접 지정하기 전에는 회차를 만들지 않습니다.
                    </span>
                  </div>
                ) : null}

                {routine.status === 'upcoming' ? (
                  <p className="hint-box" style={{ marginTop: 12 }}>
                    앞으로 할 일로 표시되어 있습니다. 실제로 시작할 때 수정에서 ‘현재 실천 중’으로
                    바꾸면 회차 완료를 기록할 수 있습니다.
                  </p>
                ) : null}

                {!routine.enabled ? (
                  <p className="hint-box" style={{ marginTop: 12 }}>
                    비활성 상태입니다. 활성화하면 설정된 회차가 다시 표시됩니다.
                  </p>
                ) : null}

                {occurrences.length > 0 ? (
                  <>
                    <div className="occurrence-grid" aria-label={`${routine.title} 회차 목록`}>
                      {occurrences.map((date) => {
                        const done = routine.completions[date] === true;
                        return (
                          <div
                            className={`occurrence${date === today ? ' today' : ''}${done ? ' done' : ''}`}
                            key={date}
                          >
                            <label>
                              <input
                                type="checkbox"
                                checked={done}
                                onChange={(event) =>
                                  setCompletion(routine, date, event.target.checked)
                                }
                              />
                              <span>{shortDate(date)}</span>
                              <span>
                                {weekdayLabel(weekdayOf(date))}
                                {date === today ? ' · 오늘' : ''}
                              </span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                    <p className="month-rule">
                      완료는 날짜별 회차에만 저장됩니다. 다음 회차로 상태가 넘어가지 않습니다.
                      {routine.cycle === 'monthly'
                        ? ' 선택한 날짜가 없는 달은 그 달의 마지막 날에 표시됩니다.'
                        : ''}
                      {routine.cycle === 'monthly' &&
                      occurrences.some((date) => isMonthEndAdjusted(routine, date))
                        ? ' (이번 표시 중 월말 조정된 회차가 있습니다.)'
                        : ''}
                    </p>
                  </>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <div className="notice-strip">
        <span>
          <strong>월말 규칙:</strong> 매월 29~31일로 설정한 항목은 해당 날짜가 없는 달에 그 달의
          마지막 날 회차로 표시됩니다. 희망 항목은 연체로 표시하지 않으며, 지난 회차 미완료도
          별도로 재촉하지 않습니다.
        </span>
      </div>

      <Modal
        title={editing ? '반복 업무 수정' : '반복 업무 추가'}
        description="요일이나 날짜를 아직 정하지 않았다면 비워 두세요. 설정 필요로 표시됩니다."
        open={formOpen}
        onClose={() => setFormOpen(false)}
      >
        <form className="stack" onSubmit={saveRoutine}>
          <FormField label="제목" htmlFor="routine-title-input" required error={formError}>
            <input
              id="routine-title-input"
              type="text"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="예: 저녁 산책 20분"
              maxLength={120}
            />
          </FormField>

          <div className="form-grid">
            <FormField label="반복 주기" htmlFor="routine-cycle">
              <select
                id="routine-cycle"
                value={form.cycle}
                onChange={(event) =>
                  setForm({ ...form, cycle: event.target.value as RoutineCycle })
                }
              >
                {Object.entries(ROUTINE_CYCLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>

            {form.cycle === 'weekly' ? (
              <FormField
                label="요일"
                htmlFor="routine-weekday"
                hint="비워 두면 설정 필요로 표시됩니다."
              >
                <select
                  id="routine-weekday"
                  value={form.weekday}
                  onChange={(event) => setForm({ ...form, weekday: event.target.value })}
                >
                  <option value="">선택 안 함 (설정 필요)</option>
                  {WEEKDAY_LABELS.map((label, index) => (
                    <option key={label} value={index}>
                      {label}요일
                    </option>
                  ))}
                </select>
              </FormField>
            ) : null}

            {form.cycle === 'monthly' ? (
              <FormField
                label="매월 날짜"
                htmlFor="routine-day"
                hint="1~31. 없는 날짜는 월말로 조정됩니다. 비워 두면 설정 필요입니다."
              >
                <input
                  id="routine-day"
                  type="number"
                  min={1}
                  max={31}
                  value={form.dayOfMonth}
                  onChange={(event) => setForm({ ...form, dayOfMonth: event.target.value })}
                  placeholder="예: 25"
                />
              </FormField>
            ) : null}

            <FormField
              label="선택 시각"
              htmlFor="routine-time"
              hint="비워 두면 시각 미정으로 표시됩니다."
            >
              <input
                id="routine-time"
                type="time"
                value={form.time}
                onChange={(event) => setForm({ ...form, time: event.target.value })}
              />
            </FormField>

            <FormField label="진행 상태" htmlFor="routine-status">
              <select
                id="routine-status"
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as RoutineStatus })
                }
              >
                <option value="current">현재 실천 중</option>
                <option value="upcoming">앞으로 할 일</option>
              </select>
            </FormField>
          </div>

          <label className="toggle">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
            />
            활성 상태로 두기
          </label>

          <FormField label="메모" htmlFor="routine-note" hint="선택 사항입니다.">
            <textarea
              id="routine-note"
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              rows={3}
              maxLength={500}
            />
          </FormField>

          <div className="hint-box">
            <strong>저장 후에도 회차별 완료 기록은 유지됩니다.</strong> 주기나 요일을 바꾸면 새
            회차 계산에만 반영되고, 기존 날짜의 완료 기록은 삭제되지 않습니다.
          </div>

          <div className="modal-actions">
            <button type="button" className="button ghost" onClick={() => setFormOpen(false)}>
              취소
            </button>
            <button type="submit" className="button primary">
              {editing ? '수정 저장' : '추가하기'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="반복 업무를 삭제할까요?"
        description="이 항목과 저장된 회차 완료 기록이 함께 삭제됩니다."
        confirmLabel="삭제"
        tone="danger"
        onConfirm={deleteRoutine}
        onClose={() => setDeleteTarget(null)}
      >
        {deleteTarget ? (
          <p>
            <strong>{deleteTarget.title}</strong>
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
