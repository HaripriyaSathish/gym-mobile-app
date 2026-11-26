import { useCallback, useEffect, useRef, useState } from 'react';
import { api, cached } from './api';

/** Fetch with cache-first rendering, pull-to-refresh and error state. */
export function useApi(path) {
  const initial = cached(path);
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(!initial);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const alive = useRef(true);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const d = await api(path);
        if (alive.current) {
          setData(d);
          setError(null);
        }
      } catch (e) {
        if (alive.current) setError(e.message);
      } finally {
        if (alive.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [path]
  );

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  return { data, loading, refreshing, error, reload: load, refresh: () => load(true), setData };
}
