// hooks/useAutoRefresh.ts
import { useEffect, useRef } from 'react';

interface UseAutoRefreshOptions {
  callback: () => void | Promise<void>;
  intervalMs: number;
  enabled: boolean;
  immediate?: boolean;
}

export const useAutoRefresh = ({
  callback,
  intervalMs,
  enabled,
  immediate = true,
}: UseAutoRefreshOptions) => {
  const savedCallback = useRef(callback);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    if (immediate) {
      void savedCallback.current();
    }

    intervalRef.current = window.setInterval(() => {
      void savedCallback.current();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, immediate]);
};