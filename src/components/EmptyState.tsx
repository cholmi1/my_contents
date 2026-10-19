import type { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, children, action }: Props) {
  return (
    <div className="empty-state">
      <p className="empty-title">{title}</p>
      <p className="muted">{children}</p>
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}
