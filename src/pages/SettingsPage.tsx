import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { LocalStore } from '../hooks/useLocalStore';
import type { HubData } from '../types/hub';
import type { LedgerData } from '../types/ledger';
import { createEmptyHub, createEmptyLedger, createSampleHub, createSampleLedger, createSampleLedgerAddition } from '../data/samples';
import { backupFileName, createBackupEnvelope, parseHubBackup, parseLedgerBackup } from '../lib/backup';
import { summarizeHub, summarizeLedger } from '../lib/validation';
import { downloadJson } from '../lib/storage';
import { formatDateTime } from '../lib/date';
import { Badge } from '../components/Badge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { DownloadIcon, UploadIcon } from '../components/Icons';

interface Props {
  hubStore: LocalStore<HubData>;
  ledgerStore: LocalStore<LedgerData>;
}

type PendingImport =
  | {
      kind: 'hub';
      fileName: string;
      exportedAt: string;
      summary: string[];
      warnings: string[];
      data: HubData;
    }
  | {
      kind: 'ledger';
      fileName: string;
      exportedAt: string;
      summary: string[];
      warnings: string[];
      data: LedgerData;
    };

type ResetTarget = 'hub-sample' | 'hub-empty' | 'ledger-sample' | 'ledger-empty' | null;

