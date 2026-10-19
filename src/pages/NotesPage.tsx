import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { LocalStore } from '../hooks/useLocalStore';
import type { HubData, MemoItem, MemoKind, Priority } from '../types/hub';
import { useToday } from '../hooks/useToday';
import { createId } from '../lib/id';
import { formatKoreanDate } from '../lib/date';
import { Badge } from '../components/Badge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { FormField } from '../components/FormField';
import { Modal } from '../components/Modal';
import { PlusIcon } from '../components/Icons';

interface Props {
  store: LocalStore<HubData>;
}

type KindFilter = 'all' | MemoKind;
type StatusFilter = 'all' | 'active' | 'done';

interface FormState {
  kind: MemoKind;
  title: string;
  body: string;
  dueDate: string;
  priority: '' | Priority;
}

const EMPTY_FORM: FormState = {
  kind: 'todo',
  title: '',
  body: '',
  dueDate: '',
  priority: '',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  high: '높음',
  normal: '보통',
  low: '낮음',
};

export function NotesPage({ store }: Props) {
  const today = useToday();
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [editTarget, setEditTarget] = useState<MemoItem | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editError, setEditError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<MemoItem | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return store.data.memos
      .filter((item) => {
        if (kindFilter !== 'all' && item.kind !== kindFilter) return false;
        if (statusFilter !== 'all') {
          if (item.kind !== 'todo') return false;
          if (statusFilter === 'active' && item.completed) return false;
          if (statusFilter === 'done' && !item.completed) return false;
        }
        if (!query) return true;
        return (
          item.title.toLowerCase().includes(query) || item.body.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (a.kind === 'todo' && b.kind === 'todo' && a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [store.data.memos, kindFilter, statusFilter, search]);

  const activeTodoCount = store.data.memos.filter(
    (item) => item.kind === 'todo' && !item.completed,
  ).length;
  const memoCount = store.data.memos.filter((item) => item.kind === 'memo').length;

  function addItem(event: FormEvent) {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setFormError('제목을 입력하세요.');
      return;
    }
    setFormError('');
    const now = new Date().toISOString();
    store.update(
      (current) => ({
        ...current,
        memos: [
          {
            id: createId('memo'),
            kind: form.kind,
            title,
            body: form.body.trim(),
            createdAt: now,
            updatedAt: now,
            dueDate: form.kind === 'todo' && form.dueDate ? form.dueDate : null,
            priority: form.kind === 'todo' && form.priority ? form.priority : null,
            completed: false,
            completedAt: null,
            isDemo: false,
          },
          ...current.memos,
        ],
      }),
      form.kind === 'todo' ? '할 일 추가됨' : '메모 추가됨',
    );
    const kind = form.kind;
    setForm({ ...EMPTY_FORM, kind });
  }

  function openEdit(item: MemoItem) {
    setEditTarget(item);
    setEditForm({
      kind: item.kind,
      title: item.title,
      body: item.body,
      dueDate: item.dueDate ?? '',
      priority: item.priority ?? '',
    });
    setEditError('');
  }

  function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editTarget) return;
    const title = editForm.title.trim();
    if (!title) {
      setEditError('제목을 입력하세요.');
      return;
    }
    const now = new Date().toISOString();
    const keepCompleted = editTarget.kind === 'todo' && editForm.kind === 'todo';
    store.update(
      (current) => ({
        ...current,
        memos: current.memos.map((item) =>
          item.id === editTarget.id
            ? {
                ...item,
                kind: editForm.kind,
                title,
                body: editForm.body.trim(),
                dueDate: editForm.kind === 'todo' && editForm.dueDate ? editForm.dueDate : null,
                priority:
                  editForm.kind === 'todo' && editForm.priority ? editForm.priority : null,
                completed: keepCompleted ? item.completed : false,
                completedAt: keepCompleted ? item.completedAt : null,
                updatedAt: now,
              }
            : item,
        ),
      }),
      '메모·할 일 수정됨',
    );
    setEditTarget(null);
  }

  function toggleCompleted(item: MemoItem, completed: boolean) {
    const now = new Date().toISOString();
    store.update(
      (current) => ({
        ...current,
        memos: current.memos.map((memo) =>
          memo.id === item.id
            ? {
                ...memo,
                completed,
                completedAt: completed ? now : null,
                updatedAt: now,
              }
            : memo,
        ),
      }),
      '완료 상태 저장됨',
    );
  }

  function deleteItem() {
    if (!deleteTarget) return;
    store.update(
      (current) => ({
        ...current,
        memos: current.memos.filter((item) => item.id !== deleteTarget.id),
      }),
      '메모·할 일 삭제됨',
    );
    setDeleteTarget(null);
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">생각과 해야 할 일</p>
          <h1>메모·할 일</h1>
          <p>
            짧은 메모와 할 일을 함께 보관합니다. 기한과 우선순위는 필요한 항목에만 선택적으로
            지정하세요.
          </p>
        </div>
        <div className="actions">
          <span className="count-chip">할 일 미완료 {activeTodoCount}개</span>
          <span className="count-chip">메모 {memoCount}개</span>
        </div>
      </header>

      <section className="card" aria-labelledby="new-note-title">
        <div className="card-head">
          <div>
            <h2 id="new-note-title">새로 추가</h2>
            <p>제목만 입력해도 저장할 수 있습니다. 기한과 우선순위는 선택 사항입니다.</p>
          </div>
        </div>
        <form className="stack-sm" onSubmit={addItem}>
          <div className="segmented" role="group" aria-label="메모 종류">
            <button
              type="button"
              aria-pressed={form.kind === 'todo'}
              onClick={() => setForm({ ...form, kind: 'todo' })}
            >
              할 일
            </button>
            <button
              type="button"
              aria-pressed={form.kind === 'memo'}
              onClick={() => setForm({ ...form, kind: 'memo' })}
            >
              메모
            </button>
          </div>
          <FormField label="제목" htmlFor="new-note-title-input" required error={formError}>
            <input
              id="new-note-title-input"
              type="text"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder={form.kind === 'todo' ? '예: 생활비 영수증 정리' : '예: 여행 아이디어'}
              maxLength={120}
            />
          </FormField>
          <FormField label="본문" htmlFor="new-note-body" hint="선택 사항입니다.">
            <textarea
              id="new-note-body"
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
              rows={3}
              maxLength={5000}
              placeholder="자세한 내용을 적어 두세요."
            />
          </FormField>
          {form.kind === 'todo' ? (
            <details>
              <summary className="small muted" style={{ cursor: 'pointer' }}>
                기한·우선순위 추가 (선택)
              </summary>
              <div className="form-grid" style={{ marginTop: 10 }}>
                <FormField label="기한" htmlFor="new-note-due">
                  <input
                    id="new-note-due"
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                  />
                </FormField>
                <FormField label="우선순위" htmlFor="new-note-priority">
                  <select
                    id="new-note-priority"
                    value={form.priority}
                    onChange={(event) =>
                      setForm({ ...form, priority: event.target.value as '' | Priority })
                    }
                  >
                    <option value="">지정 안 함</option>
                    <option value="high">높음</option>
                    <option value="normal">보통</option>
                    <option value="low">낮음</option>
                  </select>
                </FormField>
              </div>
            </details>
          ) : null}
          <div className="row-between">
            <span className="tiny muted">홈의 빠른 메모도 이 목록에 표시됩니다.</span>
            <button type="submit" className="button primary">
              <PlusIcon /> {form.kind === 'todo' ? '할 일 추가' : '메모 추가'}
            </button>
          </div>
        </form>
      </section>

      <section className="filter-bar" aria-label="메모 검색과 필터">
        <FormField label="검색" htmlFor="note-search" className="grow">
          <input
            id="note-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="제목이나 본문 검색"
          />
        </FormField>
        <FormField label="종류" htmlFor="note-kind-filter">
          <select
            id="note-kind-filter"
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value as KindFilter)}
          >
            <option value="all">전체</option>
            <option value="memo">메모</option>
            <option value="todo">할 일</option>
          </select>
        </FormField>
        <FormField label="할 일 상태" htmlFor="note-status-filter">
          <select
            id="note-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">전체</option>
            <option value="active">미완료</option>
            <option value="done">완료</option>
          </select>
        </FormField>
      </section>

      {statusFilter !== 'all' ? (
        <p className="tiny muted">
          할 일 상태 필터를 사용하는 동안에는 메모가 목록에서 제외됩니다.
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState title={store.data.memos.length === 0 ? '아직 메모가 없습니다.' : '조건에 맞는 항목이 없습니다.'}>
          {store.data.memos.length === 0
            ? '위 입력란에 할 일이나 메모를 추가해 보세요. 홈의 빠른 메모도 사용할 수 있습니다.'
            : '검색어나 필터를 바꿔 보세요.'}
        </EmptyState>
      ) : (
        <div className="note-list">
          {filtered.map((item) => {
            const overdue =
              item.kind === 'todo' && !item.completed && item.dueDate !== null && item.dueDate < today;
            return (
              <article
                className={`note-card ${item.kind}${item.completed ? ' done' : ''}`}
                key={item.id}
              >
                <div className="note-head">
                  <div className="note-title-row">
                    {item.kind === 'todo' ? (
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={(event) => toggleCompleted(item, event.target.checked)}
                        aria-label={`${item.title} 완료`}
                      />
                    ) : null}
                    <div>
                      <p className="note-title">{item.title}</p>
                    </div>
                  </div>
                  <div className="note-actions">
                    <button
                      type="button"
                      className="button text"
                      onClick={() => openEdit(item)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="button text"
                      style={{ color: 'var(--red)' }}
                      onClick={() => setDeleteTarget(item)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
                {item.body ? <p className="note-body">{item.body}</p> : null}
                <div className="note-meta">
                  <Badge tone={item.kind === 'todo' ? 'blue' : 'neutral'}>
                    {item.kind === 'todo' ? '할 일' : '메모'}
                  </Badge>
                  {item.isDemo ? <Badge tone="demo">가상</Badge> : null}
                  {item.priority ? (
                    <Badge tone={item.priority === 'high' ? 'red' : item.priority === 'low' ? 'neutral' : 'amber'}>
                      우선순위 {PRIORITY_LABELS[item.priority]}
                    </Badge>
                  ) : null}
                  {item.dueDate ? (
                    <span className={overdue ? 'field-error' : undefined}>
                      기한 {formatKoreanDate(item.dueDate, false)}
                      {overdue ? ' · 기한 지남' : ''}
                    </span>
                  ) : null}
                  <span>수정 {new Date(item.updatedAt).toLocaleDateString('ko-KR')}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        title="메모·할 일 수정"
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
      >
        <form className="stack" onSubmit={saveEdit}>
          <div className="segmented" role="group" aria-label="메모 종류">
            <button
              type="button"
              aria-pressed={editForm.kind === 'todo'}
              onClick={() => setEditForm({ ...editForm, kind: 'todo' })}
            >
              할 일
            </button>
            <button
              type="button"
              aria-pressed={editForm.kind === 'memo'}
              onClick={() => setEditForm({ ...editForm, kind: 'memo' })}
            >
              메모
            </button>
          </div>
          <FormField label="제목" htmlFor="edit-note-title" required error={editError}>
            <input
              id="edit-note-title"
              type="text"
              value={editForm.title}
              onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
              maxLength={120}
            />
          </FormField>
          <FormField label="본문" htmlFor="edit-note-body">
            <textarea
              id="edit-note-body"
              value={editForm.body}
              onChange={(event) => setEditForm({ ...editForm, body: event.target.value })}
              rows={5}
              maxLength={5000}
            />
          </FormField>
          {editForm.kind === 'todo' ? (
            <div className="form-grid">
              <FormField label="기한" htmlFor="edit-note-due">
                <input
                  id="edit-note-due"
                  type="date"
                  value={editForm.dueDate}
                  onChange={(event) => setEditForm({ ...editForm, dueDate: event.target.value })}
                />
              </FormField>
              <FormField label="우선순위" htmlFor="edit-note-priority">
                <select
                  id="edit-note-priority"
                  value={editForm.priority}
                  onChange={(event) =>
                    setEditForm({ ...editForm, priority: event.target.value as '' | Priority })
                  }
                >
                  <option value="">지정 안 함</option>
                  <option value="high">높음</option>
                  <option value="normal">보통</option>
                  <option value="low">낮음</option>
                </select>
              </FormField>
            </div>
          ) : null}
          <div className="modal-actions">
            <button type="button" className="button ghost" onClick={() => setEditTarget(null)}>
              취소
            </button>
            <button type="submit" className="button primary">
              수정 저장
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="메모·할 일을 삭제할까요?"
        description="삭제한 내용은 되돌릴 수 없습니다. 필요하면 먼저 허브 백업을 내려받으세요."
        confirmLabel="삭제"
        tone="danger"
        onConfirm={deleteItem}
        onClose={() => setDeleteTarget(null)}
      >
        {deleteTarget ? <p><strong>{deleteTarget.title}</strong></p> : null}
      </ConfirmDialog>
    </div>
  );
}
