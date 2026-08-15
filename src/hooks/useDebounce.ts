import { useEffect, useRef, useState } from 'react';

/**
 * Debounce a value.
 *
 * Keyword input must be debounced ~300ms before it hits the URL/providers,
 * to protect NewsAPI's daily quota.
 *
 * Returns the most recent value after `delayMs` of no changes.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(value), delayMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delayMs]);

  return debounced;
}
