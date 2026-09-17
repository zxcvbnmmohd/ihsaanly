import { usePlace } from '@/location/store';
import { useCurrentWindow } from '@/prayer/use-current-window';
import { TodayScreen } from '@/screens/today';

export default function TodayRoute() {
  const place = usePlace();
  const window = useCurrentWindow();

  return (
    <TodayScreen
      hasLocation={place !== null}
      window={window?.name ?? null}
      locationHref="/location"
    />
  );
}
