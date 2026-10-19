import type { ReactNode } from 'react';
import { isSafeHttpUrl } from '../lib/csv';
import { ExternalIcon } from './Icons';

interface Props {
  href: string;
  children: ReactNode;
  className?: string;
  showIcon?: boolean;
  label?: string;
}

export function ExternalLink({ href, children, className, showIcon = true, label }: Props) {
  if (!isSafeHttpUrl(href)) {
    return <span className={className}>{children}</span>;
  }
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
    >
      {children}
      {showIcon ? <ExternalIcon className="inline-icon" /> : null}
    </a>
  );
}
