import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'normal';
  requireText?: string;
  children?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  tone = 'normal',
  requireText,
  children,
  onConfirm,
  onClose,
}: Props) {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  const canConfirm = !requireText || typed.trim() === requireText;

  return (
    <Modal title={title} description={description} open={open} onClose={onClose}>
      {children ? <div className="confirm-content">{children}</div> : null}
      {requireText ? (
        <label className="field">
          <span className="field-label">
            계속하려면 <strong>{requireText}</strong>를 입력하세요.
          </span>
          <input
            type="text"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
          />
        </label>
      ) : null}
      <div className="modal-actions">
        <button type="button" className="button ghost" onClick={onClose}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`button ${tone === 'danger' ? 'danger' : 'primary'}`}
          onClick={() => {
            onConfirm();
            onClose();
          }}
          disabled={!canConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
