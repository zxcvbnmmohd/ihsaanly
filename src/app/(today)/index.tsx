import type { ReactElement } from 'react';
import { useHijriDate } from '@/hijri/use-hijri-date';
import { usePlace } from '@/location/store';
import { useCurrentWindow } from '@/prayer/use-current-window';
import { TodayScreen } from '@/screens/today';

export default function TodayRoute(): ReactElement {
  const place = usePlace();
  const window = useCurrentWindow();
  const hijri = useHijriDate();

  return (
    <TodayScreen
      hasLocation={place !== null}
      window={window?.name ?? null}
      hijri={hijri}
      locationHref="/location"
    />
  );
}
