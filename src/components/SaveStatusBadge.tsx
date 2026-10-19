import type { SaveStatus } from '../hooks/useLocalStore';

export function SaveStatusBadge({ status }: { status: SaveStatus }) {
  if (status.tone === 'idle') {
    return <span className="save-status save-idle">브라우저에 자동 저장</span>;
  }
  return (
    <span
      className={`save-status ${status.tone === 'error' ? 'save-error' : 'save-ok'}`}
      role={status.tone === 'error' ? 'alert' : 'status'}
    >
      {status.tone === 'error' ? '저장 오류 · ' : '저장됨 · '}
      {status.message}
    </span>
  );
}
