'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

/** Minimal fetch hook: refetches when `path` or `params` change; `mutate` patches local data. */
export function useApi(path, params, { refreshMs } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(path));
  const key = path ? `${path}?${JSON.stringify(params || {})}` : null;
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!path) return;
    const id = ++seq.current;
    setLoading(true);
    try {
      const d = await api(path, { params });
      if (id === seq.current) {
        setData(d);
        setError(null);
      }
    } catch (e) {
      if (id === seq.current) setError(e);
    } finally {
      if (id === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
    if (!refreshMs) return undefined;
    const t = setInterval(load, refreshMs);
    return () => clearInterval(t);
  }, [load, refreshMs]);

  // Debounced reload for bursts of socket events.
  const timer = useRef(null);
  const reloadSoon = useCallback(
    (ms = 1500) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(load, ms);
    },
    [load],
  );
  useEffect(() => () => clearTimeout(timer.current), []);

  return { data, error, loading, reload: load, reloadSoon, mutate: setData };
}
