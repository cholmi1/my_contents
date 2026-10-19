import { useEffect, useState } from 'react';
import { kstToday } from '../lib/date';

export function useToday(): string {
  const [today, setToday] = useState(() => kstToday());

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = kstToday();
      setToday((current) => (current === next ? current : next));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return today;
}
