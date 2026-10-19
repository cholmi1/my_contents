import type { ReactNode } from 'react';

type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'demo';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
