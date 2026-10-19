import { useEffect, useState } from 'react';
import type { RouteKey } from '../routes';
import { parseRoute } from '../routes';

export function useHashRoute(): RouteKey {
  const [route, setRoute] = useState<RouteKey>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}
