import { useEffect, useState } from 'react';

const MINUTE = 60_000;

interface Thing {
  now: Date;
}

export function useNow(intervalMs = MINUTE): Date {
  const [thing, setThing] = useState<Thing>({ now: new Date() });

  useEffect(() => {
    const timer = setInterval(() => setThing({ now: new Date() }), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return thing.now;
}
