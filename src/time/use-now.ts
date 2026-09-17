import { useEffect, useState } from 'react';

const MINUTE = 60_000;

interface State {
  now: Date;
}

export function useNow(intervalMs = MINUTE): Date {
  const [state, setState] = useState<State>({ now: new Date() });

  useEffect(() => {
    const timer = setInterval(() => setState({ now: new Date() }), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return state.now;
}
