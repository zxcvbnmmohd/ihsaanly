import { useEffect, useState } from 'react';

import { usePlace } from '@/location/store';

import { useCalculationPreferences } from './store';
import { prayerTimesAcross } from './times';
import { buildWindows, windowAt, type PrayerWindow } from './windows';

const MINUTE = 60_000;

export function useCurrentWindow(): PrayerWindow | null {
  const place = usePlace();
  const preferences = useCalculationPreferences();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), MINUTE);
    return () => clearInterval(timer);
  }, []);

  if (!place) return null;

  return windowAt(now, buildWindows(prayerTimesAcross(place, now, preferences)));
}
