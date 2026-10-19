import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { CloseIcon } from './Icons';

interface Props {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ title, description, open, onClose, children, wide = false }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    const previous = document.activeElement as HTMLElement | null;
    window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]), select, textarea, button',
      );
      first?.focus();
    }, 20);
    return () => {
      window.removeEventListener('keydown', handleKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        className={`modal-panel${wide ? ' modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={panelRef}
      >
        <div className="modal-head">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description ? <p className="muted small">{description}</p> : null}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="닫기">
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
