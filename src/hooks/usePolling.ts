"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook que faz polling de um endpoint a cada `interval` ms.
 * Para automaticamente quando `shouldStop` retorna true.
 */
export function usePolling<T>(
  url: string | null,
  interval: number = 3000,
  shouldStop?: (data: T) => boolean
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  const poll = useCallback(async () => {
    if (!url || stoppedRef.current) return;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);

      if (shouldStop?.(json)) {
        stoppedRef.current = true;
        setIsPolling(false);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar dados");
    }
  }, [url, shouldStop]);

  useEffect(() => {
    if (!url) return;

    stoppedRef.current = false;
    setIsPolling(true);
    poll();

    timerRef.current = setInterval(poll, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPolling(false);
    };
  }, [url, interval, poll]);

  return { data, error, isPolling };
}