export function SettingsPage({ hubStore, ledgerStore }: Props) {
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [pendingError, setPendingError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [hubImportError, setHubImportError] = useState('');
  const [ledgerImportError, setLedgerImportError] = useState('');
  const [resetTarget, setResetTarget] = useState<ResetTarget>(null);
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    setConfirmed(false);
    setPendingError('');
  }, [pending]);

  function exportHub() {
    const exportedAt = new Date();
    downloadJson(
      backupFileName('hub', exportedAt),
      createBackupEnvelope('hub', hubStore.data, exportedAt.toISOString()),
    );
    hubStore.update(
      (current) => ({
        ...current,
        meta: { ...current.meta, lastBackupAt: exportedAt.toISOString() },
      }),
      '허브 백업 파일을 내려받았습니다',
    );
  }

  function exportLedger() {
    const exportedAt = new Date();
    downloadJson(
      backupFileName('ledger', exportedAt),
      createBackupEnvelope('ledger', ledgerStore.data, exportedAt.toISOString()),
    );
    ledgerStore.update(
      (current) => ({
        ...current,
        meta: { ...current.meta, lastBackupAt: exportedAt.toISOString() },
      }),
      '가계부 백업 파일을 내려받았습니다',
    );
  }

  async function handleHubFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    setHubImportError('');
    try {
      const text = await file.text();
      const result = parseHubBackup(text);
      if (!result.ok) {
        setHubImportError(`가져오지 않았습니다. 기존 허브 데이터는 그대로입니다.\n${result.errors.join(' / ')}`);
        return;
      }
      setPending({
        kind: 'hub',
        fileName: file.name,
        exportedAt: result.exportedAt,
        summary: summarizeHub(result.data),
        warnings: result.warnings,
        data: result.data,
      });
    } catch {
      setHubImportError('파일을 읽지 못했습니다. 기존 허브 데이터는 그대로입니다.');
    } finally {
      input.value = '';
    }
  }

  async function handleLedgerFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    setLedgerImportError('');
    try {
      const text = await file.text();
      const result = parseLedgerBackup(text);
      if (!result.ok) {
        setLedgerImportError(
          `가져오지 않았습니다. 기존 가계부 데이터는 그대로입니다.\n${result.errors.join(' / ')}`,
        );
        return;
      }
      setPending({
        kind: 'ledger',
        fileName: file.name,
        exportedAt: result.exportedAt,
        summary: summarizeLedger(result.data),
        warnings: result.warnings,
        data: result.data,
      });
    } catch {
      setLedgerImportError('파일을 읽지 못했습니다. 기존 가계부 데이터는 그대로입니다.');
    } finally {
      input.value = '';
    }
  }

  function runImport() {
    if (!pending || !confirmed) return;
    const result =
      pending.kind === 'hub'
        ? hubStore.replace(pending.data, '허브 백업을 가져왔습니다')
        : ledgerStore.replace(pending.data, '가계부 백업을 가져왔습니다');
    if (result.ok) {
      setPending(null);
    } else {
      setPendingError(result.error ?? '가져오기에 실패했습니다. 기존 데이터를 유지합니다.');
    }
  }

  function addSampleHub() {
    const sample = createSampleHub();
    hubStore.update(
      (current) => ({
        ...current,
        schedules: [...current.schedules, ...sample.schedules],
        checklist: [...current.checklist, ...sample.checklist],
        memos: [...current.memos, ...sample.memos],
        routines: [...current.routines, ...sample.routines],
        apps: [...current.apps, ...sample.apps],
        sns: [...current.sns, ...sample.sns],
      }),
      '허브 가상 데이터 추가됨',
    );
  }

  function addSampleLedger() {
    const addition = createSampleLedgerAddition();
    ledgerStore.update(
      (current) => {
        const alias = current.accounts.some(
          (account) => account.alias === addition.accounts[0].alias,
        )
          ? `${addition.accounts[0].alias} ${current.accounts.length + 1}`
          : addition.accounts[0].alias;
        return {
          ...current,
          accounts: [...current.accounts, { ...addition.accounts[0], alias }],
          balances: [...current.balances, ...addition.balances],
          transactions: [...current.transactions, ...addition.transactions],
        };
      },
      '가계부 가상 데이터 추가됨',
    );
  }

  function runReset() {
    setResetError('');
    if (resetTarget === 'hub-sample') {
      hubStore.replace(createSampleHub(), '허브를 가상 데이터로 되돌렸습니다');
    } else if (resetTarget === 'hub-empty') {
      hubStore.replace(createEmptyHub(), '허브를 모두 비웠습니다');
    } else if (resetTarget === 'ledger-sample') {
      ledgerStore.replace(createSampleLedger(), '가계부를 가상 데이터로 되돌렸습니다');
    } else if (resetTarget === 'ledger-empty') {
      ledgerStore.replace(createEmptyLedger(), '가계부를 모두 비웠습니다');
    }
    setResetTarget(null);
  }

  const resetDescription =
    resetTarget === 'hub-sample'
      ? '현재 허브 데이터 전체를 가상 데이터로 교체합니다.'
      : resetTarget === 'hub-empty'
        ? '현재 허브 데이터 전체를 삭제하고 빈 목록으로 만듭니다.'
        : resetTarget === 'ledger-sample'
          ? '현재 가계부 데이터 전체를 가상 데이터로 교체합니다.'
          : '현재 가계부 데이터 전체를 삭제하고 빈 목록으로 만듭니다.';

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">데이터 관리</p>
          <h1>설정·백업</h1>
          <p>
            허브와 가계부는 서로 다른 저장 영역과 백업 파일을 사용합니다. 백업 파일은 이
            브라우저 밖으로 내려받아 직접 보관하세요.
          </p>
        </div>
      </header>

      <div className="notice-strip warm">
        <span>
          <strong>중요:</strong> 이 사이트는 서버 없이 localStorage에만 저장합니다. 브라우저
          데이터를 지우거나 다른 기기로 옮기면 자동 복원되지 않습니다. 암호화된 금고가 아니며,
          PC와 휴대폰 데이터는 자동 동기화되지 않습니다.
        </span>
      </div>

      <div className="settings-grid">
        <section className="card backup-card" aria-labelledby="hub-backup-title">
          <div className="card-head">
            <div>
              <h2 id="hub-backup-title">허브 데이터</h2>
              <p>일정, 체크리스트, 메모·할 일, 반복 업무, 앱, SNS가 포함됩니다.</p>
            </div>
            <Badge tone="green">별도 영역</Badge>
          </div>
          <div className="count-list">
            {summarizeHub(hubStore.data).map((item) => (
              <span className="count-chip" key={item}>
                {item}
              </span>
            ))}
          </div>
          <p className="backup-meta">
            마지막 백업: {formatDateTime(hubStore.data.meta.lastBackupAt)}
          </p>
          {hubImportError ? (
            <div className="alert alert-error" role="alert" style={{ whiteSpace: 'pre-wrap' }}>
              {hubImportError}
            </div>
          ) : null}
          <div className="button-row">
            <button type="button" className="button primary" onClick={exportHub}>
              <DownloadIcon /> 허브 JSON 내보내기
            </button>
          </div>
          <hr className="divider" />
          <p className="field-label" style={{ marginBottom: 6 }}>
            허브 JSON 가져오기
          </p>
          <input
            className="file-input"
            type="file"
            accept=".json,application/json"
            aria-label="허브 JSON 백업 파일 선택"
            onChange={handleHubFile}
          />
          <p className="tiny muted" style={{ marginTop: 6 }}>
            가져오면 현재 허브 데이터 전체를 교체합니다. 형식·버전·필수 필드 검증을 통과한
            경우에만 확인 창이 열립니다.
          </p>
        </section>

        <section className="card backup-card" aria-labelledby="ledger-backup-title">
          <div className="card-head">
            <div>
              <h2 id="ledger-backup-title">가계부 데이터</h2>
              <p>계좌 별칭, 잔액 스냅샷, 거래가 포함됩니다.</p>
            </div>
            <Badge tone="blue">독립 백업</Badge>
          </div>
          <div className="count-list">
            {summarizeLedger(ledgerStore.data).map((item) => (
              <span className="count-chip" key={item}>
                {item}
              </span>
            ))}
          </div>
          <p className="backup-meta">
            마지막 백업: {formatDateTime(ledgerStore.data.meta.lastBackupAt)}
          </p>
          {ledgerImportError ? (
            <div className="alert alert-error" role="alert" style={{ whiteSpace: 'pre-wrap' }}>
              {ledgerImportError}
            </div>
          ) : null}
          <div className="button-row">
            <button type="button" className="button primary" onClick={exportLedger}>
              <DownloadIcon /> 가계부 JSON 내보내기
            </button>
          </div>
          <hr className="divider" />
          <p className="field-label" style={{ marginBottom: 6 }}>
            가계부 JSON 가져오기
          </p>
          <input
            className="file-input"
            type="file"
            accept=".json,application/json"
            aria-label="가계부 JSON 백업 파일 선택"
            onChange={handleLedgerFile}
          />
          <p className="tiny muted" style={{ marginTop: 6 }}>
            가져오면 현재 가계부 데이터 전체를 교체합니다. 허브 백업 파일을 잘못 선택하면
            가져오지 않습니다.
          </p>
        </section>
      </div>

      <section className="card" aria-labelledby="backup-help-title">
        <div className="card-head">
          <div>
            <h2 id="backup-help-title">백업 동작 방식</h2>
            <p>내려받을 위치는 브라우저 다운로드 설정을 따릅니다.</p>
          </div>
        </div>
        <div className="grid-3">
          <div className="hint-box">
            <strong>내보내기</strong>
            <p>JSON 파일을 브라우저 다운로드로 저장합니다. 브라우저가 저장 위치를 묻도록 설정되어 있으면 직접 선택할 수 있습니다.</p>
          </div>
          <div className="hint-box">
            <strong>가져오기 확인</strong>
            <p>파일 형식, schemaVersion, 필수 필드, 참조 관계를 먼저 검증합니다. 잘못된 파일이면 기존 데이터를 바꾸지 않습니다.</p>
          </div>
          <div className="hint-box">
            <strong>교체 범위</strong>
            <p>허브는 허브 영역만, 가계부는 가계부 영역만 교체합니다. 다른 영역의 데이터는 영향을 받지 않습니다.</p>
          </div>
        </div>
        <p className="tiny muted" style={{ marginTop: 12 }}>
          Google Drive 등에 개인 데이터를 자동 저장하지 않습니다. 백업 파일은 직접 안전한
          위치에 보관하고, 원격 업로드는 별도로 판단하세요.
        </p>
      </section>

      <section className="card" aria-labelledby="sample-title">
        <div className="card-head">
          <div>
            <h2 id="sample-title">가상 데이터</h2>
            <p>기능 확인용 데이터만 추가합니다. 실제 개인정보는 입력하지 않습니다.</p>
          </div>
        </div>
        <div className="button-row">
          <button type="button" className="button secondary" onClick={addSampleHub}>
            허브 가상 데이터 추가
          </button>
          <button type="button" className="button secondary" onClick={addSampleLedger}>
            가계부 가상 데이터 추가
          </button>
        </div>
      </section>

      <section className="card danger-zone" aria-labelledby="reset-title">
        <div className="card-head">
          <div>
            <h2 id="reset-title">초기화</h2>
            <p>초기화 전에는 반드시 필요한 영역의 JSON 백업을 먼저 내려받으세요.</p>
          </div>
        </div>
        {resetError ? (
          <div className="alert alert-error" role="alert">
            {resetError}
          </div>
        ) : null}
        <div className="grid-2">
          <div className="stack-sm">
            <p className="field-label">허브</p>
            <div className="button-row">
              <button
                type="button"
                className="button secondary"
                onClick={() => setResetTarget('hub-sample')}
              >
                허브를 가상 데이터로 되돌리기
              </button>
              <button
                type="button"
                className="button danger-outline"
                onClick={() => setResetTarget('hub-empty')}
              >
                허브 모두 비우기
              </button>
            </div>
          </div>
          <div className="stack-sm">
            <p className="field-label">가계부</p>
            <div className="button-row">
              <button
                type="button"
                className="button secondary"
                onClick={() => setResetTarget('ledger-sample')}
              >
                가계부를 가상 데이터로 되돌리기
              </button>
              <button
                type="button"
                className="button danger-outline"
                onClick={() => setResetTarget('ledger-empty')}
              >
                가계부 모두 비우기
              </button>
            </div>
          </div>
        </div>
      </section>

      <Modal
        title="백업 가져오기 확인"
        description="가져오기 전에 데이터 개수와 교체 범위를 확인하세요."
        open={pending !== null}
        onClose={() => setPending(null)}
      >
        {pending ? (
          <>
            <dl className="detail-list">
              <dt>파일</dt>
              <dd>{pending.fileName}</dd>
              <dt>종류</dt>
              <dd>{pending.kind === 'hub' ? '허브 백업' : '가계부 백업'}</dd>
              <dt>내보낸 시각</dt>
              <dd>{formatDateTime(pending.exportedAt)}</dd>
            </dl>
            <div>
              <p className="field-label">가져올 데이터</p>
              <div className="count-list">
                {pending.summary.map((item) => (
                  <span className="count-chip" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="field-label">현재 데이터</p>
              <div className="count-list">
                {(pending.kind === 'hub'
                  ? summarizeHub(hubStore.data)
                  : summarizeLedger(ledgerStore.data)
                ).map((item) => (
                  <span className="count-chip" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
            {pending.warnings.length > 0 ? (
              <div className="alert alert-warning" role="status">
                {pending.warnings.join(' / ')}
              </div>
            ) : null}
            <div className="notice-strip warm">
              <span>
                {pending.kind === 'hub'
                  ? '현재 허브 데이터 전체를 이 백업으로 교체합니다. 가계부 데이터는 바뀌지 않습니다.'
                  : '현재 가계부 데이터 전체를 이 백업으로 교체합니다. 허브 데이터는 바뀌지 않습니다.'}
              </span>
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              기존 데이터를 모두 교체하는 것에 동의합니다.
            </label>
            {pendingError ? (
              <div className="alert alert-error" role="alert">
                {pendingError}
              </div>
            ) : null}
            <div className="modal-actions">
              <button type="button" className="button ghost" onClick={() => setPending(null)}>
                취소
              </button>
              <button
                type="button"
                className="button danger"
                disabled={!confirmed}
                onClick={runImport}
              >
                <UploadIcon /> 가져오기 실행
              </button>
            </div>
          </>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={resetTarget !== null}
        title="정말 초기화할까요?"
        description={resetDescription}
        confirmLabel="초기화 실행"
        tone="danger"
        requireText="초기화"
        onConfirm={runReset}
        onClose={() => setResetTarget(null)}
      >
        <div className="notice-strip warm">
          <span>
            이 작업은 되돌릴 수 없습니다. 먼저 JSON 백업을 내려받았는지 확인하세요. {resetError}
          </span>
        </div>
      </ConfirmDialog>
    </div>
  );
}
