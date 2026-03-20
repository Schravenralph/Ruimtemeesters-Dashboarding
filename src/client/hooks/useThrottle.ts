import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Throttle a value: only updates at most once per `delay` ms.
 */
export function useThrottle<T>(value: T, delay: number = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRun = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRun.current;

    if (timeSinceLastRun >= delay) {
      setThrottledValue(value);
      lastRun.current = now;
    } else {
      const timeout = setTimeout(() => {
        setThrottledValue(value);
        lastRun.current = Date.now();
      }, delay - timeSinceLastRun);

      return () => clearTimeout(timeout);
    }
  }, [value, delay]);

  return throttledValue;
}

/**
 * Throttle a function call.
 */
export function useThrottledCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number = 300,
): T {
  const lastRun = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  return useCallback((...args: unknown[]) => {
    const now = Date.now();
    if (now - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = now;
    } else {
      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        callback(...args);
        lastRun.current = Date.now();
      }, delay - (now - lastRun.current));
    }
  }, [callback, delay]) as T;
}
