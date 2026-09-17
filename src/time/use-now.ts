import { useEffect, useState } from 'react';

const MINUTE = 60_000;

export function useNow(intervalMs = MINUTE): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
